import pyotp
from fastapi import APIRouter, Depends, Form, HTTPException, Request, Response
from pydantic import BaseModel, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db
from app.core import audit, rate_limit, token_blocklist
from app.core.password_policy import validar_password
from app.core.config import settings
from app.core.security import (
    create_access_token,
    decode_token,
    get_current_user,
    hash_password,
    invalid_credentials,
    mfa_pendiente,
    verify_password,
)
from app.models.user import AuthMethod, User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import (
    MfaSetupResponse,
    MfaVerificarPayload,
    NumeroCuentaLogin,
    SessionResponse,
)
from app.schemas.user import UserRead

router = APIRouter()


class TokenLoginForm:
    def __init__(
        self,
        username: str = Form(),
        password: str = Form(default=""),
    ):
        self.username = username
        self.password = password


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.jwt_cookie_name,
        value=token,
        httponly=True,
        secure=settings.jwt_cookie_secure,
        samesite=settings.jwt_cookie_samesite,
        path="/",
        max_age=settings.jwt_cookie_max_age,
    )


async def _token_por_numero_cuenta(
    repo: UserRepository,
    numero: str,
    response: Response | None = None,
) -> User:
    alumno = await repo.get_alumno_por_numero_cuenta(numero)
    if not alumno or not alumno.usuario:
        # Misma respuesta que cualquier otro fallo: no revela si la cuenta existe.
        raise invalid_credentials()

    user = alumno.usuario
    if not user.activo:
        raise invalid_credentials()
    if not user.role or user.role.name != "alumno":
        raise invalid_credentials()
    if user.auth_method != AuthMethod.NUMERO_CUENTA:
        raise invalid_credentials()

    token = create_access_token(sub=str(user.id))
    if response is not None:
        _set_auth_cookie(response, token)
    return user


def _es_admin(user: User) -> bool:
    return bool(user.role) and user.role.name == "administrador"


def _verificar_intento(ip: str, usuario: str) -> None:
    """Aplica el límite de intentos y deja constancia en el log si bloquea."""
    try:
        rate_limit.verificar_intento(ip, usuario)
    except HTTPException:
        audit.registrar_acceso("login", "bloqueado", None, usuario, ip)
        raise


@router.post("/token", response_model=SessionResponse, summary="Login por correo/RFC o número de cuenta")
async def login_token(
    request: Request,
    form_data: TokenLoginForm = Depends(),
    db: AsyncSession = Depends(get_db),
    response: Response = Response(),
) -> SessionResponse:
    ip = rate_limit.ip_cliente(request)
    _verificar_intento(ip, form_data.username)
    try:
        user = await _login_token(form_data, db, response)
    except HTTPException as exc:
        if exc.status_code == 401:
            rate_limit.registrar_fallo(form_data.username)
            audit.registrar_acceso("login", "fallo", None, form_data.username, ip)
        raise
    rate_limit.registrar_exito(form_data.username)
    audit.registrar_acceso("login", "exito", user.role.name, form_data.username, ip)
    return SessionResponse(mfa_requerido=_es_admin(user) and bool(user.mfa_secret))


async def _login_token(
    form_data: TokenLoginForm, db: AsyncSession, response: Response
) -> User:
    repo = UserRepository(db)

    user = await repo.get_user_for_login(form_data.username)
    if user is not None:
        if user.auth_method == AuthMethod.NUMERO_CUENTA:
            raise invalid_credentials()
        if not user.hashed_password or not verify_password(
            form_data.password, user.hashed_password
        ):
            raise invalid_credentials()
        if not user.activo:
            raise invalid_credentials()

        # Administrador con MFA: la sesión nace sin verificar hasta que dé su código.
        con_mfa = _es_admin(user) and bool(user.mfa_secret)
        token = create_access_token(sub=str(user.id), mfa_verificado=False if con_mfa else None)
        _set_auth_cookie(response, token)
        return user

    return await _token_por_numero_cuenta(repo, form_data.username, response)


@router.post("/numero-cuenta", response_model=SessionResponse, summary="Login del alumno por número de cuenta")
async def login_numero_cuenta(
    request: Request,
    payload: NumeroCuentaLogin,
    db: AsyncSession = Depends(get_db),
    response: Response = Response(),
) -> SessionResponse:
    ip = rate_limit.ip_cliente(request)
    _verificar_intento(ip, payload.numero_cuenta)
    repo = UserRepository(db)
    try:
        user = await _token_por_numero_cuenta(
            repo, payload.numero_cuenta, response
        )
    except HTTPException as exc:
        if exc.status_code == 401:
            rate_limit.registrar_fallo(payload.numero_cuenta)
            audit.registrar_acceso("login", "fallo", "alumno", payload.numero_cuenta, ip)
        raise
    rate_limit.registrar_exito(payload.numero_cuenta)
    audit.registrar_acceso("login", "exito", user.role.name, payload.numero_cuenta, ip)
    return SessionResponse()


class MeRead(UserRead):
    # Administrador con MFA que todavía no verifica su código en esta sesión.
    mfa_pendiente: bool = False


@router.get("/me", response_model=MeRead, summary="Usuario autenticado actual")
async def read_current_user(
    request: Request, current_user: User = Depends(get_current_user)
) -> MeRead:
    me = MeRead.model_validate(current_user)
    me.mfa_pendiente = mfa_pendiente(current_user, request)
    return me


def _exigir_admin(user: User) -> None:
    if not _es_admin(user):
        raise HTTPException(status_code=403, detail="Solo los administradores usan MFA")


@router.get("/mfa/setup", response_model=MfaSetupResponse, summary="Generar el secreto TOTP del administrador")
async def mfa_setup(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MfaSetupResponse:
    _exigir_admin(current_user)
    if current_user.mfa_secret:
        raise HTTPException(status_code=400, detail="MFA ya está configurado")
    secreto = pyotp.random_base32()
    current_user.mfa_secret = secreto
    await db.commit()
    return MfaSetupResponse(secreto=secreto, otpauth_url=_otpauth_url(current_user, secreto))


def _otpauth_url(user: User, secreto: str) -> str:
    # otpauth://totp/TutoNet:{email}?secret={secret}&issuer=TutoNet
    cuenta = user.correo_personal or user.correo_institucional or str(user.id)
    return pyotp.TOTP(secreto).provisioning_uri(name=cuenta, issuer_name="TutoNet")


@router.post("/mfa/verificar", response_model=SessionResponse, summary="Verificar el código TOTP y marcar la sesión como verificada")
async def mfa_verificar(
    payload: MfaVerificarPayload,
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
) -> SessionResponse:
    _exigir_admin(current_user)
    if not current_user.mfa_secret:
        raise HTTPException(status_code=400, detail="MFA no está configurado")
    ip = rate_limit.ip_cliente(request)
    llave = f"mfa:{current_user.id}"
    usuario = current_user.correo_personal or str(current_user.id)
    try:
        rate_limit.verificar_intento(ip, llave)
    except HTTPException:
        audit.registrar_acceso("mfa", "bloqueado", current_user.role.name, usuario, ip)
        raise
    codigo = "".join(payload.codigo.split())
    if not pyotp.TOTP(current_user.mfa_secret).verify(codigo, valid_window=1):
        rate_limit.registrar_fallo(llave)
        audit.registrar_acceso("mfa", "fallo", current_user.role.name, usuario, ip)
        raise HTTPException(status_code=401, detail="Código incorrecto")
    rate_limit.registrar_exito(llave)
    audit.registrar_acceso("mfa", "exito", current_user.role.name, usuario, ip)
    # Sesión nueva ya verificada; la anterior deja de servir.
    token_anterior = request.cookies.get(settings.jwt_cookie_name)
    if token_anterior:
        _revocar_token(token_anterior)
    _set_auth_cookie(
        response, create_access_token(sub=str(current_user.id), mfa_verificado=True)
    )
    return SessionResponse()


@router.post("/logout", status_code=204, summary="Cerrar sesión (borra la cookie)")
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> None:
    token = request.cookies.get(settings.jwt_cookie_name)
    if token:
        _revocar_token(token)
        await _registrar_logout(token, rate_limit.ip_cliente(request), db)
    response.delete_cookie(settings.jwt_cookie_name, path="/")
    return None


def _revocar_token(token: str) -> None:
    """Invalida el token para que no se pueda reutilizar tras cerrar sesión."""
    try:
        payload = decode_token(token)
    except Exception:
        return  # inválido o ya caducado: no hay nada que revocar
    if payload.get("jti"):
        token_blocklist.revocar(payload["jti"], payload["exp"])


async def _registrar_logout(token: str, ip: str, db: AsyncSession) -> None:
    """Deja el logout en el log; si el token no sirve, no pasa nada (igual se borra la cookie)."""
    try:
        user = await db.get(User, int(decode_token(token)["sub"]), options=[selectinload(User.role)])
    except Exception:
        return
    if user is not None:
        audit.registrar_acceso(
            "logout", "exito", user.role.name, user.correo_personal or user.correo_institucional or str(user.id), ip
        )

class CambiarPasswordPayload(BaseModel):
    actual: str
    nueva: str

    _validar_nueva = field_validator("nueva")(validar_password)


@router.post("/cambiar-password", status_code=204, summary="Cambiar mi contraseña")
async def cambiar_password(
    payload: CambiarPasswordPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    if current_user.auth_method == AuthMethod.NUMERO_CUENTA:
        raise HTTPException(status_code=400, detail="Los alumnos entran con su número de cuenta, sin contraseña.")
    if not current_user.hashed_password or not verify_password(payload.actual, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="La contraseña actual no es correcta.")
    if payload.nueva == payload.actual:
        raise HTTPException(status_code=400, detail="La contraseña nueva debe ser distinta de la actual.")
    user = await db.get(User, current_user.id)
    user.hashed_password = hash_password(payload.nueva)
    await db.commit()
    return None

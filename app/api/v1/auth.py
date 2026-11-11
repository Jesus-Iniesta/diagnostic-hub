from fastapi import APIRouter, Depends, Form, HTTPException, Request, Response
from pydantic import BaseModel, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db
from app.core import audit, rate_limit
from app.core.password_policy import validar_password
from app.core.config import settings
from app.core.security import (
    create_access_token,
    decode_token,
    get_current_user,
    hash_password,
    invalid_credentials,
    verify_password,
)
from app.models.user import AuthMethod, User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import NumeroCuentaLogin, SessionResponse
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


CUENTA_NO_ENCONTRADA = "No encontramos tu número de cuenta."


async def _token_por_numero_cuenta(
    repo: UserRepository,
    numero: str,
    response: Response | None = None,
    avisar_no_encontrada: bool = False,
) -> User:
    alumno = await repo.get_alumno_por_numero_cuenta(numero)
    if not alumno or not alumno.usuario:
        # En la pantalla del alumno se le invita a registrarse (404); el
        # endpoint OAuth2 genérico sigue respondiendo credenciales inválidas.
        if avisar_no_encontrada:
            raise HTTPException(status_code=404, detail=CUENTA_NO_ENCONTRADA)
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
        if exc.status_code in (401, 404):
            rate_limit.registrar_fallo(form_data.username)
            audit.registrar_acceso("login", "fallo", None, form_data.username, ip)
        raise
    rate_limit.registrar_exito(form_data.username)
    audit.registrar_acceso("login", "exito", user.role.name, form_data.username, ip)
    return SessionResponse()


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

        token = create_access_token(sub=str(user.id))
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
            repo, payload.numero_cuenta, response, avisar_no_encontrada=True
        )
    except HTTPException as exc:
        if exc.status_code in (401, 404):
            rate_limit.registrar_fallo(payload.numero_cuenta)
            audit.registrar_acceso("login", "fallo", "alumno", payload.numero_cuenta, ip)
        raise
    rate_limit.registrar_exito(payload.numero_cuenta)
    audit.registrar_acceso("login", "exito", user.role.name, payload.numero_cuenta, ip)
    return SessionResponse()


@router.get("/me", response_model=UserRead, summary="Usuario autenticado actual")
async def read_current_user(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.post("/logout", status_code=204, summary="Cerrar sesión (borra la cookie)")
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> None:
    token = request.cookies.get(settings.jwt_cookie_name)
    if token:
        await _registrar_logout(token, rate_limit.ip_cliente(request), db)
    response.delete_cookie(settings.jwt_cookie_name, path="/")
    return None


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

from fastapi import APIRouter, Depends, Form, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.config import settings
from app.core.security import (
    create_access_token,
    get_current_user,
    invalid_credentials,
    verify_password,
)
from app.models.user import AuthMethod, User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import NumeroCuentaLogin, Token
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
    repo: UserRepository, numero: str, response: Response | None = None
) -> Token:
    alumno = await repo.get_alumno_por_numero_cuenta(numero)
    if not alumno or not alumno.usuario:
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
    return Token(access_token=token, token_type="bearer")


@router.post("/token", response_model=Token, summary="Login por correo/RFC o número de cuenta")
async def login_token(
    form_data: TokenLoginForm = Depends(),
    db: AsyncSession = Depends(get_db),
    response: Response = Response(),
) -> Token:
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
        return Token(access_token=token, token_type="bearer")

    return await _token_por_numero_cuenta(repo, form_data.username, response)


@router.post("/numero-cuenta", response_model=Token, summary="Login del alumno por número de cuenta")
async def login_numero_cuenta(
    payload: NumeroCuentaLogin,
    db: AsyncSession = Depends(get_db),
    response: Response = Response(),
) -> Token:
    repo = UserRepository(db)
    return await _token_por_numero_cuenta(repo, payload.numero_cuenta, response)


@router.get("/me", response_model=UserRead, summary="Usuario autenticado actual")
async def read_current_user(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.post("/logout", status_code=204, summary="Cerrar sesión (borra la cookie)")
async def logout(response: Response) -> None:
    response.delete_cookie(settings.jwt_cookie_name, path="/")
    return None
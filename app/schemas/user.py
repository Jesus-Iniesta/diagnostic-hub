from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.user import AuthMethod
from app.schemas.role import RoleRead


class UserBase(BaseModel):
    nombre: str
    apellido_paterno: str
    apellido_materno: str
    correo_personal: str
    correo_institucional: str | None = None
    auth_method: AuthMethod = AuthMethod.PASSWORD


class UserCreate(UserBase):
    role_id: int
    password: str | None = None


class UserUpdate(BaseModel):
    nombre: str | None = None
    apellido_paterno: str | None = None
    apellido_materno: str | None = None
    correo_personal: str | None = None
    correo_institucional: str | None = None
    auth_method: AuthMethod | None = None
    activo: bool | None = None
    role_id: int | None = None
    password: str | None = None


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    activo: bool
    last_login: datetime | None = None
    created_at: datetime
    updated_at: datetime
    role_id: int
    role: RoleRead
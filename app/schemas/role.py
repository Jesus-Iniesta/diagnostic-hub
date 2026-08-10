from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.permission import PermissionRead


class RoleBase(BaseModel):
    name: str
    description: str
    is_active: bool = True


class RoleCreate(RoleBase):
    pass


class RoleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None
    permissions: list[str] | None = None


class RoleRead(RoleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
    permissions: list[PermissionRead] = []
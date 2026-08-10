from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PermissionBase(BaseModel):
    name: str
    description: str
    is_active: bool = True


class PermissionCreate(PermissionBase):
    pass


class PermissionUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None


class PermissionRead(PermissionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
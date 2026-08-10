from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.base import Base
from app.models.role_permission import role_permissions

if TYPE_CHECKING:
    from app.models.role import Role

class Permission(Base):
    __tablename__ = "permission"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(nullable=False, index=True)
    description: Mapped[str] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    
    roles: Mapped[list["Role"]] = relationship(secondary=role_permissions, back_populates="permissions")
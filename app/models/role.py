from typing import TYPE_CHECKING
from app.core.base import Base
from datetime import datetime
from sqlalchemy import Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.role_permission import role_permissions

if TYPE_CHECKING:
    from app.models.permission import Permission
    from app.models.user import User

class Role(Base):
    __tablename__ = "role"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(nullable=False, index=True)
    description: Mapped[str] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    
    permissions: Mapped[list["Permission"]] = relationship(secondary=role_permissions, back_populates="roles")
    users: Mapped[list["User"]] = relationship(back_populates="role")
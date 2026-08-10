from sqlalchemy import Column, ForeignKey, Integer, Table
from app.core.base import Base


role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column(
        "role_id",
        Integer,
        ForeignKey("role.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    ),
    Column(
        "permission_id",
        Integer,
        ForeignKey("permission.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    ),
)
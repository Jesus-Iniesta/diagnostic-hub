from sqlalchemy import ForeignKey, Table, Column, Integer

from app.core.base import Base

grupo_profesor = Table(
    "grupo_profesor",
    Base.metadata,
    Column("grupo_id", Integer, ForeignKey("grupos.id"), primary_key=True),
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
)

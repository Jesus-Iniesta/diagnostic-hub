from sqlalchemy import ForeignKey, Table, Column, Integer, String

from app.core.base import Base

grupo_alumno = Table(
    "grupo_alumno",
    Base.metadata,
    Column("grupo_id", Integer, ForeignKey("grupos.id"), primary_key=True),
    Column("alumno_id", Integer, ForeignKey("alumnos.id"), primary_key=True),
    Column("periodo", String(20), nullable=False, primary_key=True),
)

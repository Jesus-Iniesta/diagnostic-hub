from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base

if TYPE_CHECKING:
    from app.models.alumno import Alumno
    from app.models.materia import Materia
    from app.models.user import User


class Grupo(Base):
    __tablename__ = "grupos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    materia_id: Mapped[int] = mapped_column(
        ForeignKey("materias.id"), nullable=False, index=True
    )
    periodo: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    nombre_archivo: Mapped[str | None] = mapped_column(String(200), nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, onupdate=datetime.now, nullable=False
    )

    materia: Mapped["Materia"] = relationship(back_populates="grupos")
    profesores: Mapped[list["User"]] = relationship(
        secondary="grupo_profesor", back_populates="grupos"
    )
    alumnos: Mapped[list["Alumno"]] = relationship(
        secondary="grupo_alumno", back_populates="grupos"
    )

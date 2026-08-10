from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base

if TYPE_CHECKING:
    from app.models.asignacion_examen import AsignacionExamen
    from app.models.ingenieria import Ingenieria
    from app.models.user import User


class Alumno(Base):
    __tablename__ = "alumnos"
    
    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )
    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )
    ingenieria_id: Mapped[int] = mapped_column(
        ForeignKey("ingenieria.id"),
        nullable=False,
        index=True
    )
    numero_folio: Mapped[str | None] = mapped_column(
        nullable=True,
        index=True,
        unique=True
    )
    periodo_ingreso: Mapped[str] = mapped_column(
        nullable=False,
        index=True
    )
    promedio_bachillerato: Mapped[float | None] = mapped_column(
        nullable=True,
        index=True
    )
    indice_uaem: Mapped[float | None] = mapped_column(
        nullable=True,
        index=True
    )
    lugar_admision: Mapped[int | None] = mapped_column(
        nullable=True,
        index=True
    )
    escuela_procedencia: Mapped[str | None] = mapped_column(
        nullable=True,
        index=True
    )
    tiene_internet: Mapped[bool | None] = mapped_column(
        nullable=True,
        index=True
    )
    tiene_computadora: Mapped[bool | None] = mapped_column(
        nullable=True,
        index=True
    )
    vulnerabilidad_economica: Mapped[bool | None] = mapped_column(
        nullable=True,
        index=True
    )
    es_foraneo: Mapped[bool | None] = mapped_column(
        nullable=True,
        index=True
    )
    convivencia : Mapped[str | None] = mapped_column(
        nullable=True,
        index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.now,
        nullable=False
    )

    usuario: Mapped["User"] = relationship(back_populates="alumnos")
    ingenieria: Mapped["Ingenieria"] = relationship(back_populates="alumnos")
    asignaciones_examen: Mapped[list["AsignacionExamen"]] = relationship(
        back_populates="alumno"
    )
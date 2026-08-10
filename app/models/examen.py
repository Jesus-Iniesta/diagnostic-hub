from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base

if TYPE_CHECKING:
    from app.models.asignacion_examen import AsignacionExamen
    from app.models.modulo import Modulo
    from app.models.user import User


class Examen(Base):
    __tablename__ = "examenes"
    
    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )
    creado_por_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )
    titulo: Mapped[str] = mapped_column(
        nullable=False,
        index=True
    )
    descripcion: Mapped[str | None] = mapped_column(
        nullable=True,
    )
    periodo: Mapped[str] = mapped_column(
        nullable=False,
        index=True
    )
    total_preguntas: Mapped[int] = mapped_column(
        nullable=False
    )
    estado: Mapped[bool] = mapped_column(
        nullable=False,
        default=True
    )
    fecha_aplicacion: Mapped[Date] = mapped_column(
        Date,
        nullable=True,
        index=True
    )
    fecha_cierre: Mapped[Date] = mapped_column(
        Date,
        nullable=True,
        index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.now
    )

    creado_por: Mapped["User"] = relationship(back_populates="examenes_creados")
    modulos: Mapped[list["Modulo"]] = relationship(back_populates="examen")
    asignaciones: Mapped[list["AsignacionExamen"]] = relationship(
        back_populates="examen"
    )
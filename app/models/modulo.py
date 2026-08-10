from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base

if TYPE_CHECKING:
    from app.models.asignacion_modulo import AsignacionModulo
    from app.models.examen import Examen
    from app.models.pregunta import Pregunta


class Modulo(Base):
    __tablename__ = "modulos"
    
    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )
    examen_id: Mapped[int] = mapped_column(
        ForeignKey("examenes.id"),
        nullable=False,
        index=True
    )
    clave: Mapped[str] = mapped_column(
        nullable=False,
        index=True,
        unique=True
    )
    nombre: Mapped[str] = mapped_column(
        nullable=False,
        index=True
    )
    orden: Mapped[int] = mapped_column(
        nullable=False,
        index=True
    )
    total_preguntas: Mapped[int] = mapped_column(
        nullable=False,
        index=True
    )
    activo: Mapped[bool] = mapped_column(
        nullable=False,
        default=True
    )

    examen: Mapped["Examen"] = relationship(back_populates="modulos")
    preguntas: Mapped[list["Pregunta"]] = relationship(back_populates="modulo")
    asignaciones_modulo: Mapped[list["AsignacionModulo"]] = relationship(
        back_populates="modulo"
    )
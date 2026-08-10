from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base

if TYPE_CHECKING:
    from app.models.modulo import Modulo


class Pregunta(Base):
    __tablename__ = "preguntas"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
        )
    modulo_id: Mapped[int] = mapped_column(
        ForeignKey("modulos.id"),
        nullable=False,
        index=True
    )
    codigo: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        index=True    
    )
    enunciado: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    opcion_a: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    opcion_b: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    opcion_c: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    opcion_d: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    respuesta_correcta: Mapped[str] = mapped_column(
        String(1),
        nullable=False,
        index=True
    )
    orden: Mapped[int] = mapped_column(
        nullable=False,
        index=True
    )

    modulo: Mapped["Modulo"] = relationship(back_populates="preguntas")
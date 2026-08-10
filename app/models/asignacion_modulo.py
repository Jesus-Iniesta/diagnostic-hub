from decimal import Decimal

from sqlalchemy import (
    ForeignKey,
    Integer,
    Numeric,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base


class AsignacionModulo(Base):
    __tablename__ = "asignacion_modulo"

    __table_args__ = (
        UniqueConstraint(
            "intento_id",
            "modulo_id",
            name="uq_asignacion_modulo_intento_modulo"
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True
    )

    intento_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("intento_presentacion.id"),
        nullable=False,
        index=True
    )

    modulo_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("modulos.id"),
        nullable=False,
        index=True
    )

    puntaje: Mapped[Decimal | None] = mapped_column(
        Numeric(6, 2),
        nullable=True
    )

    correctas: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    total: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    intento = relationship(
        "IntentoPresentacion",
        back_populates="modulos"
    )

    modulo = relationship(
        "Modulo",
        back_populates="asignaciones_modulo"
    )
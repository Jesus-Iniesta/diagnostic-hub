from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base


class AsignacionExamen(Base):
    __tablename__ = "asignacion_examen"

    __table_args__ = (
        UniqueConstraint(
            "examen_id",
            "alumno_id",
            name="uq_examen_alumno"
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
        index=True
    )

    examen_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("examenes.id"),
        nullable=False,
        index=True
    )

    alumno_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("alumnos.id"),
        nullable=False,
        index=True
    )

    asignado_por: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    fecha_asignacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

    estado: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1
    )

    examen = relationship("Examen", back_populates="asignaciones")
    alumno = relationship("Alumno", back_populates="asignaciones_examen")
    asignador = relationship("User", back_populates="asignaciones")
    intentos = relationship(
    "IntentoPresentacion",
    back_populates="asignacion",
    cascade="all, delete-orphan"
)
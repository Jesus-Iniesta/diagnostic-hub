from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base


class ResultadoWebAssign(Base):
    __tablename__ = "resultado_webassign"

    __table_args__ = (
        UniqueConstraint(
            "alumno_id", "periodo", name="uq_resultado_webassign_alumno_periodo"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    alumno_id: Mapped[int] = mapped_column(
        ForeignKey("alumnos.id"), nullable=False, index=True
    )
    periodo: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    carrera: Mapped[str] = mapped_column(String(10), nullable=False)

    algebra_trabajo: Mapped[float | None] = mapped_column(Float, nullable=True)
    algebra_examen: Mapped[float | None] = mapped_column(Float, nullable=True)
    trigonometria_trabajo: Mapped[float | None] = mapped_column(Float, nullable=True)
    trigonometria_examen: Mapped[float | None] = mapped_column(Float, nullable=True)
    geometria_trabajo: Mapped[float | None] = mapped_column(Float, nullable=True)
    geometria_examen: Mapped[float | None] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, onupdate=datetime.now, nullable=False
    )

    alumno = relationship("Alumno")

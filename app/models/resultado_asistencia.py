from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class ResultadoAsistencia(Base):
    """Porcentaje de asistencia (0-100) del alumno en el periodo."""

    __tablename__ = "resultado_asistencia"
    __table_args__ = (
        UniqueConstraint("alumno_id", "periodo", name="uq_resultado_asistencia_alumno_periodo"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    alumno_id: Mapped[int] = mapped_column(ForeignKey("alumnos.id"), nullable=False, index=True)
    periodo: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    porcentaje: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)

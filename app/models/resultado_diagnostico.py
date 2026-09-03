from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base


class ResultadoDiagnostico(Base):
    __tablename__ = "resultado_diagnostico"

    __table_args__ = (
        UniqueConstraint("alumno_id", "periodo", name="uq_resultado_diagnostico_alumno_periodo"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    alumno_id: Mapped[int] = mapped_column(
        ForeignKey("alumnos.id"), nullable=False, index=True
    )
    periodo: Mapped[str] = mapped_column(String(10), nullable=False, index=True)

    respuestas_algebra: Mapped[str | None] = mapped_column(Text, nullable=True)
    respuestas_trigonometria: Mapped[str | None] = mapped_column(Text, nullable=True)
    respuestas_geometria: Mapped[str | None] = mapped_column(Text, nullable=True)
    respuestas_calculo: Mapped[str | None] = mapped_column(Text, nullable=True)

    puntaje_algebra: Mapped[float | None] = mapped_column(Float, nullable=True)
    puntaje_trigonometria: Mapped[float | None] = mapped_column(Float, nullable=True)
    puntaje_geometria: Mapped[float | None] = mapped_column(Float, nullable=True)
    puntaje_calculo: Mapped[float | None] = mapped_column(Float, nullable=True)
    promedio_diagnostico: Mapped[float | None] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, onupdate=datetime.now, nullable=False
    )

    alumno = relationship("Alumno", back_populates="resultado_diagnostico")

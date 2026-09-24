from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base


class ResultadoCuestionarioDiagnostico(Base):
    __tablename__ = "resultado_cuestionario_diagnostico"

    __table_args__ = (
        UniqueConstraint(
            "alumno_id",
            "periodo",
            name="uq_resultado_cuestionario_alumno_periodo",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    alumno_id: Mapped[int] = mapped_column(
        ForeignKey("alumnos.id"), nullable=False, index=True
    )
    periodo: Mapped[str] = mapped_column(String(10), nullable=False, index=True)

    aciertos_c1_algebra: Mapped[int | None] = mapped_column(Integer, nullable=True)
    aciertos_c1_trigonometria: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )
    aciertos_c1_geometria: Mapped[int | None] = mapped_column(Integer, nullable=True)
    aciertos_c1_calculo: Mapped[int | None] = mapped_column(Integer, nullable=True)

    aciertos_c2_algebra: Mapped[int | None] = mapped_column(Integer, nullable=True)
    aciertos_c2_trigonometria: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )
    aciertos_c2_geometria: Mapped[int | None] = mapped_column(Integer, nullable=True)
    aciertos_c2_calculo: Mapped[int | None] = mapped_column(Integer, nullable=True)

    respuestas_c1: Mapped[str | None] = mapped_column(Text, nullable=True)
    respuestas_c2: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, onupdate=datetime.now, nullable=False
    )

    alumno = relationship("Alumno", back_populates="resultado_cuestionario_diagnostico")

from datetime import datetime

from sqlalchemy import DateTime, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class RespuestaCorrectaDiagnostico(Base):
    __tablename__ = "respuesta_correcta_diagnostico"

    __table_args__ = (
        UniqueConstraint(
            "materia", "codigo", "periodo",
            name="uq_respuesta_correcta_materia_codigo_periodo",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    materia: Mapped[str] = mapped_column(
        String(20), nullable=False, index=True
    )  # algebra, trigonometria, geometria, calculo
    codigo: Mapped[str] = mapped_column(
        String(10), nullable=False, index=True
    )  # FA11, FT21, FG11, FC11, etc.
    respuesta_correcta: Mapped[str] = mapped_column(
        String(1), nullable=False
    )  # a, b, c, d
    periodo: Mapped[str] = mapped_column(
        String(10), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, onupdate=datetime.now, nullable=False
    )

from datetime import datetime

from sqlalchemy import DateTime, Integer, LargeBinary, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class ArchivoPeriodo(Base):
    """Archivo de exámenes guardado para la "Carga completa del periodo".

    Se guarda uno por (periodo, examen); subir otro del mismo examen lo
    reemplaza. Se procesan todos juntos con "Procesar todo".
    """

    __tablename__ = "archivo_periodo"

    __table_args__ = (
        UniqueConstraint("periodo", "examen", name="uq_archivo_periodo_periodo_examen"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    periodo: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    # "cuestionario_1", "final_algebra", "webassign_ICO", ... (ver carga_periodo_service)
    examen: Mapped[str] = mapped_column(String(30), nullable=False)
    nombre_archivo: Mapped[str] = mapped_column(String(255), nullable=False)
    contenido: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    subido_en: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, nullable=False
    )
    # Última vez que se procesó; si es anterior a subido_en, falta procesarlo.
    procesado_en: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

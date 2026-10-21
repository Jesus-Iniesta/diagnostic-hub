from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class FilaNoRegistrada(Base):
    """Fila de un archivo de exámenes que no se pudo registrar.

    Son las filas sin correo, cuenta ni folio: no hay con qué identificar al
    alumno. Se guardan para el Excel "Alumnos por revisar". Cada vez que se
    procesa un examen se reemplazan las de ese (periodo, examen).
    """

    __tablename__ = "fila_no_registrada"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    periodo: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    # Igual que ArchivoPeriodo.examen: "cuestionario_1", "final_algebra", ...
    examen: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    indice: Mapped[int] = mapped_column(Integer, nullable=False)
    nombre: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ingenieria: Mapped[str | None] = mapped_column(String(10), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, nullable=False
    )

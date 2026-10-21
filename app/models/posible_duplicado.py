from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class PosibleDuplicado(Base):
    """Dos alumnos que pueden ser la misma persona, detectados al registrarse.

    Pasa cuando el formulario de registro coincide con dos alumnos provisionales
    (se completa uno y el otro queda aquí) o cuando no coincide ningún dato pero
    el nombre es igual al de un provisional. Salen en la hoja "Posibles
    duplicados" del Excel "Alumnos por revisar". Si se unen o se borra uno, la
    fila se borra sola.
    """

    __tablename__ = "posible_duplicado"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    alumno_id: Mapped[int] = mapped_column(
        ForeignKey("alumnos.id", ondelete="CASCADE"), nullable=False, index=True
    )
    otro_id: Mapped[int] = mapped_column(
        ForeignKey("alumnos.id", ondelete="CASCADE"), nullable=False, index=True
    )
    motivo: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, nullable=False
    )

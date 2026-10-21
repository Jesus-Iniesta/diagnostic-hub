from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class PosibleDuplicado(Base):
    """Dos alumnos que pueden ser la misma persona.

    Pasa al registrarse, cuando no coincide ningún dato pero el nombre es igual
    al de un provisional, y al cargar WebAssign, cuando el alumno no se
    encontró por correo pero su nombre (incompleto) o su correo institucional
    se parecen a los de otro alumno (ver emparejar_nombre.py). Salen en
    "Posibles duplicados" (lista de alumnos y "Por revisar") y en el Excel
    "Alumnos por revisar". Si se unen o se borra uno, la fila se borra sola.
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

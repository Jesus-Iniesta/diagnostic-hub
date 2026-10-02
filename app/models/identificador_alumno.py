from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base


class IdentificadorAlumno(Base):
    """Correo, cuenta o folio de un alumno aprendido al cargar un archivo.

    Los datos del registro (users/alumnos) siguen siendo la fuente principal;
    aquí se guardan los que aparecen después en otros archivos (por ejemplo, un
    segundo correo en el cuestionario o la cuenta en el examen final) para que
    las siguientes cargas encuentren al alumno por cualquiera de ellos.
    Cada (tipo, valor) pertenece a un solo alumno.
    """

    __tablename__ = "identificador_alumno"

    __table_args__ = (
        UniqueConstraint("tipo", "valor", name="uq_identificador_alumno_tipo_valor"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    alumno_id: Mapped[int] = mapped_column(
        ForeignKey("alumnos.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # "correo" | "cuenta" | "folio" (ya normalizado)
    tipo: Mapped[str] = mapped_column(String(10), nullable=False)
    valor: Mapped[str] = mapped_column(String(255), nullable=False)
    # De qué carga salió, p. ej. "cuestionario:1" o "examen_final:algebra".
    fuente: Mapped[str] = mapped_column(String(60), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, nullable=False
    )

    alumno = relationship("Alumno")

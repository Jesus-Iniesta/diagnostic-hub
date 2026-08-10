from datetime import datetime
import enum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base

class AuthMethod(str, enum.Enum):
    PASSWORD = "password"
    NUMERO_CUENTA = "numero_cuenta"

if TYPE_CHECKING:
    from app.models.alumno import Alumno
    from app.models.asignacion_examen import AsignacionExamen
    from app.models.examen import Examen
    from app.models.role import Role

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        primary_key=True, index=True
        )
    nombre: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True
        )
    apellido_paterno: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True
        )
    apellido_materno: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True
        )
    correo_personal: Mapped[str] = mapped_column(
        nullable=False, unique=True, index=True
        )
    correo_institucional: Mapped[str] = mapped_column(
        nullable=True, unique=True, index=True
        )
    hashed_password: Mapped[str] = mapped_column(
        String(255), nullable=True)

    auth_method: Mapped[AuthMethod] = mapped_column(
        String(50),
        nullable=False,
        default=AuthMethod.PASSWORD
        )
    activo: Mapped[bool] = mapped_column(
        nullable=False,
        default=True
        )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.now,
        nullable=False
        )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.now,
        nullable=False
        )
    last_login: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=True
        )

    # Relationships
    role_id: Mapped[int] = mapped_column(
        ForeignKey("role.id"),
        nullable=False, index=True)
    role: Mapped["Role"] = relationship(
        back_populates="users"
        )
    alumnos: Mapped[list["Alumno"]] = relationship(back_populates="usuario")
    examenes_creados: Mapped[list["Examen"]] = relationship(back_populates="creado_por")
    asignaciones: Mapped[list["AsignacionExamen"]] = relationship(back_populates="asignador")
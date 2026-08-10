from typing import TYPE_CHECKING

from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base

if TYPE_CHECKING:
    from app.models.alumno import Alumno


class Ingenieria(Base):
    __tablename__ = "ingenieria"
    
    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )
    clave: Mapped[str] = mapped_column(
        nullable=False,
        index=True,
        unique=True
    )
    nombre: Mapped[str] = mapped_column(
        nullable=False,
        index=True
    )
    activo: Mapped[bool] = mapped_column(
        nullable=False,
        default=True
    )

    alumnos: Mapped[list["Alumno"]] = relationship(back_populates="ingenieria")
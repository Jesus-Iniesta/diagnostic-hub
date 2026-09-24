from typing import TYPE_CHECKING

from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base

if TYPE_CHECKING:
    from app.models.grupo import Grupo


class Materia(Base):
    __tablename__ = "materias"

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

    grupos: Mapped[list["Grupo"]] = relationship(back_populates="materia")

from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class Configuracion(Base):
    __tablename__ = "configuracion"

    key: Mapped[str] = mapped_column(
        String(100),
        primary_key=True,
        index=True
    )
    value: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.now,
        onupdate=datetime.now,
        nullable=False
    )
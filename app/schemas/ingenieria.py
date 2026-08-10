from pydantic import BaseModel, ConfigDict


class IngenieriaBase(BaseModel):
    clave: str
    nombre: str
    activo: bool = True


class IngenieriaCreate(IngenieriaBase):
    pass


class IngenieriaUpdate(BaseModel):
    clave: str | None = None
    nombre: str | None = None
    activo: bool | None = None


class IngenieriaRead(IngenieriaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
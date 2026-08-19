from pydantic import BaseModel


class ConfigRegistroRead(BaseModel):
    habilitado: bool


class ConfigRegistroUpdate(BaseModel):
    habilitado: bool
from pydantic import BaseModel


class ConfigRegistroRead(BaseModel):
    habilitado: bool


class ConfigRegistroUpdate(BaseModel):
    habilitado: bool


class ConfigContactoRead(BaseModel):
    habilitado: bool


class ConfigContactoUpdate(BaseModel):
    habilitado: bool
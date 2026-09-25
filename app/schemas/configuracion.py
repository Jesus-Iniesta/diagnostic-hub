from datetime import date

from pydantic import BaseModel


class ConfigRegistroRead(BaseModel):
    habilitado: bool


class ConfigRegistroUpdate(BaseModel):
    habilitado: bool


class ConfigContactoRead(BaseModel):
    habilitado: bool


class ConfigContactoUpdate(BaseModel):
    habilitado: bool


class PeriodoRangoRead(BaseModel):
    periodo: str
    inicio: date
    fin: date
    es_default: bool


class PeriodoRangoUpdate(BaseModel):
    periodo: str
    inicio: date
    fin: date
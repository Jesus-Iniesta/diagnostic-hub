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

class IndiceFiValores(BaseModel):
    asistencia: float
    diagnostico: float
    webassign: float
    final: float


class IndiceFiCategoria(BaseModel):
    nombre: str
    minimo: float
    maximo: float
    comentario: str = ""


class IndiceFiRead(BaseModel):
    periodo: str
    valores: IndiceFiValores
    maximo: float
    categorias: list[IndiceFiCategoria]
    # Periodo del que se copió la configuración (este periodo aún no tiene la suya).
    heredado_de: str | None
    es_default: bool


class IndiceFiUpdate(BaseModel):
    periodo: str
    valores: IndiceFiValores
    categorias: list[IndiceFiCategoria]

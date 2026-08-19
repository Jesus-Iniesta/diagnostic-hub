from pydantic import BaseModel, EmailStr, Field

NUMERO_CUENTA_PATTERN = r"^\d{7}$"
NUMERO_FOLIO_PATTERN = r"^\d{9}$"
PERIODO_INGRESO_PATTERN = r"^\d{4}[AB]$"


class RegistroAlumnoBase(BaseModel):
    # --- Datos personales (User) ---
    nombre: str = Field(min_length=1)
    apellido_paterno: str = Field(min_length=1)
    apellido_materno: str = Field(min_length=1)
    correo_personal: EmailStr

    # --- Datos del formulario (Alumno) ---
    numero_cuenta: str = Field(pattern=NUMERO_CUENTA_PATTERN)
    numero_folio: str = Field(pattern=NUMERO_FOLIO_PATTERN)
    ingenieria_id: int
    periodo_ingreso: str = Field(pattern=PERIODO_INGRESO_PATTERN)
    promedio_bachillerato: float | None = Field(default=None, ge=5.9, le=10.0)
    indice_uaem: float | None = Field(default=None, ge=0)
    lugar_admision: int | None = Field(default=None, ge=1)
    escuela_procedencia: str | None = None
    tiene_internet: bool
    tiene_computadora: bool
    es_foraneo: bool
    convivencia: str | None = None
    vulnerabilidad_economica: bool


class RegistroAlumnoCreate(RegistroAlumnoBase):
    pass


class RegistroAlumnoUpdate(BaseModel):
    # --- Datos personales (User) ---
    nombre: str | None = Field(default=None, min_length=1)
    apellido_paterno: str | None = Field(default=None, min_length=1)
    apellido_materno: str | None = Field(default=None, min_length=1)
    correo_personal: EmailStr | None = None

    # --- Datos del formulario (Alumno) ---
    numero_cuenta: str | None = Field(default=None, pattern=NUMERO_CUENTA_PATTERN)
    numero_folio: str | None = Field(default=None, pattern=NUMERO_FOLIO_PATTERN)
    ingenieria_id: int | None = None
    periodo_ingreso: str | None = Field(default=None, pattern=PERIODO_INGRESO_PATTERN)
    promedio_bachillerato: float | None = Field(default=None, ge=5.9, le=10.0)
    indice_uaem: float | None = Field(default=None, ge=0)
    lugar_admision: int | None = Field(default=None, ge=1)
    escuela_procedencia: str | None = None
    tiene_internet: bool | None = None
    tiene_computadora: bool | None = None
    es_foraneo: bool | None = None
    convivencia: str | None = None
    vulnerabilidad_economica: bool | None = None
from pydantic import BaseModel, EmailStr, Field, model_validator

NUMERO_CUENTA_PATTERN = r"^\d{7}$"
NUMERO_FOLIO_PATTERN = r"^\d{9}$"
PERIODO_INGRESO_PATTERN = r"^\d{4}[AB]$"


MENSAJE_APELLIDO_MATERNO = 'Escribe tu apellido materno o marca "Solo tengo un apellido".'


def _apellido_materno(valor: str | None, sin_apellido: bool | None) -> str | None:
    """Con la marca se guarda vacío; sin ella, el apellido materno es obligatorio."""
    if sin_apellido:
        return ""
    if valor is not None and not valor.strip():
        raise ValueError(MENSAJE_APELLIDO_MATERNO)
    return valor


class RegistroAlumnoBase(BaseModel):
    # --- Datos personales (User) ---
    nombre: str = Field(min_length=1)
    apellido_paterno: str = Field(min_length=1)
    # Vacío solo si marca "Solo tengo un apellido".
    apellido_materno: str = ""
    sin_apellido_materno: bool = False
    correo_personal: EmailStr
    # Opcional: sirve para encontrar al alumno si WebAssign lo trae con él.
    correo_institucional: EmailStr | None = None

    # --- Datos del formulario (Alumno) ---
    numero_cuenta: str | None = Field(default=None, pattern=NUMERO_CUENTA_PATTERN)
    numero_folio: str | None = Field(default=None, pattern=NUMERO_FOLIO_PATTERN)
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

    @model_validator(mode="after")
    def apellido_materno_o_marca(self):
        self.apellido_materno = _apellido_materno(self.apellido_materno, self.sin_apellido_materno)
        return self

    @model_validator(mode="after")
    def atleast_one_identificacion(self):
        if not self.numero_cuenta and not self.numero_folio:
            raise ValueError(
                "Debes proporcionar al menos un número de cuenta o número de folio"
            )
        return self


class RegistroAlumnoCreate(RegistroAlumnoBase):
    pass


class RegistroAlumnoUpdate(BaseModel):
    # --- Datos personales (User) ---
    nombre: str | None = Field(default=None, min_length=1)
    apellido_paterno: str | None = Field(default=None, min_length=1)
    apellido_materno: str | None = None
    sin_apellido_materno: bool | None = None
    correo_personal: EmailStr | None = None
    correo_institucional: EmailStr | None = None

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

    @model_validator(mode="after")
    def apellido_materno_o_marca(self):
        self.apellido_materno = _apellido_materno(self.apellido_materno, self.sin_apellido_materno)
        return self

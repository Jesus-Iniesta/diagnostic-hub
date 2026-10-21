export interface Ingenieria {
  id: number;
  clave: string;
  nombre: string;
  activo: boolean;
}

export interface RegistroAlumnoPayload {
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  /** "Solo tengo un apellido": el apellido materno va vacío. */
  sin_apellido_materno?: boolean;
  correo_personal: string;
  correo_institucional?: string | null;
  numero_cuenta: string | null;
  numero_folio: string | null;
  ingenieria_id: number;
  periodo_ingreso: string;
  promedio_bachillerato: number | null;
  indice_uaem: number | null;
  lugar_admision: number | null;
  escuela_procedencia: string | null;
  tiene_internet: boolean;
  tiene_computadora: boolean;
  es_foraneo: boolean;
  convivencia: string | null;
  vulnerabilidad_economica: boolean;
}

export interface RegistroAlumnoResponse {
  id: number;
  usuario_id: number;
  numero_cuenta: string;
  numero_folio: string;
  periodo_ingreso: string;
}

export interface EstadoRegistro {
  habilitado: boolean;
}

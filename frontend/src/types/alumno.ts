export interface IngenieriaBrief {
  id: number;
  nombre: string;
  clave: string;
}

export interface RoleBrief {
  id: number;
  name: string;
}

export interface UserBrief {
  id: number;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  correo_personal: string;
  correo_institucional: string | null;
  rfc: string | null;
  auth_method: string;
  activo: boolean;
  role: RoleBrief;
}

export interface AlumnoPerfil {
  id: number;
  numero_cuenta: string | null;
  numero_folio: string | null;
  periodo_ingreso: string;
  promedio_bachillerato: number | null;
  indice_uaem: number | null;
  lugar_admision: number | null;
  escuela_procedencia: string | null;
  tiene_internet: boolean | null;
  tiene_computadora: boolean | null;
  vulnerabilidad_economica: boolean | null;
  es_foraneo: boolean | null;
  convivencia: string | null;
  created_at: string;
  usuario: UserBrief;
  ingenieria: IngenieriaBrief;
}

export interface CamposFaltantes {
  correo_institucional: boolean;
  numero_cuenta: boolean;
  numero_folio: boolean;
  promedio_bachillerato: boolean;
  indice_uaem: boolean;
  lugar_admision: boolean;
  escuela_procedencia: boolean;
  tiene_internet: boolean;
  tiene_computadora: boolean;
  vulnerabilidad_economica: boolean;
  es_foraneo: boolean;
  convivencia: boolean;
}

export interface DatosContactoUpdate {
  correo_institucional?: string | null;
  numero_cuenta?: string | null;
  numero_folio?: string | null;
  promedio_bachillerato?: number | null;
  indice_uaem?: number | null;
  lugar_admision?: number | null;
  escuela_procedencia?: string | null;
  tiene_internet?: boolean | null;
  tiene_computadora?: boolean | null;
  vulnerabilidad_economica?: boolean | null;
  es_foraneo?: boolean | null;
  convivencia?: string | null;
}

export interface ResultadoAlumno {
  puntaje: number;
  nivel: string;
  retroalimentacion: string;
}

export interface MateriaResultado {
  materia: string;
  nombre: string;
  puntaje: number | null;
  maximo: number;
  nivel: string;
  retroalimentacion: string;
}

export interface DiagnosticoAlumnoResponse {
  periodo: string;
  promedio: number | null;
  nivel_general: string;
  retroalimentacion_general: string;
  materias: MateriaResultado[];
}

export interface WebAssignMateriaResultado {
  materia: string;
  nombre: string;
  trabajo: number | null;
  examen: number | null;
  promedio: number | null;
  nivel: string;
  retroalimentacion: string;
}

export interface WebAssignAlumnoResponse {
  periodo: string;
  carrera: string;
  promedio: number | null;
  nivel_general: string;
  materias: WebAssignMateriaResultado[];
}

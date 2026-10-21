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
  correo_personal: string | null;
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
  /** Creado desde los exámenes; debe completar sus datos antes de ver resultados. */
  es_provisional?: boolean;
  /** Marcó "Solo tengo un apellido": su apellido materno va vacío. */
  sin_apellido_materno?: boolean;
  ingenieria_id?: number | null;
  usuario: UserBrief;
  ingenieria: IngenieriaBrief | null;
  /** Lo que el sistema ya conoce del alumno (p. ej. la cuenta que puso en el examen final). */
  sugeridos?: DatosSugeridos;
}

export interface DatosSugeridos {
  correo_personal: string | null;
  numero_cuenta: string | null;
  numero_folio: string | null;
  ingenieria_id: number | null;
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
  nombre?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  sin_apellido_materno?: boolean;
  correo_personal?: string;
  ingenieria_id?: number;
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

export interface CuestionarioMateriaResultado {
  materia: string;
  nombre: string;
  aciertos_c1: number | null;
  aciertos_c2: number | null;
  preguntas_por_cuestionario: number;
  calificacion: number | null;
  maximo: number;
  nivel: string;
}

/** Examen diagnóstico (cuestionarios 1 y 2). */
export interface CuestionarioAlumnoResponse {
  periodo: string;
  promedio: number | null;
  nivel_general: string;
  materias: CuestionarioMateriaResultado[];
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

export interface IndiceFiAlumno {
  periodo: string;
  tiene_resultados: boolean;
  indice: number;
  maximo: number;
  categoria: string | null;
  comentario: string | null;
}

export interface MisExamenes {
  periodo: string | null;
  cuestionario_1: boolean;
  cuestionario_2: boolean;
  examen_final: { materia: string; nombre: string; hecho: boolean }[];
  webassign: boolean;
}

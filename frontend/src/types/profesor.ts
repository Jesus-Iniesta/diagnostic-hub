export interface Materia {
  id: number;
  clave: string;
  nombre: string;
}

export interface Grupo {
  id: number;
  nombre: string;
  materia_clave: string;
  materia_nombre: string;
  periodo: string;
  activo: boolean;
  nombre_archivo: string | null;
  total_alumnos: number;
  alumnos_con_resultados: number;
}

export interface GrupoAlumno {
  alumno_id: number;
  nombre: string;
  numero_cuenta: string;
  ingenieria_clave: string;
  puntaje: number | null;
  nivel: string | null;
}

export interface GrupoResumen {
  grupo_id: number;
  nombre: string;
  total_alumnos: number;
  evaluados: number;
  promedio: number | null;
  alumnos_con_resultados: number;
}

export interface GrupoCreate {
  nombre: string;
  materia_clave: string;
  periodo: string;
}

export interface ResumenGrupo {
  grupoCargado: boolean;
  nombreGrupo: string | null;
  totalAlumnos: number;
  evaluados: number;
  promedio: number | null;
  alumnosConResultados: number;
}

export interface AlumnoGrupo {
  id: string;
  nombre: string;
  numero_cuenta: string;
  licenciatura: string | null;
  grupo: string | null;
  puntaje: number | null;
  nivel: string | null;
  retroalimentacion: string | null;
}

export type ValidacionArchivo =
  | { estado: 'correcto'; encontrados: number; noEncontrados: number }
  | { estado: 'error'; mensaje: string };

export interface CargaAlumnosResponse {
  ok: boolean;
  total_en_archivo: number;
  agregados: number;
  registrados_nuevos: number;
  duplicados_en_grupo: number;
  errores_archivo: number;
  detalles_errores: string[];
}

export interface NivelDistribucion {
  nivel: string;
  cantidad: number;
  porcentaje: number;
}

export interface IngenieriaDistribucion {
  ingenieria: string;
  cantidad: number;
}

export interface PromedioMaterias {
  algebra: number | null;
  trigonometria: number | null;
  geometria: number | null;
  calculo: number | null;
}

export interface GrupoEstadisticas {
  grupo_id: number;
  nombre: string;
  total_alumnos: number;
  evaluados: number;
  promedio: number | null;
  distribucion_nivel: NivelDistribucion[];
  distribucion_ingenieria: IngenieriaDistribucion[];
  promedio_materias: PromedioMaterias;
}

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
  /** Índice FI UAEMex; null si aún no tiene resultados. */
  indice: number | null;
  maximo: number;
  categoria: string | null;
  examen_final: number | null;
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
  materia_nombre?: string;
  materia_clave?: string;
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
  duplicados_en_grupo: number;
  no_encontrados: AlumnoNoEncontrado[];
  errores_archivo: number;
  detalles_errores: string[];
}

export interface AlumnoNoEncontrado {
  numero_cuenta: string;
  nombre: string;
  correo: string | null;
}

export interface CategoriaDistribucion {
  categoria: string;
  cantidad: number;
  porcentaje: number;
}

export interface GrupoEstadisticas {
  grupo_id: number;
  nombre: string;
  total_alumnos: number;
  evaluados: number;
  promedio_indice: number | null;
  maximo: number;
  /** Categorías del coordinador, de la más alta a la más baja. */
  distribucion: CategoriaDistribucion[];
}

export interface GrupoResumenProfesor {
  id: number;
  nombre: string;
  materia_nombre: string;
  periodo: string;
  total_alumnos: number;
  evaluados: number;
  promedio_indice: number | null;
}

export interface ResumenProfesor {
  total_alumnos: number;
  evaluados: number;
  promedio_indice: number | null;
  maximo: number;
  grupos: GrupoResumenProfesor[];
}

export interface CreaniMaterias {
  n: number;
  algebra: number | null;
  trigonometria: number | null;
  geometria: number | null;
  calculo: number | null;
}

export interface CreaniWebAssign {
  n: number;
  alg_trabajo: number | null;
  alg_examen: number | null;
  trig_trabajo: number | null;
  trig_examen: number | null;
  ga_trabajo: number | null;
  ga_examen: number | null;
}

export interface GrupoCreani {
  secciones: {
    diagnostico: CreaniMaterias;
    webassign: CreaniWebAssign;
    final: CreaniMaterias;
  };
  totales: {
    diagnostico: number | null;
    final: number | null;
  };
}

export interface Grupo {
  id: number;
  nombre: string;
  ingenieria_clave: string;
  ingenieria_nombre: string;
  periodo: string;
  activo: boolean;
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
  ingenieria_clave: string;
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

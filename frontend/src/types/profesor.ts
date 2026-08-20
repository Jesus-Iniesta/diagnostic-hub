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
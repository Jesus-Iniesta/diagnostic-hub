export interface DatosContacto {
  correo_webassign: string;
  correo_institucional: string | null;
}

export interface AlumnoPerfil {
  numero_cuenta: string;
  nombre_completo: string;
  licenciatura: string;
  grupo: string | null;
}

export interface ResultadoAlumno {
  puntaje: number;
  nivel: string;
  retroalimentacion: string;
}
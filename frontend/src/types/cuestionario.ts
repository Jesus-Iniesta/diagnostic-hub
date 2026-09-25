export interface CandidatoCoincidencia {
  alumno_id: number;
  nombre: string;
  cuenta: string | null;
  correo: string | null;
  sugerido?: boolean;
  similitud?: number;
  motivo?: string | null;
}

export interface CuestionarioNoEncontrado {
  nombre_original: string;
  correo: string | null;
  cuenta: string | null;
  folio: string | null;
  usuario: string | null;
  cuestionario: number;
  motivo: string;
  candidatos: CandidatoCoincidencia[];
  indice: number;
}

export interface RespuestaCuestionario {
  codigo: string;
  respuesta: string;
  correcta: boolean;
}

export interface CuestionarioAlumnoResultado {
  alumno_id: number;
  nombre_completo: string;
  numero_cuenta: string | null;
  numero_folio: string | null;
  correo: string | null;
  ingenieria: string | null;
  aciertos: {
    algebra: number;
    trigonometria: number;
    geometria: number;
    calculo: number;
  };
  respuestas: RespuestaCuestionario[];
}

export interface ResultadoProcesamientoCuestionario {
  cuestionario: number;
  periodo: string;
  total_filas: number;
  encontrados: number;
  no_encontrados: number;
  omitidas_otro_periodo: number;
  intentos_repetidos_ignorados: number;
  resultados: CuestionarioAlumnoResultado[];
  no_encontrados_detalle: CuestionarioNoEncontrado[];
}
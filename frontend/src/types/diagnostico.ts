export interface RespuestaCorrecta {
  codigo: string;
  respuesta_correcta: string;
}

export interface RespuestaCorrectaBatch {
  materia: string;
  periodo: string;
  respuestas: RespuestaCorrecta[];
}

export interface DiagnosticoAlumnoResultado {
  alumno_id: number;
  nombre_completo: string;
  numero_cuenta: string | null;
  numero_folio: string | null;
  correo: string | null;
  ingenieria: string | null;
  respuestas_algebra: Array<{ codigo: string; respuesta: string; correcta: boolean }> | null;
  respuestas_trigonometria: Array<{ codigo: string; respuesta: string; correcta: boolean }> | null;
  respuestas_geometria: Array<{ codigo: string; respuesta: string; correcta: boolean }> | null;
  respuestas_calculo: Array<{ codigo: string; respuesta: string; correcta: boolean }> | null;
  puntaje_algebra: number | null;
  puntaje_trigonometria: number | null;
  puntaje_geometria: number | null;
  puntaje_calculo: number | null;
  promedio_diagnostico: number | null;
}

export interface DiagnosticoNoEncontrado {
  nombre_original: string;
  correo: string | null;
  cuenta: string | null;
  folio: string | null;
  materia: string;
  motivo: string;
  candidatos: Array<Record<string, unknown>>;
  indice: number;
}

export interface ResultadoProcesamientoDiagnostico {
  materia: string;
  periodo: string;
  total_filas: number;
  encontrados: number;
  no_encontrados: number;
  resultados: DiagnosticoAlumnoResultado[];
  no_encontrados_detalle: DiagnosticoNoEncontrado[];
}

export interface CorregirMatchingPayload {
  correcciones: Array<{
    indice: number;
    alumno_id: number;
  }>;
}

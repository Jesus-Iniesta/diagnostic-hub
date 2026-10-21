import { API_BASE_URL } from '../config';
import type { CandidatoCoincidencia } from '../types/cuestionario';
import { apiFetch } from './api';

const URL_BASE = `${API_BASE_URL}/carga-periodo`;

export interface ArchivoGuardado {
  examen: string;
  etiqueta: string;
  nombre_archivo: string;
  subido_en: string;
  procesado_en: string | null;
  /** Se procesó después de subirse. */
  procesado: boolean;
}

/** Fila que no se pudo registrar (sin correo, cuenta ni folio). */
export interface FilaNoRegistrada {
  indice: number;
  nombre_original: string;
  correo: string | null;
  cuenta?: string | null;
  folio?: string | null;
  motivo: string;
  candidatos: CandidatoCoincidencia[];
}

export interface PorRevisar {
  posibles_duplicados: number;
  sin_cuenta: number;
  no_registradas: number;
  total: number;
}

export interface EstadoPeriodo {
  periodo: string;
  archivos: ArchivoGuardado[];
  total_examenes: number;
  subidos: number;
  procesado: boolean;
  procesado_en: string | null;
  por_revisar: PorRevisar;
  creani_descargado: boolean;
}

export interface ResumenArchivo {
  examen: string;
  etiqueta: string;
  total_filas: number;
  encontrados: number;
  registrados_nuevos: number;
  no_registrados: number;
  no_registrados_detalle: FilaNoRegistrada[];
  /** Cuestionarios y finales: sus filas se pueden asignar a mano. */
  corregible: boolean;
}

export interface ResultadoJuntar {
  juntados: number;
  detalle: Array<{ alumno_id: number; eliminado_id: number; nombre: string; examen: string }>;
}

export function listarArchivos(periodo: string): Promise<ArchivoGuardado[]> {
  return apiFetch<ArchivoGuardado[]>(`${URL_BASE}/archivos?periodo=${encodeURIComponent(periodo)}`);
}

export function guardarArchivo(periodo: string, examen: string, file: File): Promise<ArchivoGuardado> {
  const formData = new FormData();
  formData.append('periodo', periodo);
  formData.append('examen', examen);
  formData.append('file', file);
  return apiFetch<ArchivoGuardado>(`${URL_BASE}/archivos`, { method: 'POST', body: formData });
}

export function procesarArchivo(periodo: string, examen: string): Promise<ResumenArchivo> {
  return apiFetch<ResumenArchivo>(`${URL_BASE}/procesar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ periodo, examen }),
  });
}

export function juntarRepetidos(periodo: string): Promise<ResultadoJuntar> {
  return apiFetch<ResultadoJuntar>(`${URL_BASE}/juntar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ periodo }),
  });
}

export function obtenerEstado(periodo: string): Promise<EstadoPeriodo> {
  return apiFetch<EstadoPeriodo>(`${URL_BASE}/estado?periodo=${encodeURIComponent(periodo)}`);
}

export function corregirArchivo(
  periodo: string,
  examen: string,
  correcciones: Array<{ indice: number; alumno_id: number }>,
): Promise<{ examen: string; aplicadas: number; omitidas_ya_tenian_resultado: number[] }> {
  return apiFetch(`${URL_BASE}/corregir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ periodo, examen, correcciones }),
  });
}

import { API_BASE_URL } from '../config';
import { apiFetch } from './api';

const URL_BASE = `${API_BASE_URL}/carga-periodo`;

export interface ArchivoGuardado {
  examen: string;
  etiqueta: string;
  nombre_archivo: string;
  subido_en: string;
}

export interface ResumenArchivo {
  examen: string;
  etiqueta: string;
  total_filas: number;
  encontrados: number;
  registrados_nuevos: number;
  no_registrados: number;
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

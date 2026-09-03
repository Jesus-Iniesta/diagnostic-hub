import { apiFetch } from './api';
import { DIAGNOSTICO_URL } from '../config';
import type {
  RespuestaCorrectaBatch,
  ResultadoProcesamientoDiagnostico,
} from '../types/diagnostico';

export async function getRespuestasCorrectas(materia: string, periodo: string) {
  const res = await apiFetch<{ materia: string; periodo: string; respuestas: Array<{ codigo: string; respuesta_correcta: string }> }>(
    `${DIAGNOSTICO_URL}/respuestas-correctas?materia=${encodeURIComponent(materia)}&periodo=${encodeURIComponent(periodo)}`,
  );
  return res;
}

export async function saveRespuestasCorrectas(data: RespuestaCorrectaBatch) {
  const res = await apiFetch<{ ok: boolean; count: number }>(`${DIAGNOSTICO_URL}/respuestas-correctas`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res;
}

export async function uploadDiagnostico(
  materia: string,
  periodo: string,
  file: File,
): Promise<ResultadoProcesamientoDiagnostico> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('materia', materia);
  formData.append('periodo', periodo);

  const res = await fetch(`${DIAGNOSTICO_URL}/upload?materia=${encodeURIComponent(materia)}&periodo=${encodeURIComponent(periodo)}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Error al procesar archivo' }));
    throw new Error(error.detail || 'Error al procesar archivo');
  }
  return res.json();
}

export async function getResultados(periodo: string) {
  const res = await apiFetch<{ periodo: string; total: number; resultados: Array<Record<string, unknown>> }>(
    `${DIAGNOSTICO_URL}/resultados?periodo=${encodeURIComponent(periodo)}`,
  );
  return res;
}

export async function corregirMatching(
  materia: string,
  periodo: string,
  file: File,
  correcciones: Array<{ indice: number; alumno_id: number }>,
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('materia', materia);
  formData.append('periodo', periodo);
  formData.append('correcciones_json', JSON.stringify(correcciones));

  const res = await fetch(`${DIAGNOSTICO_URL}/corregir-matching`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!res.ok) throw new Error('Error al corregir matching');
  return res.json();
}

export async function exportarResultados(periodo: string): Promise<Blob> {
  const res = await fetch(`${DIAGNOSTICO_URL}/export?periodo=${encodeURIComponent(periodo)}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!res.ok) throw new Error('Error al exportar resultados');
  return res.blob();
}

export interface BuscarAlumnoResult {
  id: number;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  correo: string | null;
  numero_cuenta: string | null;
  numero_folio: string | null;
  ingenieria: string | null;
}

export async function buscarAlumno(query: string): Promise<BuscarAlumnoResult[]> {
  const res = await apiFetch<BuscarAlumnoResult[]>(
    `${DIAGNOSTICO_URL}/buscar-alumno?q=${encodeURIComponent(query)}`,
  );
  return res;
}

export interface CrearAlumnoPayload {
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  correo_personal: string;
  numero_cuenta: string | null;
  numero_folio: string | null;
  ingenieria_clave: string | null;
  periodo: string;
}

export async function crearAlumnoDiagnostico(payload: CrearAlumnoPayload): Promise<BuscarAlumnoResult> {
  const res = await apiFetch<BuscarAlumnoResult>(`${DIAGNOSTICO_URL}/crear-alumno`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res;
}

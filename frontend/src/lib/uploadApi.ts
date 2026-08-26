import { UPLOAD_ALUMNOS_URL } from '../config';
import type { FilaCorregida, ResultadoCarga } from '../types/upload';

export async function uploadAlumnosExcel(file: File): Promise<ResultadoCarga> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(UPLOAD_ALUMNOS_URL, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const detail = (data as { detail?: string })?.detail;
    throw new Error(detail ?? `Error ${response.status}`);
  }

  return data as ResultadoCarga;
}

export async function corregirFilas(filas: FilaCorregida[]): Promise<ResultadoCarga> {
  const response = await fetch(`${UPLOAD_ALUMNOS_URL}/corregir`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filas }),
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const detail = (data as { detail?: string })?.detail;
    throw new Error(detail ?? `Error ${response.status}`);
  }

  return data as ResultadoCarga;
}

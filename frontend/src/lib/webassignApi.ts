import { WEBASSIGN_URL } from '../config';

export interface WebAssignResultado {
  alumno_id: number;
  nombre_completo: string;
  numero_cuenta: string | null;
  correo: string | null;
  ingenieria: string | null;
  carrera: string;
  algebra_trabajo: number | null;
  algebra_examen: number | null;
  trigonometria_trabajo: number | null;
  trigonometria_examen: number | null;
  geometria_trabajo: number | null;
  geometria_examen: number | null;
  promedio: number | null;
}

export interface WebAssignUploadResult {
  carrera: string;
  periodo: string;
  total_filas: number;
  encontrados: number;
  no_encontrados: number;
  resultados: WebAssignResultado[];
  no_encontrados_detalle: Array<{
    nombre_original: string;
    correo: string | null;
    motivo: string;
    candidatos: Array<{ alumno_id: number; nombre: string }>;
    indice: number;
  }>;
}

export interface WebAssignStatus {
  total_registros: number;
  por_carrera: Array<{ carrera: string; total_alumnos: number }>;
}

export async function uploadWebAssign(
  carrera: string,
  periodo: string,
  file: File,
): Promise<WebAssignUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('carrera', carrera);
  formData.append('periodo', periodo);

  const res = await fetch(`${WEBASSIGN_URL}/upload`, {
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

export async function getWebAssignResultados(
  periodo: string,
  carrera?: string,
): Promise<WebAssignResultado[]> {
  let url = `${WEBASSIGN_URL}/resultados?periodo=${encodeURIComponent(periodo)}`;
  if (carrera) url += `&carrera=${encodeURIComponent(carrera)}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('Error al obtener resultados');
  return res.json();
}

export async function getWebAssignStatus(periodo: string): Promise<WebAssignStatus> {
  const res = await fetch(
    `${WEBASSIGN_URL}/status?periodo=${encodeURIComponent(periodo)}`,
    { credentials: 'include' },
  );
  if (!res.ok) throw new Error('Error al obtener estado');
  return res.json();
}

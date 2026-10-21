import { API_BASE_URL } from '../config';
import { ApiError, apiFetch } from './api';

const URL_BASE = `${API_BASE_URL}/admin/alumnos`;

export interface AlumnoAdmin {
  id: number;
  nombre: string;
  correo_personal: string | null;
  correo_institucional: string | null;
  numero_cuenta: string | null;
  numero_folio: string | null;
  ingenieria_id: number | null;
  ingenieria: string | null;
  periodo_ingreso: string;
  es_provisional: boolean;
  examenes: string[];
}

export interface AlumnosAdminPage {
  items: AlumnoAdmin[];
  total: number;
  limit: number;
  offset: number;
}

export function listarAlumnosAdmin(params: {
  busqueda?: string;
  periodo?: string;
  limit?: number;
  offset?: number;
}): Promise<AlumnosAdminPage> {
  const qs = new URLSearchParams();
  if (params.busqueda) qs.set('busqueda', params.busqueda);
  if (params.periodo) qs.set('periodo', params.periodo);
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.offset) qs.set('offset', String(params.offset));
  return apiFetch<AlumnosAdminPage>(`${URL_BASE}?${qs.toString()}`);
}

export function editarDatosAlumno(
  id: number,
  datos: { numero_cuenta: string | null; numero_folio: string | null; ingenieria_id: number | null },
): Promise<AlumnoAdmin> {
  return apiFetch<AlumnoAdmin>(`${URL_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
}

export function unirAlumnos(
  conservarId: number,
  eliminarId: number,
): Promise<{ alumno: AlumnoAdmin; resultados_movidos: number }> {
  return apiFetch(`${URL_BASE}/unir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conservar_id: conservarId, eliminar_id: eliminarId }),
  });
}

/** Excel "Alumnos por revisar". Devuelve null si no hay nada que revisar. */
export async function descargarAlumnosPorRevisar(periodo: string): Promise<Blob | null> {
  const res = await fetch(
    `${API_BASE_URL}/reportes/alumnos-por-revisar?periodo=${encodeURIComponent(periodo)}`,
    { credentials: 'include' },
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.detail ?? `Error ${res.status} al descargar`, res.status);
  }
  return res.blob();
}

import { API_BASE_URL, USERS_URL } from '../config';
import { apiFetch } from './api';
import type { ProfesorListResponse, User, UserListResponse } from '../types';

export async function fetchUsers(params: {
  role_name?: string;
  busqueda?: string;
  activo?: boolean;
  /** Solo administrador, profesor y acreditador. */
  solo_personal?: boolean;
  limit?: number;
  offset?: number;
}): Promise<UserListResponse> {
  const searchParams = new URLSearchParams();
  if (params.role_name) searchParams.set('role_name', params.role_name);
  if (params.busqueda) searchParams.set('busqueda', params.busqueda);
  if (params.activo !== undefined) searchParams.set('activo', String(params.activo));
  if (params.solo_personal) searchParams.set('solo_personal', 'true');
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.offset) searchParams.set('offset', String(params.offset));

  const qs = searchParams.toString();
  const url = qs ? `${USERS_URL}?${qs}` : USERS_URL;

  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? 'Error al obtener usuarios');
  }
  return res.json() as Promise<UserListResponse>;
}

/** Profesores con sus grupos (solo los del periodo, si se indica). */
export function fetchProfesores(params: {
  busqueda?: string;
  activo?: boolean;
  periodo?: string;
  limit?: number;
  offset?: number;
}): Promise<ProfesorListResponse> {
  const searchParams = new URLSearchParams();
  if (params.busqueda) searchParams.set('busqueda', params.busqueda);
  if (params.activo !== undefined) searchParams.set('activo', String(params.activo));
  if (params.periodo) searchParams.set('periodo', params.periodo);
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.offset) searchParams.set('offset', String(params.offset));
  return apiFetch<ProfesorListResponse>(`${USERS_URL}/profesores?${searchParams}`);
}

export interface UsuarioPersonalDatos {
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  correo_personal: string;
  rfc: string | null;
  rol: string;
  /** Al crear es obligatoria; al editar, solo si se quiere cambiar. */
  password?: string;
}

export function crearUsuario(datos: UsuarioPersonalDatos): Promise<User> {
  return apiFetch<User>(USERS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
}

export function editarUsuario(
  id: number,
  datos: Partial<UsuarioPersonalDatos> & { activo?: boolean },
): Promise<User> {
  return apiFetch<User>(`${USERS_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
}

export function cambiarMiPassword(actual: string, nueva: string): Promise<void> {
  return apiFetch<void>(`${API_BASE_URL}/auth/cambiar-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actual, nueva }),
  });
}

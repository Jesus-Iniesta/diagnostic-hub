import { USERS_URL } from '../config';
import type { UserListResponse } from '../types';

export async function fetchUsers(params: {
  role_name?: string;
  busqueda?: string;
  activo?: boolean;
  limit?: number;
  offset?: number;
}): Promise<UserListResponse> {
  const searchParams = new URLSearchParams();
  if (params.role_name) searchParams.set('role_name', params.role_name);
  if (params.busqueda) searchParams.set('busqueda', params.busqueda);
  if (params.activo !== undefined) searchParams.set('activo', String(params.activo));
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

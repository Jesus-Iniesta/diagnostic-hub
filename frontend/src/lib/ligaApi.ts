import { LIGAS_EXAMENES_URL } from '../config';
import type {
  LigaExamenDiagnostico,
  LigaExamenDiagnosticoListResponse,
} from '../types/liga';

export async function fetchLigasVisibles(): Promise<LigaExamenDiagnostico[]> {
  const res = await fetch(LIGAS_EXAMENES_URL, { credentials: 'include' });
  if (!res.ok) throw new Error('Error al obtener ligas');
  const data: LigaExamenDiagnosticoListResponse = await res.json();
  return data.items;
}

export async function fetchLigasAdmin(): Promise<LigaExamenDiagnostico[]> {
  const res = await fetch(`${LIGAS_EXAMENES_URL}/admin`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Error al obtener ligas');
  const data: LigaExamenDiagnosticoListResponse = await res.json();
  return data.items;
}

export async function crearLiga(payload: {
  nombre: string;
  url: string;
  descripcion?: string;
  visible?: boolean;
  orden?: number;
}): Promise<LigaExamenDiagnostico> {
  const res = await fetch(LIGAS_EXAMENES_URL, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? 'Error al crear liga');
  }
  return res.json() as Promise<LigaExamenDiagnostico>;
}

export async function actualizarLiga(
  id: number,
  payload: {
    nombre?: string;
    url?: string;
    descripcion?: string;
    visible?: boolean;
    orden?: number;
  },
): Promise<LigaExamenDiagnostico> {
  const res = await fetch(`${LIGAS_EXAMENES_URL}/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? 'Error al actualizar liga');
  }
  return res.json() as Promise<LigaExamenDiagnostico>;
}

export async function toggleVisibilidad(
  id: number,
): Promise<LigaExamenDiagnostico> {
  const res = await fetch(`${LIGAS_EXAMENES_URL}/${id}/visibilidad`, {
    method: 'PATCH',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Error al cambiar visibilidad');
  return res.json() as Promise<LigaExamenDiagnostico>;
}

export async function eliminarLiga(id: number): Promise<void> {
  const res = await fetch(`${LIGAS_EXAMENES_URL}/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Error al eliminar liga');
}

import { ALUMNO_ME_URL } from '../config';
import type { AlumnoPerfil, DatosContactoUpdate, ResultadoAlumno } from '../types/alumno';
import { resultadoMock } from '../mocks/alumno';

export async function fetchMiPerfil(): Promise<AlumnoPerfil> {
  const res = await fetch(ALUMNO_ME_URL, { credentials: 'include' });
  if (!res.ok) {
    throw new Error('No se pudo cargar tu perfil');
  }
  return res.json() as Promise<AlumnoPerfil>;
}

export async function guardarDatosContacto(
  datos: DatosContactoUpdate,
): Promise<AlumnoPerfil> {
  const res = await fetch(ALUMNO_ME_URL, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? 'No se pudieron guardar los datos');
  }
  return res.json() as Promise<AlumnoPerfil>;
}

export async function fetchMisResultados(): Promise<ResultadoAlumno> {
  // TODO: conectar con GET /alumnos/me/resultados cuando exista el endpoint
  return resultadoMock;
}

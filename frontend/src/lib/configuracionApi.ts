import { CONFIG_CONTACTO_URL, CONFIG_REGISTRO_URL } from '../config';

/**
 * Servicio de configuración de formularios (contacto: mock, registro: real).
 *
 * - Contacto: mock-first para demo.
 * - Registro: conectado al backend real.
 */

const CONFIG_USE_MOCK = true;

export interface EstadoFormularioContacto {
  habilitado: boolean;
}

let estadoMock: EstadoFormularioContacto = { habilitado: true };

/* ---------- Contacto (mock) ---------- */

export async function fetchEstadoFormularioContacto(): Promise<EstadoFormularioContacto> {
  if (CONFIG_USE_MOCK) {
    return { ...estadoMock };
  }
  const response = await fetch(CONFIG_CONTACTO_URL, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Error ${response.status}`);
  }
  return response.json() as Promise<EstadoFormularioContacto>;
}

export async function actualizarEstadoFormularioContacto(
  habilitado: boolean,
): Promise<EstadoFormularioContacto> {
  if (CONFIG_USE_MOCK) {
    estadoMock = { habilitado };
    return { ...estadoMock };
  }
  const response = await fetch(CONFIG_CONTACTO_URL, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ habilitado }),
  });
  if (!response.ok) {
    throw new Error(`Error ${response.status}`);
  }
  return response.json() as Promise<EstadoFormularioContacto>;
}

/* ---------- Registro (backend real) ---------- */

export async function fetchEstadoFormularioRegistro(): Promise<EstadoFormularioContacto> {
  const response = await fetch(CONFIG_REGISTRO_URL, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Error ${response.status}`);
  }
  return response.json() as Promise<EstadoFormularioContacto>;
}

export async function actualizarEstadoFormularioRegistro(
  habilitado: boolean,
): Promise<EstadoFormularioContacto> {
  const response = await fetch(CONFIG_REGISTRO_URL, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ habilitado }),
  });
  if (!response.ok) {
    throw new Error(`Error ${response.status}`);
  }
  return response.json() as Promise<EstadoFormularioContacto>;
}
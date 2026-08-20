import { CONFIG_CONTACTO_URL } from '../config';

/**
 * Servicio de configuración del formulario de datos de contacto (mock-first).
 *
 * Cuando el backend esté listo:
 * 1. Poner `CONFIG_USE_MOCK = false`.
 * 2. Las funciones ya apuntan a `GET/PUT {API_BASE_URL}/configuracion/contacto`.
 *
 * En modo mock se usa un estado compartido en memoria para que el toggle del
 * administrador se refleje en la vista del alumno durante la demostración.
 */

const CONFIG_USE_MOCK = true;

export interface EstadoFormularioContacto {
  habilitado: boolean;
}

let estadoMock: EstadoFormularioContacto = { habilitado: true };

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
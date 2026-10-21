import {
  CONFIG_CONTACTO_URL,
  CONFIG_INDICE_FI_URL,
  CONFIG_PERIODO_RANGO_URL,
  CONFIG_REGISTRO_URL,
} from '../config';

/**
 * Servicio de configuración de formularios (contacto: mock, registro: real).
 *
 * - Contacto: mock-first para demo.
 * - Registro: conectado al backend real.
 */

const CONFIG_USE_MOCK = false;

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

/* ---------- Rangos de fechas por periodo (A/B) ---------- */

export interface PeriodoRango {
  periodo: string;
  inicio: string;
  fin: string;
  es_default: boolean;
}

export async function fetchPeriodoRango(periodo: string): Promise<PeriodoRango> {
  const url = `${CONFIG_PERIODO_RANGO_URL}?periodo=${encodeURIComponent(periodo)}`;
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Error ${response.status}`);
  }
  return response.json() as Promise<PeriodoRango>;
}

export async function guardarPeriodoRango(payload: {
  periodo: string;
  inicio: string;
  fin: string;
}): Promise<PeriodoRango> {
  const response = await fetch(CONFIG_PERIODO_RANGO_URL, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Error ${response.status}`);
  }
  return response.json() as Promise<PeriodoRango>;
}
/* ---------- Índice FI UAEMex (por periodo) ---------- */

export type ComponenteIndice = 'asistencia' | 'diagnostico' | 'webassign' | 'final';

export type ValoresIndice = Record<ComponenteIndice, number>;

export interface CategoriaIndice {
  nombre: string;
  minimo: number;
  maximo: number;
  comentario: string;
}

export interface ConfigIndiceFi {
  periodo: string;
  valores: ValoresIndice;
  maximo: number;
  categorias: CategoriaIndice[];
  /** Periodo del que se copiaron los valores (este periodo aún no tiene los suyos). */
  heredado_de: string | null;
  es_default: boolean;
}

async function mensajeError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { detail?: unknown };
    if (typeof data.detail === 'string') return data.detail;
  } catch {
    // sin cuerpo JSON
  }
  return `Error ${response.status}`;
}

export async function fetchIndiceFi(periodo: string): Promise<ConfigIndiceFi> {
  const url = `${CONFIG_INDICE_FI_URL}?periodo=${encodeURIComponent(periodo)}`;
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(await mensajeError(response));
  }
  return response.json() as Promise<ConfigIndiceFi>;
}

export async function guardarIndiceFi(payload: {
  periodo: string;
  valores: ValoresIndice;
  categorias: CategoriaIndice[];
}): Promise<ConfigIndiceFi> {
  const response = await fetch(CONFIG_INDICE_FI_URL, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await mensajeError(response));
  }
  return response.json() as Promise<ConfigIndiceFi>;
}

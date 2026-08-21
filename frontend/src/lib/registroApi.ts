import { INGENIERIAS_URL, REGISTRO_URL, CONFIG_REGISTRO_URL } from '../config';
import type {
  EstadoRegistro,
  Ingenieria,
  RegistroAlumnoPayload,
  RegistroAlumnoResponse,
} from '../types/registro';

class RegistroApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'RegistroApiError';
    this.status = status;
  }
}

async function handle<T>(response: Response): Promise<T> {
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const detail = (data as { detail?: string | Array<{ msg?: string }> })?.detail;
    const message =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.filter(Boolean).map((item) => item?.msg ?? '').join(', ')
          : `Error ${response.status}`;
    throw new RegistroApiError(message, response.status);
  }

  return data as T;
}

export async function fetchEstadoRegistro(): Promise<EstadoRegistro> {
  const response = await fetch(CONFIG_REGISTRO_URL, { credentials: 'include' });
  return handle<EstadoRegistro>(response);
}

export async function fetchIngenierias(): Promise<Ingenieria[]> {
  const response = await fetch(INGENIERIAS_URL, { credentials: 'include' });
  return handle<Ingenieria[]>(response);
}

export async function registrarAlumno(
  payload: RegistroAlumnoPayload,
): Promise<RegistroAlumnoResponse> {
  const response = await fetch(REGISTRO_URL, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handle<RegistroAlumnoResponse>(response);
}

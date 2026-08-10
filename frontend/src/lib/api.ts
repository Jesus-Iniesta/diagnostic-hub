import {
  AUTH_LOGOUT_URL,
  AUTH_ME_URL,
  AUTH_NUMERO_CUENTA_URL,
  AUTH_TOKEN_URL,
} from '../config';
import type { Token, User } from '../types';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function handle<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

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
    throw new ApiError(message, response.status);
  }

  return data as T;
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { credentials: 'include', ...init });
  return handle<T>(response);
}

export async function loginWithPassword(username: string, password: string): Promise<void> {
  const body = new URLSearchParams({ username, password });
  await apiFetch<Token>(AUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
}

export async function loginWithNumeroCuenta(numeroCuenta: string): Promise<void> {
  await apiFetch<Token>(AUTH_NUMERO_CUENTA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ numero_cuenta: numeroCuenta }),
  });
}

export async function fetchMe(): Promise<User> {
  return apiFetch<User>(AUTH_ME_URL);
}

export async function logout(): Promise<void> {
  await apiFetch<void>(AUTH_LOGOUT_URL, { method: 'POST' });
}
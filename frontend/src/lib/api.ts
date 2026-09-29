import { AUTH_LOGOUT_URL, AUTH_ME_URL, AUTH_NUMERO_CUENTA_URL, AUTH_TOKEN_URL } from '../config';
import type { Token, User } from '../types';

const ACCESS_TOKEN_STORAGE_KEY = 'tutonet_access_token';

function getStoredAccessToken(): string | null {
  return typeof window === 'undefined' ? null : sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

function storeAccessToken(token: string): void {
  sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
}

function clearAccessToken(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
}

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
          ? detail
              .filter(Boolean)
              .map((item) => item?.msg ?? '')
              .join(', ')
          : `Error ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return data as T;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const accessToken = getStoredAccessToken();
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers,
  });
  return handle<T>(response);
}

export async function loginWithPassword(username: string, password: string): Promise<void> {
  const body = new URLSearchParams({ username, password });
  const token = await apiFetch<Token>(AUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  storeAccessToken(token.access_token);
}

export async function loginWithNumeroCuenta(numeroCuenta: string): Promise<void> {
  const token = await apiFetch<Token>(AUTH_NUMERO_CUENTA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ numero_cuenta: numeroCuenta }),
  });
  storeAccessToken(token.access_token);
}

export async function fetchMe(): Promise<User> {
  return apiFetch<User>(AUTH_ME_URL);
}

export async function logout(): Promise<void> {
  try {
    await apiFetch<void>(AUTH_LOGOUT_URL, { method: 'POST' });
  } finally {
    clearAccessToken();
  }
}

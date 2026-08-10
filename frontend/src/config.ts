const apiUrl: string | undefined = import.meta.env.VITE_API_URL;

if (!apiUrl) {
  throw new Error(
    'VITE_API_URL no está definido. Copia frontend/.env.example a frontend/.env y configura la URL de la API.',
  );
}

export const API_BASE_URL: string = apiUrl;

export const HEALTH_URL = `${API_BASE_URL}/health`;
export const AUTH_TOKEN_URL = `${API_BASE_URL}/auth/token`;
export const AUTH_NUMERO_CUENTA_URL = `${API_BASE_URL}/auth/numero-cuenta`;
export const AUTH_ME_URL = `${API_BASE_URL}/auth/me`;
export const AUTH_LOGOUT_URL = `${API_BASE_URL}/auth/logout`;
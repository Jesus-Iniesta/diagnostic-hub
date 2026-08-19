import {
  alumnoPerfilMock,
  contactoInicialMock,
  resultadoMock,
} from '../mocks/alumno';
import type {
  AlumnoPerfil,
  DatosContacto,
  ResultadoAlumno,
} from '../types/alumno';

/**
 * Servicio del módulo de alumno (mock-first).
 *
 * Cuando el backend esté listo:
 * 1. Poner `ALUMNO_USE_MOCK = false`.
 * 2. Conectar cada función con su endpoint real:
 *    - `fetchMiPerfil`       → GET  {API_BASE_URL}/alumnos/me
 *    - `guardarDatosContacto`→ PUT  {API_BASE_URL}/alumnos/me
 *    - `fetchMisResultados`  → GET  {API_BASE_URL}/alumnos/me/resultados (endpoint pendiente)
 */
const ALUMNO_USE_MOCK = true;

export async function fetchMiPerfil(): Promise<AlumnoPerfil> {
  if (ALUMNO_USE_MOCK) {
    return alumnoPerfilMock;
  }
  // TODO: conectar con GET /alumnos/me
  throw new Error('fetchMiPerfil no conectado al backend');
}

export async function guardarDatosContacto(
  datos: DatosContacto,
): Promise<DatosContacto> {
  if (ALUMNO_USE_MOCK) {
    return { ...datos };
  }
  // TODO: conectar con PUT /alumnos/me
  throw new Error('guardarDatosContacto no conectado al backend');
}

export async function fetchMisResultados(): Promise<ResultadoAlumno> {
  if (ALUMNO_USE_MOCK) {
    return resultadoMock;
  }
  // TODO: conectar con GET /alumnos/me/resultados
  throw new Error('fetchMisResultados no conectado al backend');
}

/** Datos de contacto precargados (mock). En producción: /auth/me. */
export async function fetchContactoInicial(): Promise<DatosContacto> {
  if (ALUMNO_USE_MOCK) {
    return contactoInicialMock;
  }
  // TODO: conectar con /auth/me (User.correo_personal / correo_institucional)
  throw new Error('fetchContactoInicial no conectado al backend');
}
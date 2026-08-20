import { alumnosGrupoMock } from '../mocks/profesor';
import type {
  AlumnoGrupo,
  ResumenGrupo,
  ValidacionArchivo,
} from '../types/profesor';

/**
 * Servicio del módulo de profesor (mock-first).
 *
 * Cuando el backend esté listo:
 * 1. Poner `PROFESOR_USE_MOCK = false`.
 * 2. Conectar cada función con su endpoint real:
 *    - `fetchResumenGrupo`   → GET  {API_BASE_URL}/profesor/grupo/resumen (pendiente)
 *    - `validarArchivoGrupo` → POST {API_BASE_URL}/profesor/grupo/validar (pendiente)
 *    - `fetchAlumnosGrupo`   → GET  {API_BASE_URL}/profesor/grupo (pendiente)
 *
 * En modo mock se usa un estado compartido en memoria para simular el flujo
 * "cargar lista → validar → ver grupo" de forma coherente durante la demo.
 */
const PROFESOR_USE_MOCK = true;

let grupoCargadoMock = false;
const nombreGrupoMock = 'ICO-1';

function resumenDesdeAlumnos(alumnos: AlumnoGrupo[]): ResumenGrupo {
  if (!grupoCargadoMock) {
    return {
      grupoCargado: false,
      nombreGrupo: null,
      totalAlumnos: 0,
      evaluados: 0,
      promedio: null,
      alumnosConResultados: 0,
    };
  }

  const evaluados = alumnos.filter((a) => a.puntaje != null).length;
  const conResultados = alumnos.filter((a) => a.puntaje != null && a.nivel != null).length;
  const suma = alumnos.reduce((acc, a) => acc + (a.puntaje ?? 0), 0);
  const promedio = evaluados > 0 ? suma / evaluados : null;

  return {
    grupoCargado: true,
    nombreGrupo: nombreGrupoMock,
    totalAlumnos: alumnos.length,
    evaluados,
    promedio: promedio != null ? Number(promedio.toFixed(2)) : null,
    alumnosConResultados: conResultados,
  };
}

export async function fetchResumenGrupo(): Promise<ResumenGrupo> {
  if (PROFESOR_USE_MOCK) {
    return resumenDesdeAlumnos(alumnosGrupoMock);
  }
  // TODO: conectar con GET /profesor/grupo/resumen
  throw new Error('fetchResumenGrupo no conectado al backend');
}

export async function validarArchivoGrupo(_file: File): Promise<ValidacionArchivo> {
  if (PROFESOR_USE_MOCK) {
    await new Promise((resolve) => window.setTimeout(resolve, 1200));
    grupoCargadoMock = true;
    return {
      estado: 'correcto',
      encontrados: alumnosGrupoMock.length,
      noEncontrados: 2,
    };
  }
  // TODO: conectar con POST /profesor/grupo/validar
  throw new Error('validarArchivoGrupo no conectado al backend');
}

export async function fetchAlumnosGrupo(): Promise<AlumnoGrupo[]> {
  if (PROFESOR_USE_MOCK) {
    return grupoCargadoMock ? [...alumnosGrupoMock] : [];
  }
  // TODO: conectar con GET /profesor/grupo
  throw new Error('fetchAlumnosGrupo no conectado al backend');
}
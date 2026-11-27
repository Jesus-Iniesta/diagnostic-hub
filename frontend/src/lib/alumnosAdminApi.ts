import { API_BASE_URL } from '../config';
import { ApiError, apiFetch } from './api';

const URL_BASE = `${API_BASE_URL}/admin/alumnos`;

export interface AlumnoAdmin {
  id: number;
  nombre: string;
  correo_personal: string | null;
  correo_institucional: string | null;
  numero_cuenta: string | null;
  numero_folio: string | null;
  ingenieria_id: number | null;
  ingenieria: string | null;
  periodo_ingreso: string;
  es_provisional: boolean;
  examenes: string[];
  /** Exámenes con resultado por marca (c1, c2, algebra, trigonometria, geometria, calculo, wa). */
  marcas: Partial<Record<MarcaExamen, string[]>>;
}

export type MarcaExamen = 'c1' | 'c2' | 'algebra' | 'trigonometria' | 'geometria' | 'calculo' | 'wa';
export type FiltroAlumnos = 'todos' | 'por_revisar' | 'provisionales' | 'sin_cuenta';

export interface AlumnosAdminPage {
  items: AlumnoAdmin[];
  total: number;
  limit: number;
  offset: number;
}

export function listarAlumnosAdmin(params: {
  busqueda?: string;
  periodo?: string;
  filtro?: FiltroAlumnos;
  /** Cuántos exámenes del índice tiene (diagnóstico, final y WebAssign); 3 = todos. */
  examenes?: number;
  limit?: number;
  offset?: number;
}): Promise<AlumnosAdminPage> {
  const qs = new URLSearchParams();
  if (params.busqueda) qs.set('busqueda', params.busqueda);
  if (params.periodo) qs.set('periodo', params.periodo);
  if (params.filtro && params.filtro !== 'todos') qs.set('filtro', params.filtro);
  if (params.examenes !== undefined) qs.set('examenes', String(params.examenes));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.offset) qs.set('offset', String(params.offset));
  return apiFetch<AlumnosAdminPage>(`${URL_BASE}?${qs.toString()}`);
}

/** Dos alumnos que pueden ser la misma persona. */
export interface ParejaDuplicada {
  motivo: string;
  alumno: AlumnoAdmin;
  otro: AlumnoAdmin;
}

export function listarDuplicados(periodo?: string): Promise<ParejaDuplicada[]> {
  const qs = periodo ? `?periodo=${encodeURIComponent(periodo)}` : '';
  return apiFetch<ParejaDuplicada[]>(`${URL_BASE}/duplicados${qs}`);
}

/** Lo que aporta un examen al Índice FI (escala 0-10). */
export interface ComponenteIndice {
  nombre: string;
  obtenido: number;
  valor: number;
  presentado: boolean;
}

/** Calificaciones de un examen tal como vienen (sin ponderar); null si no lo presentó. */
export interface CalificacionesAlumno {
  diagnostico: {
    maximo: number;
    materias: { materia: string; c1: number | null; c2: number | null }[];
  } | null;
  webassign: {
    maximo: number;
    carrera: string;
    materias: { materia: string; tareas: number | null; examen: number | null }[];
  } | null;
  final: {
    maximo: number;
    promedio: number | null;
    materias: { materia: string; calificacion: number | null }[];
  } | null;
}

export interface ResumenAlumnoAdmin {
  alumno: AlumnoAdmin;
  periodo: string;
  tiene_resultados: boolean;
  indice: number | null;
  maximo: number;
  categoria: string | null;
  componentes: ComponenteIndice[];
  calificaciones: CalificacionesAlumno;
}

/** Datos y resultados del alumno; sin periodo, los del más reciente con resultados. */
export function obtenerResumenAlumno(id: number, periodo?: string): Promise<ResumenAlumnoAdmin> {
  const qs = periodo ? `?periodo=${encodeURIComponent(periodo)}` : '';
  return apiFetch<ResumenAlumnoAdmin>(`${URL_BASE}/${id}/resumen${qs}`);
}

/** Datos del alta de un alumno por el administrador. */
export interface NuevoAlumno {
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  sin_apellido_materno: boolean;
  correo_personal: string;
  correo_institucional: string | null;
  numero_cuenta: string | null;
  numero_folio: string | null;
  ingenieria_id: number;
  periodo_ingreso: string;
}

export function agregarAlumno(datos: NuevoAlumno): Promise<AlumnoAdmin> {
  return apiFetch<AlumnoAdmin>(URL_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
}

/** Indica que la pareja no es la misma persona: deja de salir en posibles duplicados. */
export function descartarDuplicado(alumnoId: number, otroId: number): Promise<void> {
  return apiFetch<void>(`${URL_BASE}/duplicados/descartar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alumno_id: alumnoId, otro_id: otroId }),
  });
}

export function editarDatosAlumno(
  id: number,
  datos: { numero_cuenta: string | null; numero_folio: string | null; ingenieria_id: number | null },
): Promise<AlumnoAdmin> {
  return apiFetch<AlumnoAdmin>(`${URL_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
}

export function unirAlumnos(
  conservarId: number,
  eliminarId: number,
): Promise<{ alumno: AlumnoAdmin; resultados_movidos: number }> {
  return apiFetch(`${URL_BASE}/unir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conservar_id: conservarId, eliminar_id: eliminarId }),
  });
}

/** Excel "Alumnos por revisar". Devuelve null si no hay nada que revisar. */
export async function descargarAlumnosPorRevisar(periodo: string): Promise<Blob | null> {
  const res = await fetch(
    `${API_BASE_URL}/reportes/alumnos-por-revisar?periodo=${encodeURIComponent(periodo)}`,
    { credentials: 'include' },
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.detail ?? `Error ${res.status} al descargar`, res.status);
  }
  return res.blob();
}

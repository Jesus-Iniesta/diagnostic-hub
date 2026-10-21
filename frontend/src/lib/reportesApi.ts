import { API_BASE_URL } from '../config';
import { apiFetch } from './api';

export interface CategoriaConteo {
  categoria: string;
  cantidad: number;
}

/** Conteos del CREANI: cada examen = cuántos alumnos lo hicieron. */
export interface ResumenGrupoCreani {
  alumnos: number;
  completos: number;
  pendientes: number;
  diagnostico: number;
  final: number;
  webassign: number;
  indice_promedio: number | null;
  /** Categorías del coordinador, de la más alta a la más baja. */
  categorias: CategoriaConteo[];
}

export interface ResumenCarrera extends ResumenGrupoCreani {
  /** Vacía para los alumnos sin ingeniería (no se pueden descargar aparte). */
  clave: string;
  nombre: string;
}

export interface ResumenCreani {
  periodo: string;
  maximo: number;
  posibles_duplicados: number;
  total: ResumenGrupoCreani;
  carreras: ResumenCarrera[];
}

export async function fetchResumenCreani(periodo: string): Promise<ResumenCreani> {
  return apiFetch<ResumenCreani>(
    `${API_BASE_URL}/reportes/resumen?periodo=${encodeURIComponent(periodo)}`,
  );
}

export async function fetchPeriodosReporte(): Promise<string[]> {
  const data = await apiFetch<{ periodos: string[] }>(`${API_BASE_URL}/reportes/periodos`);
  return data.periodos;
}

/** Descarga el CREANI del periodo; con `licenciatura`, solo esa carrera. */
export async function descargarCreani(periodo: string, licenciatura?: string): Promise<void> {
  const params = new URLSearchParams({ periodo });
  if (licenciatura) params.set('licenciatura', licenciatura);
  const res = await fetch(`${API_BASE_URL}/reportes/excel?${params.toString()}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Error ${res.status} al descargar el reporte`);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = licenciatura ? `reporte_${licenciatura}_${periodo}.xlsx` : `reporte_${periodo}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

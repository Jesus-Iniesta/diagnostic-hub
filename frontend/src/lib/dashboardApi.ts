import { apiFetch } from './api';
import {
  API_BASE_URL,
  DASHBOARD_STATS_URL,
  INGENIERIAS_URL,
} from '../config';

export interface LevelDistribution {
  nivel: string;
  cantidad: number;
  porcentaje: number;
}

export interface QuickSummary {
  ultimo_procesamiento: string | null;
  alumnos_procesados: number;
  alumnos_pendientes: number;
  porcentaje_procesado: number;
}

export interface DashboardStats {
  alumnos_total: number;
  programas_activos: number;
  evaluaciones_diagnostico: number;
  periodos_con_datos: number;
  level_distribution: LevelDistribution[];
  quick_summary: QuickSummary;
}

export interface PeriodoResponse {
  periodos: string[];
}

export interface Ingenieria {
  id: number;
  clave: string;
  nombre: string;
  activo: boolean;
}

export async function getDashboardStats(
  periodo: string,
  ingenieria?: string,
): Promise<DashboardStats> {
  const params = new URLSearchParams({ periodo });
  if (ingenieria) params.set('ingenieria', ingenieria);
  return apiFetch<DashboardStats>(`${DASHBOARD_STATS_URL}?${params}`);
}

export async function getPeriodos(): Promise<string[]> {
  const res = await apiFetch<PeriodoResponse>(
    `${API_BASE_URL}/reportes/periodos`,
  );
  return res.periodos;
}

export async function getProgramas(): Promise<Ingenieria[]> {
  return apiFetch<Ingenieria[]>(INGENIERIAS_URL);
}

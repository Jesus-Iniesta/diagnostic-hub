export interface StatMock {
  id: 'alumnos' | 'grupos' | 'evaluaciones' | 'reportes';
  title: string;
  value: string;
  description: string;
  trend: number[];
}

export interface LevelDistributionMock {
  level: string;
  value: number;
  percent: number;
}

export interface QuickSummaryItemMock {
  id: 'procesamiento' | 'archivos' | 'alumnos' | 'pendientes';
  title: string;
  text: string;
  status: string;
}

export const welcome = {
  title: '¡Bienvenido, Administrador! 👋',
  subtitle: 'Aquí tienes el resumen general de TutoNet.',
};

export const systemAlert = {
  title: 'El sistema está actualizado y funcionando correctamente.',
  description: 'Recuerda realizar respaldos periódicos de la información.',
};

export const adminStats: StatMock[] = [
  {
    id: 'alumnos',
    title: 'Alumnos',
    value: '1,250',
    description: 'Totales registrados',
    trend: [18, 22, 21, 26, 24, 30, 28, 34, 32, 36, 38, 40],
  },
  {
    id: 'grupos',
    title: 'Grupos',
    value: '42',
    description: 'Grupos activos',
    trend: [10, 12, 14, 13, 17, 18, 20, 19, 22, 24, 26, 27],
  },
  {
    id: 'evaluaciones',
    title: 'Evaluaciones',
    value: '3,750',
    description: 'Evaluaciones registradas',
    trend: [30, 34, 32, 38, 42, 40, 46, 48, 50, 52, 56, 60],
  },
  {
    id: 'reportes',
    title: 'Reportes',
    value: '128',
    description: 'Reportes generados',
    trend: [4, 6, 5, 9, 8, 12, 11, 15, 14, 18, 17, 21],
  },
];

export const levelDistribution: LevelDistributionMock[] = [
  { level: 'Alto', value: 313, percent: 25 },
  { level: 'Medio', value: 625, percent: 50 },
  { level: 'Bajo', value: 312, percent: 25 },
];

export const quickSummary: QuickSummaryItemMock[] = [
  {
    id: 'procesamiento',
    title: 'Último procesamiento',
    text: '11 de agosto de 2026, 22:30',
    status: 'Completado correctamente',
  },
  {
    id: 'archivos',
    title: 'Archivos cargados',
    text: '18 archivos',
    status: 'Todos validados',
  },
  {
    id: 'alumnos',
    title: 'Alumnos procesados',
    text: '1,210 alumnos',
    status: '96.8% del total',
  },
  {
    id: 'pendientes',
    title: 'Pendientes',
    text: '40 alumnos',
    status: 'Requieren revisión',
  },
];

export const periods = ['2026-B', '2026-A', '2025-B', '2025-A'];

export const programOptions = [
  'Todos los programas',
  'Ingeniería Civil',
  'Ingeniería Industrial',
  'Ingeniería en Computación',
  'Arquitectura',
];
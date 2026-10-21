import { dashboardColors } from '../theme/theme';

// Las categorías del Índice FI las nombra el coordinador, así que el color sale
// de su posición (de la más alta a la más baja) y no del nombre.
const COLORES = [
  dashboardColors.green,
  dashboardColors.blue,
  dashboardColors.orange,
  '#fd7e14',
  dashboardColors.red,
];

export function colorCategoria(nombre: string | null, ordenadas: string[]): string {
  const i = nombre ? ordenadas.indexOf(nombre) : -1;
  if (i < 0) return '#98A2B3';
  if (ordenadas.length <= 1) return COLORES[0];
  // Reparte las categorías sobre la escala de colores aunque sean más o menos de 5.
  const pos = Math.round((i * (COLORES.length - 1)) / (ordenadas.length - 1));
  return COLORES[pos];
}

/** 7 -> "7.0"; el máximo se escribe sin ceros de más: 10 -> "10", 2.5 -> "2.5". */
export function fmtIndice(indice: number | null, maximo: number): string {
  if (indice == null) return '—';
  return `${indice.toFixed(1)} / ${Number(maximo.toFixed(2))}`;
}

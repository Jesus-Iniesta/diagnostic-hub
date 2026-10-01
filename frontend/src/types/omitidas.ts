export type RazonOmitida =
  | 'registro del alumno'
  | 'periodo marcado en el formulario'
  | 'rango de fechas'
  | 'fecha anterior al periodo';

/** Fila omitida por ser de otro periodo (solo lectura). */
export interface OmitidaDetalle {
  indice: number;
  correo: string | null;
  folio: string | null;
  fecha: string | null;
  periodo_detectado: string | null;
  razon: RazonOmitida;
}

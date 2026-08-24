export interface FilaResultado {
  fila: number;
  nombre_completo: string;
  numero_cuenta: string | null;
  estado: 'exitoso' | 'duplicado' | 'error';
  motivo: string;
}

export interface ResultadoCarga {
  total_filas: number;
  exitosos: number;
  duplicados: number;
  errores: number;
  detalle: FilaResultado[];
}

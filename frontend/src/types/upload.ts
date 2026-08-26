export interface CampoError {
  campo: string;
  motivo: string;
}

export interface FilaResultado {
  fila: number;
  nombre_completo: string;
  numero_cuenta: string | null;
  estado: 'exitoso' | 'duplicado' | 'error';
  motivo: string;
  campos_con_error: CampoError[];
  datos_originales: Record<string, string>;
}

export interface ResultadoCarga {
  total_filas: number;
  exitosos: number;
  duplicados: number;
  errores: number;
  detalle: FilaResultado[];
}

export interface FilaCorregida {
  fila: number;
  datos: Record<string, string>;
}

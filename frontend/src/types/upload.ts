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

export interface CatalogoActualizado {
  fila: number;
  alumno_id: number;
  nombre: string;
  provisional: boolean;
  cambios: string[];
}

export interface CatalogoFila {
  fila: number;
  nombre: string;
  correos: string[];
  cuenta: string | null;
}

export interface CatalogoConflicto extends CatalogoFila {
  motivo: string;
  alumnos: { dato: string; alumno_id: number; nombre: string }[];
}

export interface ResultadoCatalogo {
  total_filas: number;
  actualizados: number;
  sin_cambios: number;
  no_encontrados: number;
  conflictos: CatalogoConflicto[];
  actualizados_detalle: CatalogoActualizado[];
  no_encontrados_detalle: CatalogoFila[];
  identificadores_nuevos: number;
  conflictos_identificadores: {
    tipo: string;
    valor: string;
    alumno_id: number;
    alumno_id_existente: number | null;
    motivo: string;
    indice: number | null;
  }[];
}

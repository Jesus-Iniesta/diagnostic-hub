export interface LigaExamenDiagnostico {
  id: number;
  nombre: string;
  url: string;
  descripcion: string | null;
  visible: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
}

export interface LigaExamenDiagnosticoListResponse {
  items: LigaExamenDiagnostico[];
  total: number;
}

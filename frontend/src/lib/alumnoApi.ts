import { ALUMNO_ME_URL } from '../config';
import { apiFetch } from './api';
import type {
  AlumnoPerfil,
  CuestionarioAlumnoResponse,
  DatosContactoUpdate,
  DiagnosticoAlumnoResponse,
  IndiceFiAlumno,
} from '../types/alumno';

const API_BASE = ALUMNO_ME_URL.replace('/me', '');

export async function fetchMiPerfil(): Promise<AlumnoPerfil> {
  const res = await fetch(ALUMNO_ME_URL, { credentials: 'include' });
  if (!res.ok) {
    throw new Error('No se pudo cargar tu perfil');
  }
  return res.json() as Promise<AlumnoPerfil>;
}

export async function guardarDatosContacto(
  datos: DatosContactoUpdate,
): Promise<AlumnoPerfil> {
  const res = await fetch(ALUMNO_ME_URL, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? 'No se pudieron guardar los datos');
  }
  return res.json() as Promise<AlumnoPerfil>;
}

export async function fetchMiDiagnostico(periodo?: string): Promise<DiagnosticoAlumnoResponse> {
  const params = periodo ? `?periodo=${encodeURIComponent(periodo)}` : '';
  const res = await fetch(`${API_BASE}/me/diagnostico${params}`, { credentials: 'include' });
  if (!res.ok) {
    if (res.status === 404) {
      return {
        periodo: '',
        promedio: null,
        nivel_general: 'Sin datos',
        retroalimentacion_general: 'Aún no tienes resultados del examen final registrados.',
        materias: [
          { materia: 'algebra', nombre: 'Álgebra', puntaje: null, maximo: 10, nivel: 'Sin datos', retroalimentacion: '' },
          { materia: 'trigonometria', nombre: 'Trigonometría', puntaje: null, maximo: 10, nivel: 'Sin datos', retroalimentacion: '' },
          { materia: 'geometria', nombre: 'Geometría Analítica', puntaje: null, maximo: 10, nivel: 'Sin datos', retroalimentacion: '' },
          { materia: 'calculo', nombre: 'Cálculo Diferencial', puntaje: null, maximo: 10, nivel: 'Sin datos', retroalimentacion: '' },
        ],
      };
    }
    throw new Error('No se pudieron cargar tus resultados');
  }
  return res.json() as Promise<DiagnosticoAlumnoResponse>;
}

/** Examen diagnóstico (cuestionarios 1 y 2); null si aún no hay resultados. */
export async function fetchMiCuestionario(): Promise<CuestionarioAlumnoResponse | null> {
  const res = await fetch(`${API_BASE}/me/cuestionario`, { credentials: 'include' });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error('No se pudieron cargar tus resultados del examen diagnóstico');
  }
  return res.json() as Promise<CuestionarioAlumnoResponse>;
}

export interface WebAssignMateriaResultado {
  materia: string;
  nombre: string;
  trabajo: number | null;
  examen: number | null;
  promedio: number | null;
  nivel: string;
  retroalimentacion: string;
}

export interface WebAssignAlumnoResponse {
  periodo: string;
  carrera: string;
  promedio: number | null;
  nivel_general: string;
  materias: WebAssignMateriaResultado[];
}

export async function fetchMiWebAssign(): Promise<WebAssignAlumnoResponse> {
  const res = await apiFetch<WebAssignAlumnoResponse>(`${ALUMNO_ME_URL}/webassign`);
  if (res === null) {
    return {
      periodo: '',
      carrera: '',
      promedio: null,
      nivel_general: 'Sin datos',
      materias: [
        { materia: 'algebra', nombre: 'Álgebra', trabajo: null, examen: null, promedio: null, nivel: 'Sin datos', retroalimentacion: '' },
        { materia: 'trigonometria', nombre: 'Trigonometría', trabajo: null, examen: null, promedio: null, nivel: 'Sin datos', retroalimentacion: '' },
        { materia: 'geometria', nombre: 'Geometría Analítica', trabajo: null, examen: null, promedio: null, nivel: 'Sin datos', retroalimentacion: '' },
      ],
    };
  }
  return res;
}

/** Índice FI UAEMex (el mismo de la carta); null si no se pudo consultar. */
export async function fetchMiIndiceFi(): Promise<IndiceFiAlumno | null> {
  const res = await fetch(`${ALUMNO_ME_URL}/indice-fi`, { credentials: 'include' });
  if (!res.ok) return null;
  return res.json() as Promise<IndiceFiAlumno>;
}

export async function descargarCorreosPdf(): Promise<void> {
  const res = await fetch(`${ALUMNO_ME_URL}/correos-pdf`, { credentials: 'include' });
  if (!res.ok) {
    throw new Error('No se pudieron descargar tus correos');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mis_correos_registrados.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function descargarResultadoPdf(): Promise<void> {
  const res = await fetch(`${ALUMNO_ME_URL}/reporte-pdf`, { credentials: 'include' });
  if (!res.ok) {
    throw new Error('No se pudo generar la carta de recomendación');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'carta_recomendacion.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

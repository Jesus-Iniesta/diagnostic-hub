import { ALUMNO_ME_URL } from '../config';
import { apiFetch } from './api';
import type { AlumnoPerfil, DatosContactoUpdate, DiagnosticoAlumnoResponse } from '../types/alumno';

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
        retroalimentacion_general: 'Aún no tienes resultados de diagnóstico registrados.',
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

export async function descargarCorreoPdf(): Promise<void> {
  const res = await fetch(`${ALUMNO_ME_URL}/correo-pdf`, { credentials: 'include' });
  if (!res.ok) {
    throw new Error('No se pudo generar el PDF');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'correo_tutonet.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function descargarResultadoPdf(): Promise<void> {
  const res = await fetch(`${ALUMNO_ME_URL}/reporte-pdf`, { credentials: 'include' });
  if (!res.ok) {
    throw new Error('No se pudo generar el PDF de resultados');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'resultado_tutonet.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

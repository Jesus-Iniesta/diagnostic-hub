import { API_BASE_URL } from '../config';
import type {
  Grupo,
  GrupoAlumno,
  GrupoCreate,
  GrupoResumen,
  ResumenGrupo,
  AlumnoGrupo,
  ValidacionArchivo,
} from '../types/profesor';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchMisGrupos(periodo?: string): Promise<Grupo[]> {
  const params = periodo ? `?periodo=${encodeURIComponent(periodo)}` : '';
  return fetchJson<Grupo[]>(`${API_BASE_URL}/profesor/grupos${params}`);
}

export async function crearGrupo(data: GrupoCreate): Promise<Grupo> {
  return fetchJson<Grupo>(`${API_BASE_URL}/profesor/grupos`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function eliminarGrupo(grupoId: number): Promise<void> {
  await fetch(`${API_BASE_URL}/profesor/grupos/${grupoId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
}

export async function fetchAlumnosGrupo(
  grupoId: number,
  periodo?: string,
): Promise<GrupoAlumno[]> {
  const params = periodo ? `?periodo=${encodeURIComponent(periodo)}` : '';
  return fetchJson<GrupoAlumno[]>(
    `${API_BASE_URL}/profesor/grupos/${grupoId}/alumnos${params}`,
  );
}

export async function agregarAlumno(
  grupoId: number,
  numeroCuenta: string,
): Promise<void> {
  await fetchJson(`${API_BASE_URL}/profesor/grupos/${grupoId}/alumnos`, {
    method: 'POST',
    body: JSON.stringify({ numero_cuenta: numeroCuenta }),
  });
}

export async function quitarAlumno(
  grupoId: number,
  alumnoId: number,
): Promise<void> {
  await fetch(
    `${API_BASE_URL}/profesor/grupos/${grupoId}/alumnos/${alumnoId}`,
    { method: 'DELETE', credentials: 'include' },
  );
}

export async function fetchResumenGrupo(
  grupoId: number,
  periodo: string,
): Promise<GrupoResumen> {
  return fetchJson<GrupoResumen>(
    `${API_BASE_URL}/profesor/grupos/${grupoId}/resumen?periodo=${encodeURIComponent(periodo)}`,
  );
}

export async function fetchResumenGrupoLegacy(): Promise<ResumenGrupo> {
  try {
    const grupos = await fetchMisGrupos();
    if (grupos.length === 0) {
      return {
        grupoCargado: false,
        nombreGrupo: null,
        totalAlumnos: 0,
        evaluados: 0,
        promedio: null,
        alumnosConResultados: 0,
      };
    }
    const primero = grupos[0];
    const resumen = await fetchResumenGrupo(primero.id, '2026B');
    return {
      grupoCargado: true,
      nombreGrupo: resumen.nombre,
      totalAlumnos: resumen.total_alumnos,
      evaluados: resumen.evaluados,
      promedio: resumen.promedio,
      alumnosConResultados: resumen.alumnos_con_resultados,
    };
  } catch {
    return {
      grupoCargado: false,
      nombreGrupo: null,
      totalAlumnos: 0,
      evaluados: 0,
      promedio: null,
      alumnosConResultados: 0,
    };
  }
}

export async function fetchAlumnosGrupoLegacy(): Promise<AlumnoGrupo[]> {
  try {
    const grupos = await fetchMisGrupos();
    if (grupos.length === 0) return [];
    const alumnos = await fetchAlumnosGrupo(grupos[0].id, '2026B');
    return alumnos.map((a) => ({
      id: String(a.alumno_id),
      nombre: a.nombre,
      numero_cuenta: a.numero_cuenta,
      licenciatura: a.ingenieria_clave,
      grupo: grupos[0].nombre,
      puntaje: a.puntaje,
      nivel: a.nivel,
      retroalimentacion: null,
    }));
  } catch {
    return [];
  }
}

export async function validarArchivoGrupo(
  _file: File,
): Promise<ValidacionArchivo> {
  return {
    estado: 'correcto',
    encontrados: 0,
    noEncontrados: 0,
  };
}

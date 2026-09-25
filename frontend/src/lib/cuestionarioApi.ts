import { API_BASE_URL } from '../config';
import type { ResultadoProcesamientoCuestionario } from '../types/cuestionario';

function throwIfNotOk(res: Response, fallback: string): Promise<ResultadoProcesamientoCuestionario> {
  if (!res.ok) {
    return res
      .json()
      .catch(() => ({ detail: fallback }))
      .then((error) => {
        throw new Error(error.detail || fallback);
      });
  }
  return res.json();
}

export async function uploadCuestionario(
  cuestionario: number,
  periodo: string,
  file: File,
): Promise<ResultadoProcesamientoCuestionario> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('cuestionario', String(cuestionario));
  formData.append('periodo', periodo);

  const res = await fetch(`${API_BASE_URL}/cuestionario-diagnostico/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  return throwIfNotOk(res, 'Error al procesar el cuestionario');
}

export async function corregirMatchingCuestionario(
  cuestionario: number,
  periodo: string,
  file: File,
  correcciones: Array<{ indice: number; alumno_id: number }>,
): Promise<ResultadoProcesamientoCuestionario> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('cuestionario', String(cuestionario));
  formData.append('periodo', periodo);
  formData.append('correcciones_json', JSON.stringify(correcciones));

  const res = await fetch(`${API_BASE_URL}/cuestionario-diagnostico/corregir-matching`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  return throwIfNotOk(res, 'Error al corregir matching');
}
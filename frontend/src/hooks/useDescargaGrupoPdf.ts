import { useState } from 'react';

import { descargarGrupoPdf } from '../lib/profesorApi';

/** Descarga el PDF de un grupo y recuerda cuál se está descargando y si falló. */
export function useDescargaGrupoPdf() {
  const [descargando, setDescargando] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const descargar = async (grupoId: number) => {
    setDescargando(grupoId);
    setError(null);
    try {
      await descargarGrupoPdf(grupoId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo generar el PDF del grupo');
    } finally {
      setDescargando(null);
    }
  };

  return { descargar, descargando, error };
}

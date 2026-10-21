import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getPeriodos } from '../lib/dashboardApi';
import { getCurrentPeriodo } from '../lib/periodo';

/** Periodo con que trabaja todo el panel de administración (selector de arriba). */
interface PeriodoContextValue {
  periodo: string;
  setPeriodo: (periodo: string) => void;
  periodos: string[];
}

const PeriodoContext = createContext<PeriodoContextValue | null>(null);

const STORAGE_KEY = 'tutonet.admin.periodo';

function leerGuardado(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** '2026B' -> '2026A' -> '2025B' ... */
function anterior(periodo: string): string {
  const anio = Number(periodo.slice(0, 4));
  return periodo.endsWith('B') ? `${anio}A` : `${anio - 1}B`;
}

function ordenar(periodos: Iterable<string>): string[] {
  return [...new Set(periodos)].sort((a, b) => b.localeCompare(a));
}

export function PeriodoProvider({ children }: { children: ReactNode }) {
  const actual = getCurrentPeriodo();
  const [periodo, setPeriodoState] = useState<string>(() => leerGuardado() ?? actual);
  const [conDatos, setConDatos] = useState<string[]>([]);

  useEffect(() => {
    getPeriodos()
      .then(setConDatos)
      .catch(() => setConDatos([]));
  }, []);

  const periodos = useMemo(() => {
    // El actual y los tres anteriores, más los que ya tienen resultados.
    const base = [actual];
    for (let i = 0; i < 3; i++) base.push(anterior(base[base.length - 1]));
    return ordenar([...base, ...conDatos, periodo]);
  }, [actual, conDatos, periodo]);

  const setPeriodo = (p: string) => {
    setPeriodoState(p);
    try {
      window.localStorage.setItem(STORAGE_KEY, p);
    } catch {
      // sin almacenamiento: solo dura esta sesión
    }
  };

  return (
    <PeriodoContext.Provider value={{ periodo, setPeriodo, periodos }}>{children}</PeriodoContext.Provider>
  );
}

export function usePeriodo(): PeriodoContextValue {
  const ctx = useContext(PeriodoContext);
  if (!ctx) throw new Error('usePeriodo debe usarse dentro de PeriodoProvider');
  return ctx;
}

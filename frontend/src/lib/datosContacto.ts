import type { AlumnoPerfil } from '../types/alumno';

// Campos del formulario de datos de contacto y cuáles son obligatorios. Lo usan
// el formulario y el panel "Tu información" para contar lo mismo.

export interface MissingField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'switch' | 'select';
  category: 'personales' | 'academicos' | 'socioeconomicos';
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  pattern?: string;
  patternMsg?: string;
}

const ALL_FIELDS: MissingField[] = [
  { key: 'correo_institucional', label: 'Correo institucional UAEMéx', type: 'email', category: 'personales' },
  { key: 'numero_cuenta', label: 'Número de cuenta (7 dígitos)', type: 'text', category: 'academicos', pattern: '^\\d{7}$', patternMsg: 'Debe ser exactamente 7 dígitos' },
  { key: 'numero_folio', label: 'Número de folio (9 dígitos)', type: 'text', category: 'academicos', pattern: '^\\d{9}$', patternMsg: 'Debe ser exactamente 9 dígitos' },
  { key: 'promedio_bachillerato', label: 'Promedio de bachillerato', type: 'number', category: 'academicos', min: 5.9, max: 10.0, step: 0.1 },
  { key: 'indice_uaem', label: 'Índice UAEM', type: 'number', category: 'academicos', min: 0, step: 0.1 },
  { key: 'lugar_admision', label: 'Lugar de admisión', type: 'number', category: 'academicos', min: 1, step: 1 },
  { key: 'escuela_procedencia', label: 'Escuela de procedencia', type: 'text', category: 'academicos' },
  { key: 'tiene_internet', label: '¿Tienes acceso a internet en casa?', type: 'switch', category: 'socioeconomicos' },
  { key: 'tiene_computadora', label: '¿Tienes computadora propia?', type: 'switch', category: 'socioeconomicos' },
  { key: 'vulnerabilidad_economica', label: '¿Presentas vulnerabilidad económica?', type: 'switch', category: 'socioeconomicos' },
  { key: 'es_foraneo', label: '¿Eres foráneo?', type: 'switch', category: 'socioeconomicos' },
  { key: 'convivencia', label: 'Situación de convivencia', type: 'text', category: 'socioeconomicos' },
];

// Un alumno provisional (creado desde los exámenes) confirma sus datos
// personales e ingeniería aunque ya tenga algo: lo que venía en los Excel no es
// el dato oficial (p. ej. el nombre completo quedó en "nombre").
const PROVISIONAL_FIELDS: MissingField[] = [
  { key: 'nombre', label: 'Nombre(s)', type: 'text', category: 'personales', required: true },
  { key: 'apellido_paterno', label: 'Apellido paterno', type: 'text', category: 'personales', required: true },
  { key: 'apellido_materno', label: 'Apellido materno', type: 'text', category: 'personales', required: true },
  { key: 'correo_personal', label: 'Correo personal', type: 'email', category: 'personales', required: true },
  { key: 'ingenieria_id', label: 'Ingeniería', type: 'select', category: 'academicos', required: true },
];

// Para un provisional, estos se tienen que llenar para dejar de serlo.
const REQUERIDOS_PROVISIONAL = new Set(['numero_cuenta']);

export function getMissingFields(perfil: AlumnoPerfil | null): MissingField[] {
  if (!perfil) return [];
  const faltantes = ALL_FIELDS.filter((field) => {
    if (field.key === 'correo_institucional') return !perfil.usuario.correo_institucional;
    const val = (perfil as unknown as Record<string, unknown>)[field.key];
    return val === null || val === undefined || val === '';
  });
  if (!perfil.es_provisional) return faltantes;
  return [
    ...PROVISIONAL_FIELDS,
    ...faltantes.map((f) => (REQUERIDOS_PROVISIONAL.has(f.key) ? { ...f, required: true } : f)),
  ];
}

function valorActual(perfil: AlumnoPerfil, key: string): string {
  const sugerido = (perfil.sugeridos as unknown as Record<string, unknown> | undefined)?.[key];
  const texto = (val: unknown) => (val === null || val === undefined ? '' : String(val));
  if (key === 'ingenieria_id') return texto(perfil.ingenieria_id ?? sugerido);
  const usuario = perfil.usuario as unknown as Record<string, unknown>;
  const val = key in usuario ? usuario[key] : (perfil as unknown as Record<string, unknown>)[key];
  // Si el perfil no lo tiene, se llena con lo que el sistema ya conoce del alumno.
  return texto(val) || texto(sugerido);
}

export function getInitialValues(
  fields: MissingField[],
  perfil: AlumnoPerfil,
): Record<string, string | number | boolean> {
  const values: Record<string, string | number | boolean> = {};
  for (const field of fields) {
    if (field.type === 'switch') {
      values[field.key] = false;
    } else if (field.type === 'number') {
      values[field.key] = '';
    } else {
      values[field.key] = valorActual(perfil, field.key);
    }
  }
  return values;
}

/** Obligatorios que siguen vacíos; `valores` son los del formulario (si no, los iniciales). */
export function obligatoriosFaltantes(
  perfil: AlumnoPerfil,
  valores?: Record<string, unknown>,
): MissingField[] {
  const campos = getMissingFields(perfil);
  const actuales = valores ?? getInitialValues(campos, perfil);
  return campos.filter(
    (f) => f.required && f.type !== 'switch' && !String(actuales[f.key] ?? '').trim(),
  );
}

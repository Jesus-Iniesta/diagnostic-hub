import {
  Alert,
  Button,
  Card,
  Divider,
  Loader,
  NumberInput,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCircleCheck, IconInfoCircle } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import { fetchEstadoFormularioContacto } from '../../lib/configuracionApi';
import { fetchMiPerfil, guardarDatosContacto } from '../../lib/alumnoApi';
import { fetchIngenierias } from '../../lib/registroApi';
import type { AlumnoPerfil, DatosContactoUpdate } from '../../types/alumno';
import classes from './DatosContactoForm.module.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface DatosContactoFormProps {
  /** Recibe el perfil guardado (p. ej. para saber si ya dejó de ser provisional). */
  onSaved?: (perfil: AlumnoPerfil) => void;
}

export default function DatosContactoForm({ onSaved }: DatosContactoFormProps) {
  const [habilitado, setHabilitado] = useState<boolean | null>(null);
  const [perfil, setPerfil] = useState<AlumnoPerfil | null>(null);
  const [ingenierias, setIngenierias] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let mounted = true;
    void Promise.all([
      fetchEstadoFormularioContacto().catch(() => ({ habilitado: true })),
      fetchMiPerfil(),
      fetchIngenierias().catch(() => []),
    ]).then(([config, perf, ingen]) => {
      if (mounted) {
        setHabilitado(config.habilitado);
        setPerfil(perf);
        setIngenierias(ingen.map((i) => ({ value: String(i.id), label: i.nombre })));
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) {
        setError('No se pudo cargar tu perfil');
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  const missingFields = getMissingFields(perfil);
  // La validación usa los campos del perfil ya cargado (al crear el form aún no hay perfil).
  const camposRef = useRef<MissingField[]>(missingFields);
  camposRef.current = missingFields;

  const form = useForm<Record<string, string | number | boolean>>({
    initialValues: {},
    validate: (values) => validateValues(values, camposRef.current),
  });

  useEffect(() => {
    if (perfil) form.setValues(getInitialValues(getMissingFields(perfil), perfil));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil]);

  const handleSubmit = form.onSubmit(async (values) => {
    setError(null);
    setSaving(true);
    try {
      const payload = buildPayload(values, missingFields);
      const updated = await guardarDatosContacto(payload);
      setPerfil(updated);
      setSaved(true);
      onSaved?.(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los datos');
    } finally {
      setSaving(false);
    }
  });

  if (loading) {
    return (
      <Card className={classes.card} padding="xl" radius="lg">
        <Stack align="center" py="xl">
          <Loader size="sm" />
        </Stack>
      </Card>
    );
  }

  // Un alumno creado desde los exámenes siempre puede completar sus datos.
  if (!habilitado && !perfil?.es_provisional) {
    return (
      <Card className={classes.card} padding="xl" radius="lg">
        <Stack gap="lg">
          <div>
            <Title order={3} className={classes.title}>Datos de contacto</Title>
            <Text className={classes.subtitle}>Completa tus datos para continuar.</Text>
          </div>
          <Alert color="orange" variant="light" radius="md" icon={<IconInfoCircle size={18} />}>
            El formulario de datos de contacto no se encuentra disponible en este momento.
            <Text component="span" className={classes.notice}>
              Cuando sea habilitado por la Coordinación, podrás registrar o actualizar tu información.
            </Text>
          </Alert>
        </Stack>
      </Card>
    );
  }

  if (missingFields.length === 0) {
    return (
      <Card className={classes.card} padding="xl" radius="lg">
        <Stack gap="lg">
          <div>
            <Title order={3} className={classes.title}>Datos de contacto</Title>
            <Text className={classes.subtitle}>Tu información está completa.</Text>
          </div>
          <Alert color="green" variant="light" radius="md" icon={<IconCircleCheck size={18} />}>
            Todos tus datos de contacto están registrados. No hay campos pendientes.
          </Alert>
        </Stack>
      </Card>
    );
  }

  const groupedFields = groupByCategory(missingFields);

  return (
    <Card className={classes.card} padding="xl" radius="lg">
      <Stack gap="lg">
        <div>
          <Title order={3} className={classes.title}>Datos de contacto</Title>
          <Text className={classes.subtitle}>
            Tienes {missingFields.length} campo{missingFields.length !== 1 ? 's' : ''} pendiente{missingFields.length !== 1 ? 's' : ''} por completar.
          </Text>
        </div>

        {perfil?.es_provisional && (
          <Alert color="orange" variant="light" radius="md" icon={<IconInfoCircle size={18} />}>
            Tus exámenes ya están en el sistema, pero falta tu registro. Revisa y completa tus datos (escribe tu
            nombre como aparece en tus documentos) para poder ver tus resultados.
          </Alert>
        )}

        <form onSubmit={handleSubmit} className={classes.form}>
          <Stack gap="lg">
            {saved && (
              <Alert color="green" variant="light" radius="md" icon={<IconCircleCheck size={18} />}>
                Tus datos se guardaron correctamente.
              </Alert>
            )}

            {Object.entries(groupedFields).map(([category, fields], groupIndex) => (
              <div key={category}>
                {groupIndex > 0 && <Divider color="#F0F1F5" />}
                <Text className={classes.sectionLabel}>{CATEGORY_LABELS[category]}</Text>
                <Stack gap="md" mt="sm">
                  {fields.map((field) => renderField(field, form, ingenierias))}
                </Stack>
              </div>
            ))}

            {error && (
              <Alert color="red" variant="light" radius="md">{error}</Alert>
            )}

            <Button
              type="submit"
              size="md"
              color="indigo"
              className={classes.submitButton}
              loading={saving}
              fullWidth
            >
              Guardar cambios
            </Button>
          </Stack>
        </form>
      </Stack>
    </Card>
  );
}

// --- Helpers ---

interface MissingField {
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

function getMissingFields(perfil: AlumnoPerfil | null): MissingField[] {
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
  if (key === 'ingenieria_id') return perfil.ingenieria_id != null ? String(perfil.ingenieria_id) : '';
  const usuario = perfil.usuario as unknown as Record<string, unknown>;
  const val = key in usuario ? usuario[key] : (perfil as unknown as Record<string, unknown>)[key];
  return val === null || val === undefined ? '' : String(val);
}

const CATEGORY_LABELS: Record<string, string> = {
  personales: 'Datos personales',
  academicos: 'Datos académicos',
  socioeconomicos: 'Datos socioeconómicos',
};

function groupByCategory(fields: MissingField[]): Record<string, MissingField[]> {
  return fields.reduce<Record<string, MissingField[]>>((acc, field) => {
    if (!acc[field.category]) acc[field.category] = [];
    acc[field.category].push(field);
    return acc;
  }, {});
}

function getInitialValues(
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

function validateValues(
  values: Record<string, unknown>,
  fields: MissingField[],
): Record<string, string | null> {
  const errors: Record<string, string | null> = {};
  for (const [key, check] of Object.entries(buildValidation(fields))) {
    const msg = check(values[key]);
    if (msg) errors[key] = msg;
  }
  return errors;
}

function buildValidation(fields: MissingField[]): Record<string, (value: unknown) => string | null> {
  const validate: Record<string, (value: unknown) => string | null> = {};
  for (const field of fields) {
    if (field.required && field.type !== 'switch') {
      const resto = buildValidation([{ ...field, required: false }])[field.key];
      validate[field.key] = (value) => {
        if (!String(value ?? '').trim()) return 'Este dato es obligatorio';
        return resto ? resto(value) : null;
      };
      continue;
    }
    if (field.type === 'email') {
      validate[field.key] = (value) => {
        const v = String(value ?? '').trim();
        if (!v) return null;
        if (!EMAIL_REGEX.test(v)) return 'Ingresa un correo válido';
        return null;
      };
    } else if (field.type === 'text' && field.pattern) {
      validate[field.key] = (value) => {
        const v = String(value ?? '').trim();
        if (!v) return null;
        const regex = new RegExp(field.pattern!);
        if (!regex.test(v)) return field.patternMsg ?? 'Formato inválido';
        return null;
      };
    } else if (field.type === 'number') {
      validate[field.key] = (value) => {
        const v = value === '' || value === undefined ? null : Number(value);
        if (v === null || isNaN(v)) return null;
        if (field.min !== undefined && v < field.min) return `Mínimo: ${field.min}`;
        if (field.max !== undefined && v > field.max) return `Máximo: ${field.max}`;
        return null;
      };
    }
  }
  return validate;
}

function buildPayload(
  values: Record<string, string | number | boolean>,
  fields: MissingField[],
): DatosContactoUpdate {
  const payload: DatosContactoUpdate = {};
  for (const field of fields) {
    const val = values[field.key];
    if (field.type === 'switch') {
      (payload as Record<string, unknown>)[field.key] = val;
    } else if (field.type === 'select') {
      if (val !== '') (payload as Record<string, unknown>)[field.key] = Number(val);
    } else if (field.required) {
      (payload as Record<string, unknown>)[field.key] = String(val).trim();
    } else if (field.type === 'number') {
      (payload as Record<string, unknown>)[field.key] = val === '' ? null : Number(val);
    } else {
      (payload as Record<string, unknown>)[field.key] = val === '' ? null : String(val).trim();
    }
  }
  return payload;
}

function renderField(
  field: MissingField,
  form: ReturnType<typeof useForm<Record<string, string | number | boolean>>>,
  ingenierias: { value: string; label: string }[],
): ReactNode {
  const props = form.getInputProps(field.key);

  if (field.type === 'select') {
    return (
      <Select
        key={field.key}
        label={field.label}
        placeholder="Selecciona una ingeniería"
        data={ingenierias}
        size="md"
        withAsterisk={field.required}
        value={(props.value as string) || null}
        onChange={(v) => form.setFieldValue(field.key, v ?? '')}
        error={props.error}
      />
    );
  }

  if (field.type === 'switch') {
    return (
      <Switch
        key={field.key}
        label={field.label}
        size="md"
        {...props}
      />
    );
  }

  if (field.type === 'number') {
    return (
      <NumberInput
        key={field.key}
        label={field.label}
        size="md"
        min={field.min}
        max={field.max}
        step={field.step}
        value={props.value as number}
        onChange={props.onChange}
        onBlur={props.onBlur}
        error={props.error}
      />
    );
  }

  return (
    <TextInput
      key={field.key}
      label={field.label}
      size="md"
      withAsterisk={field.required}
      placeholder={field.type === 'email' ? 'tu.correo@uaemex.mx' : undefined}
      {...props}
    />
  );
}

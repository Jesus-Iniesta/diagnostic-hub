import {
  Alert,
  Button,
  Card,
  Divider,
  Loader,
  NumberInput,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCircleCheck, IconInfoCircle } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { fetchEstadoFormularioContacto } from '../../lib/configuracionApi';
import { fetchMiPerfil, guardarDatosContacto } from '../../lib/alumnoApi';
import type { AlumnoPerfil, DatosContactoUpdate } from '../../types/alumno';
import classes from './DatosContactoForm.module.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface DatosContactoFormProps {
  onSaved?: () => void;
}

export default function DatosContactoForm({ onSaved }: DatosContactoFormProps) {
  const [habilitado, setHabilitado] = useState<boolean | null>(null);
  const [perfil, setPerfil] = useState<AlumnoPerfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let mounted = true;
    void Promise.all([
      fetchEstadoFormularioContacto().catch(() => ({ habilitado: true })),
      fetchMiPerfil(),
    ]).then(([config, perf]) => {
      if (mounted) {
        setHabilitado(config.habilitado);
        setPerfil(perf);
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

  const form = useForm({
    initialValues: getInitialValues(missingFields),
    validate: buildValidation(missingFields),
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setError(null);
    setSaving(true);
    try {
      const payload = buildPayload(values, missingFields);
      const updated = await guardarDatosContacto(payload);
      setPerfil(updated);
      setSaved(true);
      onSaved?.();
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

  if (!habilitado) {
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
                  {fields.map((field) => renderField(field, form))}
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
  type: 'text' | 'email' | 'number' | 'switch';
  category: 'personales' | 'academicos' | 'socioeconomicos';
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

function getMissingFields(perfil: AlumnoPerfil | null): MissingField[] {
  if (!perfil) return [];
  return ALL_FIELDS.filter((field) => {
    if (field.key === 'correo_institucional') return !perfil.usuario.correo_institucional;
    const val = (perfil as unknown as Record<string, unknown>)[field.key];
    return val === null || val === undefined || val === '';
  });
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

function getInitialValues(fields: MissingField[]): Record<string, string | number | boolean> {
  const values: Record<string, string | number | boolean> = {};
  for (const field of fields) {
    if (field.type === 'switch') {
      values[field.key] = false;
    } else if (field.type === 'number') {
      values[field.key] = '';
    } else {
      values[field.key] = '';
    }
  }
  return values;
}

function buildValidation(fields: MissingField[]): Record<string, (value: unknown) => string | null> {
  const validate: Record<string, (value: unknown) => string | null> = {};
  for (const field of fields) {
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
  form: ReturnType<typeof useForm>,
): ReactNode {
  const props = form.getInputProps(field.key);

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
      placeholder={field.type === 'email' ? 'tu.correo@uaemex.mx' : undefined}
      {...props}
    />
  );
}

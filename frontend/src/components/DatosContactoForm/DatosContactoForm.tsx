import {
  Alert,
  Button,
  Card,
  Checkbox,
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
import {
  esObligatorio,
  getInitialValues,
  getMissingFields,
  obligatoriosFaltantes,
  type MissingField,
} from '../../lib/datosContacto';
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
  const obligatorios = missingFields.filter((f) => f.required && f.type !== 'switch');
  const faltanObligatorios = perfil ? obligatoriosFaltantes(perfil, form.values).length : 0;

  return (
    <Card className={classes.card} padding="xl" radius="lg">
      <Stack gap="lg">
        <div>
          <Title order={3} className={classes.title}>Datos de contacto</Title>
          <Text className={classes.subtitle}>
            {faltanObligatorios > 0
              ? `Te faltan ${faltanObligatorios} dato${faltanObligatorios !== 1 ? 's' : ''} obligatorio${faltanObligatorios !== 1 ? 's' : ''}.`
              : obligatorios.length > 0
                ? 'Revisa tus datos y guarda para terminar tu registro.'
                : 'Tus datos obligatorios están completos. Puedes agregar estos datos opcionales.'}
          </Text>
          {obligatorios.length > 0 && (
            <Text className={classes.leyenda}>
              Los datos marcados con <span className={classes.asterisco}>*</span> son obligatorios;
              los que dicen "opcional" puedes dejarlos vacíos.
            </Text>
          )}
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

function validateValues(
  values: Record<string, unknown>,
  fields: MissingField[],
): Record<string, string | null> {
  const errors: Record<string, string | null> = {};
  const campos = fields.map((f) => ({ ...f, required: esObligatorio(f, values) }));
  for (const [key, check] of Object.entries(buildValidation(campos))) {
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
    if (field.type === 'switch' || field.type === 'checkbox') {
      (payload as Record<string, unknown>)[field.key] = Boolean(val);
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
  const required = esObligatorio(field, form.values);
  const label = required || field.type === 'checkbox' ? field.label : `${field.label} (opcional)`;

  if (field.type === 'checkbox') {
    return (
      <Checkbox
        key={field.key}
        label={label}
        mt={-6}
        checked={Boolean(form.values[field.key])}
        onChange={(e) => {
          const marcado = e.currentTarget.checked;
          form.setFieldValue(field.key, marcado);
          // Con la marca, el apellido materno se guarda vacío.
          if (marcado && field.key === 'sin_apellido_materno') {
            form.setFieldValue('apellido_materno', '');
            form.clearFieldError('apellido_materno');
          }
        }}
      />
    );
  }

  if (field.type === 'select') {
    return (
      <Select
        key={field.key}
        label={label}
        placeholder="Selecciona una ingeniería"
        data={ingenierias}
        size="md"
        withAsterisk={required}
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
        label={label}
        withAsterisk={required}
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
      label={label}
      size="md"
      withAsterisk={required}
      disabled={field.key === 'apellido_materno' && Boolean(form.values.sin_apellido_materno)}
      placeholder={field.type === 'email' ? 'tu.correo@uaemex.mx' : undefined}
      {...props}
    />
  );
}

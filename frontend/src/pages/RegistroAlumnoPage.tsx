import {
  Alert,
  Anchor,
  Button,
  Checkbox,
  Loader,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Stepper,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  IconArrowLeft,
  IconArrowRight,
  IconBuildingBank,
  IconCircleCheck,
  IconInfoCircle,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  fetchEstadoRegistro,
  fetchIngenierias,
  registrarAlumno,
} from '../lib/registroApi';
import type { Ingenieria } from '../types/registro';
import classes from './RegistroAlumnoPage.module.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegistroAlumnoPage() {
  const [habilitado, setHabilitado] = useState<boolean | null>(null);
  const [ingenierias, setIngenierias] = useState<Ingenieria[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [tieneCuenta, setTieneCuenta] = useState<'si' | 'no'>('no');

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchEstadoRegistro(), fetchIngenierias()])
      .then(([estado, ingen]) => {
        if (!mounted) return;
        setHabilitado(estado.habilitado);
        setIngenierias(ingen);
      })
      .catch(() => {
        if (!mounted) return;
        setHabilitado(false);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const form = useForm({
    initialValues: {
      nombre: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      correoPersonal: '',
      correoPersonalConfirmacion: '',
      numeroCuenta: '',
      numeroCuentaConfirmacion: '',
      numeroFolio: '',
      numeroFolioConfirmacion: '',
      ingenieriaId: '',
      periodoIngreso: '',
      promedioBachillerato: '',
      indiceUaem: '',
      lugarAdmision: '',
      escuelaProcedencia: '',
      tieneInternet: false,
      tieneComputadora: false,
      esForaneo: false,
      convivencia: '',
      vulnerabilidadEconomica: false,
    },
    validate: {
      nombre: (v) => (!v.trim() ? 'Ingresa tu nombre' : null),
      apellidoPaterno: (v) => (!v.trim() ? 'Ingresa tu apellido paterno' : null),
      apellidoMaterno: (v) => (!v.trim() ? 'Ingresa tu apellido materno' : null),
      correoPersonal: (v) => {
        if (!v.trim()) return 'Ingresa tu correo personal';
        if (!EMAIL_REGEX.test(v.trim())) return 'Ingresa un correo válido';
        return null;
      },
      correoPersonalConfirmacion: (v, values) => {
        if (!v.trim()) return 'Confirma tu correo personal';
        if (v.trim() !== values.correoPersonal.trim()) return 'Los correos no coinciden';
        return null;
      },
      numeroCuenta: (v) => {
        if (tieneCuenta === 'no') return null;
        if (!v.trim()) return 'Ingresa tu número de cuenta';
        if (!/^\d{7}$/.test(v.trim())) return 'Debe ser exactamente 7 dígitos';
        return null;
      },
      numeroCuentaConfirmacion: (v, values) => {
        if (tieneCuenta === 'no') return null;
        if (!v.trim()) return 'Confirma tu número de cuenta';
        if (v.trim() !== values.numeroCuenta.trim()) return 'Los números de cuenta no coinciden';
        return null;
      },
      numeroFolio: (v) => {
        if (!v.trim()) return 'Ingresa tu número de folio';
        if (!/^\d{9}$/.test(v.trim())) return 'Debe ser exactamente 9 dígitos';
        return null;
      },
      numeroFolioConfirmacion: (v, values) => {
        if (!v.trim()) return 'Confirma tu número de folio';
        if (v.trim() !== values.numeroFolio.trim()) return 'Los números de folio no coinciden';
        return null;
      },
      ingenieriaId: (v) => (!v ? 'Selecciona una ingeniería' : null),
      periodoIngreso: (v) => {
        if (!v.trim()) return 'Ingresa el periodo de ingreso';
        if (!/^\d{4}[AB]$/.test(v.trim())) return 'Formato: 2026A o 2026B';
        return null;
      },
      promedioBachillerato: (v) => {
        if (v === '') return null;
        const n = Number(v);
        if (isNaN(n) || n < 5.9 || n > 10) return 'Entre 5.9 y 10';
        return null;
      },
      indiceUaem: (v) => {
        if (v === '') return null;
        const n = Number(v);
        if (isNaN(n) || n < 0) return 'Debe ser ≥ 0';
        return null;
      },
      lugarAdmision: (v) => {
        if (v === '') return null;
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1) return 'Debe ser un entero ≥ 1';
        return null;
      },
    },
  });

  const stepFields: Record<number, string[]> = {
    0: ['nombre', 'apellidoPaterno', 'apellidoMaterno'],
    1: ['correoPersonal', 'correoPersonalConfirmacion'],
    2: ['numeroFolio', 'numeroFolioConfirmacion', 'numeroCuenta', 'numeroCuentaConfirmacion'],
    3: ['ingenieriaId', 'periodoIngreso', 'promedioBachillerato', 'indiceUaem', 'lugarAdmision', 'escuelaProcedencia'],
    4: [],
  };

  const validateStep = async (step: number): Promise<boolean> => {
    const fields = stepFields[step];
    if (!fields || fields.length === 0) return true;
    const errors = form.validate();
    if (errors.hasErrors) {
      const stepHasError = fields.some((f) => errors.errors[f]);
      if (stepHasError) return false;
    }
    return true;
  };

  const handleNext = async () => {
    const valid = await validateStep(activeStep);
    if (valid) setActiveStep((s) => Math.min(s + 1, 4));
  };

  const handlePrev = () => setActiveStep((s) => Math.max(s - 1, 0));

  const handleSubmit = form.onSubmit(async (values) => {
    setError(null);
    setSubmitting(true);
    try {
      await registrarAlumno({
        nombre: values.nombre.trim(),
        apellido_paterno: values.apellidoPaterno.trim(),
        apellido_materno: values.apellidoMaterno.trim(),
        correo_personal: values.correoPersonal.trim(),
        numero_cuenta: tieneCuenta === 'si' ? values.numeroCuenta.trim() : null,
        numero_folio: values.numeroFolio.trim() || null,
        ingenieria_id: Number(values.ingenieriaId),
        periodo_ingreso: values.periodoIngreso.trim(),
        promedio_bachillerato: values.promedioBachillerato !== '' ? Number(values.promedioBachillerato) : null,
        indice_uaem: values.indiceUaem !== '' ? Number(values.indiceUaem) : null,
        lugar_admision: values.lugarAdmision !== '' ? Number(values.lugarAdmision) : null,
        escuela_procedencia: values.escuelaProcedencia.trim() || null,
        tiene_internet: values.tieneInternet,
        tiene_computadora: values.tieneComputadora,
        es_foraneo: values.esForaneo,
        convivencia: values.convivencia.trim() || null,
        vulnerabilidad_economica: values.vulnerabilidadEconomica,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar el registro');
    } finally {
      setSubmitting(false);
    }
  });

  const ingenieriaOptions = ingenierias.map((i) => ({
    value: String(i.id),
    label: `${i.clave} — ${i.nombre}`,
  }));

  if (loading) {
    return (
      <div className={classes.page}>
        <div className={classes.wrapper}>
          <Stack align="center" py="xl">
            <Loader size="sm" />
          </Stack>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={classes.page}>
        <div className={classes.wrapper}>
          <IconBuildingBank size={44} stroke={1.5} className={classes.icon} />
          <Title order={1} className={classes.title}>
            Registro exitoso
          </Title>
          <Text className={classes.subtitle}>
            Tu cuenta ha sido creada correctamente.
          </Text>
          <Alert
            color="green"
            variant="light"
            radius="md"
            icon={<IconCircleCheck size={18} />}
          >
            Ya puedes iniciar sesión con tu número de cuenta.
          </Alert>
          <div className={classes.backLink}>
            <Anchor component={Link} to="/login?modo=alumno">
              <IconArrowLeft size={14} /> Volver al login
            </Anchor>
          </div>
        </div>
      </div>
    );
  }

  if (!habilitado) {
    return (
      <div className={classes.page}>
        <div className={classes.wrapper}>
          <IconBuildingBank size={44} stroke={1.5} className={classes.icon} />
          <Title order={1} className={classes.title}>
            Registro de alumno
          </Title>
          <Alert
            color="orange"
            variant="light"
            radius="md"
            icon={<IconInfoCircle size={18} />}
            mt="md"
          >
            El formulario de registro no se encuentra disponible en este momento.
            <Text component="span" display="block" mt={4} size="sm">
              Contacta a la Coordinación para más información.
            </Text>
          </Alert>
          <div className={classes.backLink}>
            <Anchor component={Link} to="/login?modo=alumno">
              <IconArrowLeft size={14} /> Volver al login
            </Anchor>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={classes.page}>
      <div className={classes.wrapper}>
        <IconBuildingBank size={44} stroke={1.5} className={classes.icon} />
        <Title order={1} className={classes.title}>
          Registro de alumno
        </Title>
        <Text className={classes.subtitle}>
          Completa tus datos para crear tu cuenta en el sistema.
        </Text>

        <Stepper active={activeStep} className={classes.stepper}>
          <Stepper.Step />
          <Stepper.Step />
          <Stepper.Step />
          <Stepper.Step />
          <Stepper.Step />
        </Stepper>

        <form onSubmit={handleSubmit} className={classes.form}>
          <div className={classes.stepContent}>
            {activeStep === 0 && (
              <Stack gap="md">
                <Text className={classes.stepTitle}>Datos personales</Text>
                <TextInput
                  label="Nombre(s)"
                  placeholder="Tu nombre"
                  withAsterisk
                  size="md"
                  {...form.getInputProps('nombre')}
                />
                <TextInput
                  label="Apellido paterno"
                  placeholder="Apellido paterno"
                  withAsterisk
                  size="md"
                  {...form.getInputProps('apellidoPaterno')}
                />
                <TextInput
                  label="Apellido materno"
                  placeholder="Apellido materno"
                  withAsterisk
                  size="md"
                  {...form.getInputProps('apellidoMaterno')}
                />
              </Stack>
            )}

            {activeStep === 1 && (
              <Stack gap="md">
                <Text className={classes.stepTitle}>Correo personal</Text>
                <TextInput
                  label="Correo personal"
                  placeholder="correo@ejemplo.com"
                  withAsterisk
                  size="md"
                  {...form.getInputProps('correoPersonal')}
                />
                <TextInput
                  label="Confirmar correo personal"
                  placeholder="Repite tu correo personal"
                  withAsterisk
                  size="md"
                  {...form.getInputProps('correoPersonalConfirmacion')}
                />
              </Stack>
            )}

            {activeStep === 2 && (
              <Stack gap="md">
                <Text className={classes.stepTitle}>Identificación</Text>
                <TextInput
                  label="Número de folio"
                  placeholder="123456789"
                  description="9 dígitos — requerido"
                  withAsterisk
                  size="md"
                  {...form.getInputProps('numeroFolio')}
                />
                <TextInput
                  label="Confirmar número de folio"
                  placeholder="Repite tu número de folio"
                  withAsterisk
                  size="md"
                  {...form.getInputProps('numeroFolioConfirmacion')}
                />

                <div className={classes.toggleRow}>
                  <Text className={classes.toggleLabel}>¿Tienes número de cuenta?</Text>
                  <SegmentedControl
                    value={tieneCuenta}
                    onChange={(v) => {
                      setTieneCuenta(v as 'si' | 'no');
                      if (v === 'no') {
                        form.setFieldValue('numeroCuenta', '');
                        form.setFieldValue('numeroCuentaConfirmacion', '');
                        form.clearFieldError('numeroCuenta');
                        form.clearFieldError('numeroCuentaConfirmacion');
                      }
                    }}
                    data={[
                      { label: 'Sí', value: 'si' },
                      { label: 'No', value: 'no' },
                    ]}
                    size="md"
                    radius="md"
                  />
                </div>

                {tieneCuenta === 'si' && (
                  <>
                    <TextInput
                      label="Número de cuenta"
                      placeholder="1234567"
                      description="7 dígitos"
                      withAsterisk
                      size="md"
                      {...form.getInputProps('numeroCuenta')}
                    />
                    <TextInput
                      label="Confirmar número de cuenta"
                      placeholder="Repite tu número de cuenta"
                      withAsterisk
                      size="md"
                      {...form.getInputProps('numeroCuentaConfirmacion')}
                    />
                  </>
                )}
              </Stack>
            )}

            {activeStep === 3 && (
              <Stack gap="md">
                <Text className={classes.stepTitle}>Datos académicos</Text>
                <Select
                  label="Ingeniería"
                  placeholder="Selecciona una ingeniería"
                  data={ingenieriaOptions}
                  withAsterisk
                  size="md"
                  searchable
                  {...form.getInputProps('ingenieriaId')}
                />
                <TextInput
                  label="Periodo de ingreso"
                  placeholder="2026B"
                  description="Formato: YYYYA o YYYYB (ej. 2026A, 2026B)"
                  withAsterisk
                  size="md"
                  {...form.getInputProps('periodoIngreso')}
                />
                <NumberInput
                  label="Promedio de bachillerato"
                  placeholder="8.5"
                  description="Opcional. Entre 5.9 y 10"
                  size="md"
                  min={5.9}
                  max={10}
                  step={0.1}
                  decimalScale={1}
                  {...form.getInputProps('promedioBachillerato')}
                />
                <NumberInput
                  label="Índice UAEM"
                  placeholder="7.0"
                  description="Escribe el índice UAEM que obtuviste. Es el dato que aparece en tu hoja de resultados de aceptación, enviada a tu correo."
                  size="md"
                  min={0}
                  step={0.1}
                  decimalScale={1}
                  {...form.getInputProps('indiceUaem')}
                />
                <NumberInput
                  label="Lugar de admisión"
                  placeholder="150"
                  description="Opcional. Entero ≥ 1"
                  size="md"
                  min={1}
                  decimalScale={0}
                  {...form.getInputProps('lugarAdmision')}
                />
                <TextInput
                  label="Escuela de procedencia"
                  placeholder="Nombre de tu escuela"
                  description="Opcional"
                  size="md"
                  {...form.getInputProps('escuelaProcedencia')}
                />
              </Stack>
            )}

            {activeStep === 4 && (
              <Stack gap="md">
                <Text className={classes.stepTitle}>Situación personal</Text>
                <TextInput
                  label="Convivencia"
                  placeholder="Ej. Padres, Solo, Otros"
                  description="Opcional"
                  size="md"
                  {...form.getInputProps('convivencia')}
                />
                <div className={classes.checkboxRow}>
                  <Checkbox
                    label="Tengo internet en casa"
                    size="md"
                    className={classes.checkboxItem}
                    {...form.getInputProps('tieneInternet', { type: 'checkbox' })}
                  />
                  <Checkbox
                    label="Tengo computadora"
                    size="md"
                    className={classes.checkboxItem}
                    {...form.getInputProps('tieneComputadora', { type: 'checkbox' })}
                  />
                  <Checkbox
                    label="Soy foráneo"
                    size="md"
                    className={classes.checkboxItem}
                    {...form.getInputProps('esForaneo', { type: 'checkbox' })}
                  />
                  <Checkbox
                    label="Vulnerabilidad económica"
                    size="md"
                    className={classes.checkboxItem}
                    {...form.getInputProps('vulnerabilidadEconomica', { type: 'checkbox' })}
                  />
                </div>
              </Stack>
            )}
          </div>

          {error && (
            <Alert color="red" variant="light" radius="md" mt="md">
              {error}
            </Alert>
          )}

          <div className={classes.stepButtons}>
            {activeStep > 0 && (
              <Button
                variant="light"
                color="gray"
                size="md"
                onClick={handlePrev}
                leftSection={<IconArrowLeft size={16} />}
              >
                Anterior
              </Button>
            )}
            <div style={{ flex: 1 }} />
            {activeStep < 4 ? (
              <Button
                size="md"
                color="brand.8"
                className={classes.submitButton}
                onClick={handleNext}
                rightSection={<IconArrowRight size={16} />}
              >
                Siguiente
              </Button>
            ) : (
              <Button
                type="submit"
                size="md"
                color="brand.8"
                className={classes.submitButton}
                loading={submitting}
              >
                Crear cuenta
              </Button>
            )}
          </div>

          <div className={classes.backLink}>
            <Anchor component={Link} to="/login?modo=alumno">
              <IconArrowLeft size={14} /> Volver al login
            </Anchor>
          </div>
        </form>
      </div>
    </div>
  );
}

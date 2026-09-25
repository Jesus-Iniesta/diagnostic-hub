import {
  Alert,
  Button,
  Card,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconCircleCheck } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import {
  actualizarEstadoFormularioContacto,
  actualizarEstadoFormularioRegistro,
  fetchEstadoFormularioContacto,
  fetchEstadoFormularioRegistro,
  fetchPeriodoRango,
  guardarPeriodoRango,
} from '../../lib/configuracionApi';
import type { PeriodoRango } from '../../lib/configuracionApi';
import classes from './AdminConfiguracion.module.css';

type EstadoFormulario = 'activo' | 'inactivo';

function getCurrentPeriodo(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return `${year}${month <= 6 ? 'A' : 'B'}`;
}

function useToggleCard(
  fetcher: () => Promise<{ habilitado: boolean }>,
  saver: (habilitado: boolean) => Promise<{ habilitado: boolean }>,
) {
  const [estado, setEstado] = useState<EstadoFormulario>('activo');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void fetcher()
      .then(({ habilitado }) => {
        if (mounted) setEstado(habilitado ? 'activo' : 'inactivo');
      })
      .catch(() => {
        if (mounted) setError('No se pudo consultar el estado del formulario.');
      })
      .finally(() => {
        if (mounted) setCargando(false);
      });
    return () => {
      mounted = false;
    };
  }, [fetcher]);

  const activo = estado === 'activo';

  const handleGuardar = async () => {
    setError(null);
    setGuardado(false);
    setGuardando(true);
    try {
      const { habilitado } = await saver(activo);
      setEstado(habilitado ? 'activo' : 'inactivo');
      setGuardado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los cambios');
    } finally {
      setGuardando(false);
    }
  };

  return { estado, setEstado, cargando, guardando, guardado, error, activo, handleGuardar };
}

export default function AdminConfiguracion() {
  const registro = useToggleCard(fetchEstadoFormularioRegistro, actualizarEstadoFormularioRegistro);
  const contacto = useToggleCard(fetchEstadoFormularioContacto, actualizarEstadoFormularioContacto);

  const [periodo, setPeriodo] = useState(getCurrentPeriodo());
  const [rango, setRango] = useState<PeriodoRango | null>(null);
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [cargandoRango, setCargandoRango] = useState(false);
  const [guardandoRango, setGuardandoRango] = useState(false);
  const [guardadoRango, setGuardadoRango] = useState(false);
  const [errorRango, setErrorRango] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const p = periodo.trim();
    setGuardadoRango(false);
    setErrorRango(null);
    if (!p) {
      setRango(null);
      setInicio('');
      setFin('');
      return;
    }
    setCargandoRango(true);
    fetchPeriodoRango(p)
      .then((data) => {
        if (!mounted) return;
        setRango(data);
        setInicio(data.inicio);
        setFin(data.fin);
      })
      .catch(() => {
        if (!mounted) return;
        setRango(null);
        setInicio('');
        setFin('');
      })
      .finally(() => {
        if (mounted) setCargandoRango(false);
      });
    return () => {
      mounted = false;
    };
  }, [periodo]);

  const handleGuardarRango = async () => {
    setErrorRango(null);
    setGuardadoRango(false);
    setGuardandoRango(true);
    try {
      if (!inicio || !fin) {
        throw new Error('Indica las fechas de inicio y fin del periodo.');
      }
      const data = await guardarPeriodoRango({ periodo: periodo.trim(), inicio, fin });
      setRango(data);
      setGuardadoRango(true);
    } catch (err) {
      setErrorRango(err instanceof Error ? err.message : 'No se pudieron guardar los cambios');
    } finally {
      setGuardandoRango(false);
    }
  };

  return (
    <>
      <div className={classes.welcome}>
        <Text component="h1" className={classes.welcomeTitle}>
          Configuración
        </Text>
        <Text className={classes.welcomeSubtitle}>
          Administra la disponibilidad de los formularios del sistema.
        </Text>
      </div>

      <Card className={classes.card} padding="xl" radius="lg" mt="lg">
        <Stack gap="lg">
          <div>
            <Title order={3} className={classes.title}>
              Formulario de registro de alumnos
            </Title>
            <Text className={classes.subtitle}>
              Controla si los alumnos nuevos pueden crear su cuenta en el sistema.
            </Text>
          </div>

          <div className={classes.fieldRow}>
            <Text className={classes.fieldLabel}>Estado</Text>
            <SegmentedControl
              value={registro.estado}
              onChange={(value) => registro.setEstado(value as EstadoFormulario)}
              data={[
                { label: '🟢 ACTIVO', value: 'activo' },
                { label: '⚪ INACTIVO', value: 'inactivo' },
              ]}
              size="md"
              radius="md"
              disabled={registro.cargando}
            />
          </div>

          <Text className={classes.fieldHelp}>
            {registro.activo
              ? 'Los alumnos nuevos pueden crear su cuenta desde el login.'
              : 'El formulario de registro está cerrado. Los alumnos no pueden crear cuentas nuevas.'}
          </Text>

          {registro.guardado && (
            <Alert
              color="green"
              variant="light"
              radius="md"
              icon={<IconCircleCheck size={18} aria-hidden="true" />}
            >
              Los cambios se guardaron correctamente.
            </Alert>
          )}

          {registro.error && (
            <Alert color="red" variant="light" radius="md">
              {registro.error}
            </Alert>
          )}

          <Button
            size="md"
            color="indigo"
            className={classes.submitButton}
            loading={registro.guardando}
            disabled={registro.cargando}
            onClick={registro.handleGuardar}
          >
            Guardar cambios
          </Button>
        </Stack>
      </Card>

      <Card className={classes.card} padding="xl" radius="lg" mt="lg">
        <Stack gap="lg">
          <div>
            <Title order={3} className={classes.title}>
              Formulario de datos de contacto
            </Title>
            <Text className={classes.subtitle}>
              Controla si los alumnos pueden registrar o actualizar sus datos de contacto.
            </Text>
          </div>

          <div className={classes.fieldRow}>
            <Text className={classes.fieldLabel}>Estado</Text>
            <SegmentedControl
              value={contacto.estado}
              onChange={(value) => contacto.setEstado(value as EstadoFormulario)}
              data={[
                { label: '🟢 ACTIVO', value: 'activo' },
                { label: '⚪ INACTIVO', value: 'inactivo' },
              ]}
              size="md"
              radius="md"
              disabled={contacto.cargando}
            />
          </div>

          <Text className={classes.fieldHelp}>
            {contacto.activo
              ? 'Los alumnos pueden registrar o actualizar sus datos de contacto.'
              : 'El formulario de contacto está cerrado. Los alumnos no pueden modificar sus datos.'}
          </Text>

          {contacto.guardado && (
            <Alert
              color="green"
              variant="light"
              radius="md"
              icon={<IconCircleCheck size={18} aria-hidden="true" />}
            >
              Los cambios se guardaron correctamente.
            </Alert>
          )}

          {contacto.error && (
            <Alert color="red" variant="light" radius="md">
              {contacto.error}
            </Alert>
          )}

          <Button
            size="md"
            color="indigo"
            className={classes.submitButton}
            loading={contacto.guardando}
            disabled={contacto.cargando}
            onClick={contacto.handleGuardar}
          >
            Guardar cambios
          </Button>
        </Stack>
      </Card>

      <Card className={classes.card} padding="xl" radius="lg" mt="lg">
        <Stack gap="lg">
          <div>
            <Title order={3} className={classes.title}>
              Fechas de cada periodo
            </Title>
            <Text className={classes.subtitle}>
              Define el rango de fechas (inicio y fin) en el que se toman las respuestas
              de cada periodo A/B.
            </Text>
          </div>

          <div className={classes.fieldRow}>
            <Text className={classes.fieldLabel}>Periodo</Text>
            <TextInput
              value={periodo}
              onChange={(e) => setPeriodo(e.currentTarget.value)}
              style={{ width: 140 }}
              placeholder="2026B"
            />
          </div>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <div className={classes.fieldRow}>
              <Text className={classes.fieldLabel}>Inicio</Text>
              <TextInput
                type="date"
                value={inicio}
                onChange={(e) => setInicio(e.currentTarget.value)}
                disabled={cargandoRango}
                style={{ flex: 1 }}
              />
            </div>
            <div className={classes.fieldRow}>
              <Text className={classes.fieldLabel}>Fin</Text>
              <TextInput
                type="date"
                value={fin}
                onChange={(e) => setFin(e.currentTarget.value)}
                disabled={cargandoRango}
                style={{ flex: 1 }}
              />
            </div>
          </SimpleGrid>

          <Text className={classes.fieldHelp}>
            {rango?.es_default
              ? 'Este es el rango por defecto del periodo. Se usará salvo que guardes uno personalizado.'
              : rango
                ? 'Este es un rango personalizado guardado para el periodo.'
                : 'Escribe un periodo con formato AAAA A / AAAA B (ej. 2026B).'}
          </Text>

          {guardadoRango && (
            <Alert
              color="green"
              variant="light"
              radius="md"
              icon={<IconCircleCheck size={18} aria-hidden="true" />}
            >
              Los cambios se guardaron correctamente.
            </Alert>
          )}

          {errorRango && (
            <Alert color="red" variant="light" radius="md">
              {errorRango}
            </Alert>
          )}

          <Button
            size="md"
            color="indigo"
            className={classes.submitButton}
            loading={guardandoRango}
            disabled={cargandoRango || !inicio || !fin}
            onClick={handleGuardarRango}
          >
            Guardar rango de fechas
          </Button>
        </Stack>
      </Card>
    </>
  );
}

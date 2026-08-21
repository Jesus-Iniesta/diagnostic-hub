import {
  Alert,
  Button,
  Card,
  SegmentedControl,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconCircleCheck } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import {
  actualizarEstadoFormularioContacto,
  actualizarEstadoFormularioRegistro,
  fetchEstadoFormularioContacto,
  fetchEstadoFormularioRegistro,
} from '../../lib/configuracionApi';
import classes from './AdminConfiguracion.module.css';

type EstadoFormulario = 'activo' | 'inactivo';

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
  const contacto = useToggleCard(fetchEstadoFormularioContacto, actualizarEstadoFormularioContacto);
  const registro = useToggleCard(fetchEstadoFormularioRegistro, actualizarEstadoFormularioRegistro);

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
              Formulario de datos de contacto
            </Title>
            <Text className={classes.subtitle}>
              Controla si los alumnos pueden registrar o actualizar sus datos de
              contacto.
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
              : 'Los alumnos no pueden modificar sus datos de contacto mientras el formulario esté cerrado. Los datos ya guardados se conservan.'}
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
    </>
  );
}

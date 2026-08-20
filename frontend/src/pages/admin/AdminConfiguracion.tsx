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
  fetchEstadoFormularioContacto,
} from '../../lib/configuracionApi';
import classes from './AdminConfiguracion.module.css';

type EstadoFormulario = 'activo' | 'inactivo';

export default function AdminConfiguracion() {
  const [estado, setEstado] = useState<EstadoFormulario>('activo');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void fetchEstadoFormularioContacto()
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
  }, []);

  const activo = estado === 'activo';

  const handleGuardar = async () => {
    setError(null);
    setGuardado(false);
    setGuardando(true);
    try {
      const { habilitado } = await actualizarEstadoFormularioContacto(activo);
      setEstado(habilitado ? 'activo' : 'inactivo');
      setGuardado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los cambios');
    } finally {
      setGuardando(false);
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
              value={estado}
              onChange={(value) => setEstado(value as EstadoFormulario)}
              data={[
                { label: '🟢 ACTIVO', value: 'activo' },
                { label: '⚪ INACTIVO', value: 'inactivo' },
              ]}
              size="md"
              radius="md"
              disabled={cargando}
            />
          </div>

          <Text className={classes.fieldHelp}>
            {activo
              ? 'Los alumnos pueden registrar o actualizar sus datos de contacto.'
              : 'Los alumnos no pueden modificar sus datos de contacto mientras el formulario esté cerrado. Los datos ya guardados se conservan.'}
          </Text>

          {guardado && (
            <Alert
              color="green"
              variant="light"
              radius="md"
              icon={<IconCircleCheck size={18} aria-hidden="true" />}
            >
              Los cambios se guardaron correctamente.
            </Alert>
          )}

          {error && (
            <Alert color="red" variant="light" radius="md">
              {error}
            </Alert>
          )}

          <Button
            size="md"
            color="indigo"
            className={classes.submitButton}
            loading={guardando}
            disabled={cargando}
            onClick={handleGuardar}
          >
            Guardar cambios
          </Button>
        </Stack>
      </Card>
    </>
  );
}
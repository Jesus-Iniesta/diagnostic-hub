import {
  Alert,
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Switch,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import { usePeriodo } from '../../contexts/PeriodoContext';
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
import IndiceFiSection from './IndiceFiSection';

function Guardado() {
  return (
    <Text className={classes.guardado}>
      <IconCheck size={14} aria-hidden="true" /> Guardado
    </Text>
  );
}

/** Interruptor que se guarda al cambiarlo. */
function useInterruptor(
  fetcher: () => Promise<{ habilitado: boolean }>,
  saver: (habilitado: boolean) => Promise<{ habilitado: boolean }>,
) {
  const [activo, setActivo] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void fetcher()
      .then(({ habilitado }) => {
        if (mounted) setActivo(habilitado);
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

  const cambiar = async (nuevo: boolean) => {
    const anterior = activo;
    setActivo(nuevo);
    setError(null);
    setGuardado(false);
    setGuardando(true);
    try {
      const { habilitado } = await saver(nuevo);
      setActivo(habilitado);
      setGuardado(true);
    } catch (err) {
      setActivo(anterior);
      setError(err instanceof Error ? err.message : 'No se pudo guardar el cambio');
    } finally {
      setGuardando(false);
    }
  };

  return { activo, cargando, guardando, guardado, error, cambiar };
}

function FilaInterruptor({
  titulo,
  descripcion,
  estado,
}: {
  titulo: string;
  descripcion: string;
  estado: ReturnType<typeof useInterruptor>;
}) {
  return (
    <div className={classes.filaInterruptor}>
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <div>
          <Text className={classes.fieldLabel}>{titulo}</Text>
          <Text className={classes.fieldHelp}>{descripcion}</Text>
        </div>
        <Group gap="xs" wrap="nowrap">
          {estado.guardado && <Guardado />}
          <Switch
            checked={estado.activo}
            onChange={(e) => void estado.cambiar(e.currentTarget.checked)}
            disabled={estado.cargando || estado.guardando}
            aria-label={titulo}
            size="md"
          />
        </Group>
      </Group>
      {estado.error && (
        <Text c="red" size="xs" mt={4}>
          {estado.error}
        </Text>
      )}
    </div>
  );
}

function PestanaGeneral() {
  const registro = useInterruptor(fetchEstadoFormularioRegistro, actualizarEstadoFormularioRegistro);
  const contacto = useInterruptor(fetchEstadoFormularioContacto, actualizarEstadoFormularioContacto);

  const { periodo } = usePeriodo();
  const [rango, setRango] = useState<PeriodoRango | null>(null);
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [cargandoRango, setCargandoRango] = useState(false);
  const [guardandoRango, setGuardandoRango] = useState(false);
  const [guardadoRango, setGuardadoRango] = useState(false);
  const [errorRango, setErrorRango] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setGuardadoRango(false);
    setErrorRango(null);
    setCargandoRango(true);
    fetchPeriodoRango(periodo)
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
      const data = await guardarPeriodoRango({ periodo, inicio, fin });
      setRango(data);
      setGuardadoRango(true);
    } catch (err) {
      setErrorRango(err instanceof Error ? err.message : 'No se pudieron guardar los cambios');
    } finally {
      setGuardandoRango(false);
    }
  };

  return (
    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
      <Card className={classes.card} padding="lg" radius="lg">
        <Title order={4} className={classes.title}>
          Formularios
        </Title>
        <Stack gap={0} mt="xs">
          <FilaInterruptor
            titulo="Registro de alumnos"
            descripcion={
              registro.activo
                ? 'Abierto: los alumnos nuevos pueden crear su cuenta.'
                : 'Cerrado: no se pueden crear cuentas nuevas.'
            }
            estado={registro}
          />
          <FilaInterruptor
            titulo="Datos de contacto"
            descripcion={
              contacto.activo
                ? 'Abierto: los alumnos pueden registrar o actualizar sus datos.'
                : 'Cerrado: los alumnos no pueden modificar sus datos.'
            }
            estado={contacto}
          />
        </Stack>
      </Card>

      <Card className={classes.card} padding="lg" radius="lg">
        <Title order={4} className={classes.title}>
          Fechas del periodo {periodo}
        </Title>
        <Text className={classes.fieldHelp} mt={2}>
          Rango en el que se toman las respuestas del periodo.{' '}
          {rango?.es_default
            ? 'Es el rango por defecto; se usa salvo que guardes otro.'
            : rango
              ? 'Es un rango personalizado.'
              : ''}
        </Text>
        <Group align="flex-end" gap="sm" mt="sm" wrap="wrap">
          <TextInput
            label="Inicio"
            type="date"
            value={inicio}
            onChange={(e) => {
              setGuardadoRango(false);
              setInicio(e.currentTarget.value);
            }}
            disabled={cargandoRango}
            size="sm"
          />
          <TextInput
            label="Fin"
            type="date"
            value={fin}
            onChange={(e) => {
              setGuardadoRango(false);
              setFin(e.currentTarget.value);
            }}
            disabled={cargandoRango}
            size="sm"
          />
          <Button
            color="indigo"
            size="sm"
            loading={guardandoRango}
            disabled={cargandoRango || !inicio || !fin}
            onClick={handleGuardarRango}
          >
            Guardar fechas
          </Button>
          {guardadoRango && <Guardado />}
        </Group>
        {errorRango && (
          <Alert color="red" variant="light" radius="md" mt="sm" py="xs">
            {errorRango}
          </Alert>
        )}
      </Card>
    </SimpleGrid>
  );
}

export default function AdminConfiguracion() {
  return (
    <>
      <div className={classes.welcome}>
        <Text component="h1" className={classes.welcomeTitle}>
          Configuración
        </Text>
        <Text className={classes.welcomeSubtitle}>
          Formularios, fechas del periodo e Índice FI UAEMex.
        </Text>
      </div>

      <Tabs defaultValue="general" mt="md" keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab value="general">General</Tabs.Tab>
          <Tabs.Tab value="indice">Índice FI UAEMex</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="general" pt="md">
          <PestanaGeneral />
        </Tabs.Panel>
        <Tabs.Panel value="indice" pt="md">
          <IndiceFiSection />
        </Tabs.Panel>
      </Tabs>
    </>
  );
}

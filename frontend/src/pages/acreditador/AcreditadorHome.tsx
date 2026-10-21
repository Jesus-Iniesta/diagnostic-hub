import {
  Alert,
  Button,
  Card,
  Group,
  Loader,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconDownload } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import CategoriasBarra from '../../components/CategoriasBarra/CategoriasBarra';
import { fmtIndice } from '../../lib/categorias';
import {
  descargarCreani,
  fetchPeriodosReporte,
  fetchResumenCreani,
} from '../../lib/reportesApi';
import type { ResumenCreani, ResumenGrupoCreani } from '../../lib/reportesApi';
import classes from './AcreditadorHome.module.css';

function notaPendientes(n: number): string {
  return n === 1 ? '1 alumno tiene exámenes pendientes.' : `${n} alumnos tienen exámenes pendientes.`;
}

/** Alumnos, Índice FI promedio, barra de categorías y, en chico, quién hizo cada examen. */
function Datos({ datos, maximo }: { datos: ResumenGrupoCreani; maximo: number }) {
  return (
    <Stack gap="sm">
      <Group gap="xl" wrap="nowrap">
        <div>
          <Text className={classes.label}>Alumnos</Text>
          <Text className={classes.valor}>{datos.alumnos}</Text>
        </div>
        <div>
          <Text className={classes.label}>Índice FI promedio</Text>
          <Text className={classes.valor}>{fmtIndice(datos.indice_promedio, maximo)}</Text>
        </div>
      </Group>
      <CategoriasBarra categorias={datos.categorias} />
      <Text size="xs" c="dimmed">
        Los exámenes no presentados cuentan como 0. {notaPendientes(datos.pendientes)}
      </Text>
      <Text size="xs" c="dimmed">
        Hicieron examen diagnóstico: {datos.diagnostico} · examen final: {datos.final} ·
        WebAssign: {datos.webassign}
      </Text>
    </Stack>
  );
}

export default function AcreditadorHome() {
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [periodo, setPeriodo] = useState<string | null>(null);
  const [resumen, setResumen] = useState<ResumenCreani | null>(null);
  const [cargandoPeriodos, setCargandoPeriodos] = useState(true);
  const [cargando, setCargando] = useState(false);
  // 'todo' o la clave de la carrera que se está descargando.
  const [descargando, setDescargando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchPeriodosReporte()
      .then((data) => {
        if (!mounted) return;
        setPeriodos(data);
        if (data.length > 0) setPeriodo(data[0]);
      })
      .catch((err: unknown) => {
        if (mounted) {
          setError(
            `No se pudieron cargar los periodos: ${err instanceof Error ? err.message : 'error desconocido'}`,
          );
        }
      })
      .finally(() => {
        if (mounted) setCargandoPeriodos(false);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!periodo) return;
    let mounted = true;
    setCargando(true);
    fetchResumenCreani(periodo)
      .then((data) => {
        if (mounted) setResumen(data);
      })
      .catch((err: unknown) => {
        if (mounted) {
          setResumen(null);
          setError(
            `No se pudo cargar el resumen: ${err instanceof Error ? err.message : 'error desconocido'}`,
          );
        }
      })
      .finally(() => {
        if (mounted) setCargando(false);
      });
    return () => { mounted = false; };
  }, [periodo]);

  const handleDescargar = async (licenciatura?: string) => {
    if (!periodo) return;
    setDescargando(licenciatura ?? 'todo');
    setError(null);
    try {
      await descargarCreani(periodo, licenciatura);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al descargar el reporte');
    } finally {
      setDescargando(null);
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" wrap="wrap">
        <div>
          <Title order={2}>Resumen del semestre{periodo ? ` · ${periodo}` : ''}</Title>
          <Text c="dimmed" size="sm">
            Resultados por carrera y descarga del reporte en Excel.
          </Text>
        </div>
        <Select
          label="Periodo"
          placeholder="Selecciona periodo"
          data={periodos}
          value={periodo}
          onChange={setPeriodo}
          disabled={cargandoPeriodos}
          allowDeselect={false}
          w={160}
          nothingFoundMessage="No hay periodos con resultados cargados"
        />
      </Group>

      {error && (
        <Alert color="red" icon={<IconAlertCircle size={18} />} withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!cargandoPeriodos && !error && periodos.length === 0 && (
        <Alert color="yellow" icon={<IconAlertCircle size={18} />}>
          Aún no hay resultados cargados, por lo que no hay periodos para reportar.
        </Alert>
      )}

      {cargando && (
        <Group justify="center" py="xl">
          <Loader size="sm" />
        </Group>
      )}

      {resumen && !cargando && (
        <>
          <Card withBorder p="lg" radius="lg">
            <Group justify="space-between" align="flex-start" wrap="wrap" mb="sm">
              <Title order={4}>Todas las carreras</Title>
              <Button
                leftSection={<IconDownload size={18} />}
                onClick={() => handleDescargar()}
                loading={descargando === 'todo'}
              >
                Descargar Excel completo
              </Button>
            </Group>
            <Datos datos={resumen.total} maximo={resumen.maximo} />
          </Card>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            {resumen.carreras.map((c) => (
              <Card key={c.clave || 'sin'} withBorder p="lg" radius="lg" className={classes.carrera}>
                <div>
                  <Text fw={700} size="lg">{c.clave || 'Sin ingeniería'}</Text>
                  <Text size="xs" c="dimmed" lineClamp={1} title={c.nombre}>
                    {c.clave ? c.nombre : 'Alumnos sin carrera registrada'}
                  </Text>
                </div>
                <div className={classes.datosCarrera}>
                  <Datos datos={c} maximo={resumen.maximo} />
                </div>
                {c.clave ? (
                  <Button
                    variant="light"
                    size="xs"
                    leftSection={<IconDownload size={15} />}
                    onClick={() => handleDescargar(c.clave)}
                    loading={descargando === c.clave}
                  >
                    Descargar Excel
                  </Button>
                ) : (
                  <Text size="xs" c="dimmed" ta="center">Incluidos en el Excel completo</Text>
                )}
              </Card>
            ))}
          </SimpleGrid>
        </>
      )}
    </Stack>
  );
}

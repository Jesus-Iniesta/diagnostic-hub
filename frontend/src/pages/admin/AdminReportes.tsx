import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconDownload, IconReport, IconUserSearch } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import { API_BASE_URL } from '../../config';
import { usePeriodo } from '../../contexts/PeriodoContext';
import { descargarAlumnosPorRevisar } from '../../lib/alumnosAdminApi';
import { apiFetch } from '../../lib/api';
import classes from './AdminCargaAlumnos.module.css';

interface StatsResponse {
  periodo: string;
  diagnosticos: number;
  webassign: number;
  webassign_por_carrera: Record<string, number>;
}

function bajar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminReportes() {
  const { periodo } = usePeriodo();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [descargandoRevisar, setDescargandoRevisar] = useState(false);
  const [avisoRevisar, setAvisoRevisar] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoadingStats(true);
    setStats(null);
    setAvisoRevisar(null);
    apiFetch<StatsResponse>(`${API_BASE_URL}/reportes/stats?periodo=${encodeURIComponent(periodo)}`)
      .then((data) => {
        if (mounted) setStats(data);
      })
      .catch((err: unknown) => {
        if (mounted) {
          setError(
            `No se pudieron cargar las estadísticas: ${err instanceof Error ? err.message : 'error desconocido'}`,
          );
        }
      })
      .finally(() => {
        if (mounted) setLoadingStats(false);
      });
    return () => {
      mounted = false;
    };
  }, [periodo]);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/reportes/excel?periodo=${encodeURIComponent(periodo)}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Error ${res.status} al descargar el reporte`);
      bajar(await res.blob(), `reporte_${periodo}.xlsx`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al descargar el reporte');
    } finally {
      setDownloading(false);
    }
  };

  const handleDescargarRevisar = async () => {
    setDescargandoRevisar(true);
    setAvisoRevisar(null);
    setError(null);
    try {
      const blob = await descargarAlumnosPorRevisar(periodo);
      if (!blob) {
        setAvisoRevisar(`No hay alumnos por revisar en el periodo ${periodo}.`);
        return;
      }
      bajar(blob, `alumnos_por_revisar_${periodo}.xlsx`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al descargar el Excel de alumnos por revisar');
    } finally {
      setDescargandoRevisar(false);
    }
  };

  const sinResultados = stats !== null && stats.diagnosticos === 0 && stats.webassign === 0;

  return (
    <>
      <div className={classes.welcome}>
        <Text component="h1" className={classes.welcomeTitle}>
          Reportes · {periodo}
        </Text>
        <Text className={classes.welcomeSubtitle}>Descarga los reportes en Excel del periodo.</Text>
      </div>

      <Stack gap="xl" mt="lg">
        {error && (
          <Alert color="red" icon={<IconAlertCircle size={18} />} withCloseButton onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Card withBorder p="xl" radius="lg">
          <Stack gap="md">
            <Group justify="space-between" align="flex-start" wrap="wrap">
              <div>
                <Group gap="sm">
                  <IconReport size={20} color="var(--mantine-color-indigo-6)" />
                  <Title order={4}>Reporte CREANI</Title>
                </Group>
                <Text size="sm" c="dimmed" mt={4}>
                  Resultados de cada alumno del periodo: examen diagnóstico, examen final y WebAssign, con una hoja de
                  resumen y una por licenciatura.
                </Text>
              </div>
              <Button leftSection={<IconDownload size={18} />} onClick={handleDownload} loading={downloading}>
                Descargar CREANI
              </Button>
            </Group>

            {loadingStats && (
              <Group justify="center">
                <Loader size="sm" />
              </Group>
            )}

            {sinResultados && (
              <Alert color="yellow" icon={<IconAlertCircle size={18} />}>
                Aún no hay resultados del examen final ni de WebAssign en {periodo}.
              </Alert>
            )}

            {stats && !loadingStats && !sinResultados && (
              <>
                <SimpleGrid cols={{ base: 2, sm: 3 }}>
                  <div>
                    <Text size="xs" c="dimmed">Exámenes finales</Text>
                    <Text fw={700} size="xl">{stats.diagnosticos}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">WebAssign</Text>
                    <Text fw={700} size="xl">{stats.webassign}</Text>
                  </div>
                </SimpleGrid>
                {Object.keys(stats.webassign_por_carrera).length > 0 && (
                  <SimpleGrid cols={{ base: 3, sm: 6 }}>
                    {Object.entries(stats.webassign_por_carrera).map(([carrera, count]) => (
                      <div key={carrera}>
                        <Badge variant="light" size="lg">{carrera}</Badge>
                        <Text fw={600} size="lg" ta="center">{count}</Text>
                      </div>
                    ))}
                  </SimpleGrid>
                )}
              </>
            )}
          </Stack>
        </Card>

        <Card withBorder p="xl" radius="lg">
          <Stack gap="md">
            <Group justify="space-between" align="flex-start" wrap="wrap">
              <div>
                <Group gap="sm">
                  <IconUserSearch size={20} color="var(--mantine-color-indigo-6)" />
                  <Title order={4}>Alumnos por revisar</Title>
                </Group>
                <Text size="sm" c="dimmed" mt={4}>
                  Una hoja por caso: posibles duplicados, alumnos sin número de cuenta, sin ingeniería y filas de
                  exámenes que no se pudieron registrar.
                </Text>
              </div>
              <Button
                variant="light"
                leftSection={<IconDownload size={18} />}
                onClick={handleDescargarRevisar}
                loading={descargandoRevisar}
              >
                Descargar Excel
              </Button>
            </Group>
            {avisoRevisar && (
              <Alert color="green" icon={<IconAlertCircle size={18} />} withCloseButton onClose={() => setAvisoRevisar(null)}>
                {avisoRevisar}
              </Alert>
            )}
          </Stack>
        </Card>
      </Stack>
    </>
  );
}

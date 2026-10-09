import {
  Alert,
  Badge,
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
import { IconAlertCircle, IconDownload, IconReport } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import { API_BASE_URL } from '../../config';
import { apiFetch } from '../../lib/api';

interface PeriodosResponse {
  periodos: string[];
}

interface StatsResponse {
  periodo: string;
  diagnosticos: number;
  webassign: number;
  webassign_por_carrera: Record<string, number>;
}

export default function AdminReportes() {
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [periodo, setPeriodo] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loadingPeriodos, setLoadingPeriodos] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    apiFetch<PeriodosResponse>(`${API_BASE_URL}/reportes/periodos`)
      .then((data) => {
        if (mounted) {
          setPeriodos(data.periodos);
          if (data.periodos.length > 0) setPeriodo(data.periodos[0]);
        }
      })
      .catch((err: unknown) => {
        if (mounted) {
          setError(
            `No se pudieron cargar los periodos: ${err instanceof Error ? err.message : 'error desconocido'}`,
          );
        }
      })
      .finally(() => {
        if (mounted) setLoadingPeriodos(false);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!periodo) return;
    let mounted = true;
    setLoadingStats(true);
    apiFetch<StatsResponse>(`${API_BASE_URL}/reportes/stats?periodo=${encodeURIComponent(periodo)}`)
      .then((data) => {
        if (mounted) setStats(data);
      })
      .catch((err: unknown) => {
        if (mounted) {
          setStats(null);
          setError(
            `No se pudieron cargar las estadísticas: ${err instanceof Error ? err.message : 'error desconocido'}`,
          );
        }
      })
      .finally(() => {
        if (mounted) setLoadingStats(false);
      });
    return () => { mounted = false; };
  }, [periodo]);

  const handleDownload = async () => {
    if (!periodo) return;
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/reportes/excel?periodo=${encodeURIComponent(periodo)}`,
        { credentials: 'include' },
      );
      if (!res.ok) throw new Error(`Error ${res.status} al descargar el reporte`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_${periodo}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al descargar el reporte');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Stack gap="xl">
      <Title order={2}>Reportes</Title>
      <Text c="dimmed">
        Visualiza los resultados consolidados y descarga el reporte en Excel.
      </Text>

      <Card withBorder p="xl">
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <Select
              label="Periodo"
              placeholder="Selecciona periodo"
              data={periodos.map((p) => ({ value: p, label: p }))}
              value={periodo}
              onChange={setPeriodo}
              disabled={loadingPeriodos}
              nothingFoundMessage="No hay periodos con resultados cargados"
            />
            <div />
            <Group align="flex-end">
              <Button
                leftSection={<IconDownload size={18} />}
                onClick={handleDownload}
                loading={downloading}
                disabled={!periodo}
                size="lg"
              >
                Descargar Excel
              </Button>
            </Group>
          </SimpleGrid>
        </Stack>
      </Card>

      {error && (
        <Alert color="red" icon={<IconAlertCircle size={18} />} withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!loadingPeriodos && !error && periodos.length === 0 && (
        <Alert color="yellow" icon={<IconAlertCircle size={18} />}>
          Aún no hay resultados de diagnóstico ni de WebAssign cargados, por lo que no hay periodos para reportar.
        </Alert>
      )}

      {loadingStats && (
        <Card withBorder p="xl">
          <Group justify="center">
            <Loader size="sm" />
          </Group>
        </Card>
      )}

      {stats && !loadingStats && (
        <Card withBorder p="xl">
          <Stack gap="md">
            <Group gap="sm">
              <IconReport size={20} color="var(--mantine-color-indigo-6)" />
              <Title order={4}>Resumen del periodo {stats.periodo}</Title>
            </Group>

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
              <>
                <Text fw={600} size="sm" mt="sm">WebAssign por carrera</Text>
                <SimpleGrid cols={{ base: 3, sm: 6 }}>
                  {Object.entries(stats.webassign_por_carrera).map(([carrera, count]) => (
                    <div key={carrera}>
                      <Badge variant="light" size="lg">{carrera}</Badge>
                      <Text fw={600} size="lg" ta="center">{count}</Text>
                    </div>
                  ))}
                </SimpleGrid>
              </>
            )}
          </Stack>
        </Card>
      )}
    </Stack>
  );
}

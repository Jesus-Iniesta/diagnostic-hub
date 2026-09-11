import {
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
import { IconDownload, IconReport } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import { API_BASE_URL } from '../../config';

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

  useEffect(() => {
    let mounted = true;
    void fetch(`${API_BASE_URL}/reportes/periodos`, { credentials: 'include' })
      .then((r) => r.json() as Promise<PeriodosResponse>)
      .then((data) => {
        if (mounted) {
          setPeriodos(data.periodos);
          if (data.periodos.length > 0) setPeriodo(data.periodos[0]);
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
    void fetch(`${API_BASE_URL}/reportes/stats?periodo=${encodeURIComponent(periodo)}`, {
      credentials: 'include',
    })
      .then((r) => r.json() as Promise<StatsResponse>)
      .then((data) => {
        if (mounted) setStats(data);
      })
      .finally(() => {
        if (mounted) setLoadingStats(false);
      });
    return () => { mounted = false; };
  }, [periodo]);

  const handleDownload = async () => {
    if (!periodo) return;
    setDownloading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/reportes/excel?periodo=${encodeURIComponent(periodo)}`,
        { credentials: 'include' },
      );
      if (!res.ok) throw new Error('Error al descargar');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_${periodo}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
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
                <Text size="xs" c="dimmed">Diagnósticos</Text>
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

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

interface LicenciaturaStats {
  clave: string;
  nombre: string;
  diagnosticos: number;
  webassign: number;
}

interface StatsResponse {
  periodo: string;
  diagnosticos: number;
  webassign: number;
  webassign_por_carrera: Record<string, number>;
  por_licenciatura: LicenciaturaStats[];
}

export default function AcreditadorHome() {
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [periodo, setPeriodo] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loadingPeriodos, setLoadingPeriodos] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [downloadingClave, setDownloadingClave] = useState<string | null>(null);

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
      .catch(() => {
        if (mounted) setStats(null);
      })
      .finally(() => {
        if (mounted) setLoadingStats(false);
      });
    return () => { mounted = false; };
  }, [periodo]);

  const handleDownload = async (licenciatura?: string) => {
    if (!periodo) return;
    setDownloadingClave(licenciatura ?? 'all');
    try {
      const params = new URLSearchParams({ periodo });
      if (licenciatura) params.set('licenciatura', licenciatura);
      const res = await fetch(`${API_BASE_URL}/reportes/excel?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error al descargar');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = licenciatura
        ? `reporte_${licenciatura}_${periodo}.xlsx`
        : `reporte_${periodo}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    } finally {
      setDownloadingClave(null);
    }
  };

  return (
    <Stack gap="xl">
      <Title order={2}>Acreditador</Title>
      <Text c="dimmed">
        Resumen del semestre separado por licenciatura, y descarga del reporte en Excel.
      </Text>

        <Card withBorder p="xl">
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Select
              label="Periodo"
              placeholder="Selecciona periodo"
              data={periodos.map((p) => ({ value: p, label: p }))}
              value={periodo}
              onChange={setPeriodo}
              disabled={loadingPeriodos}
            />
            <Group align="flex-end">
              <Button
                leftSection={<IconDownload size={18} />}
                onClick={() => handleDownload()}
                loading={downloadingClave === 'all'}
                disabled={!periodo}
                size="lg"
              >
                Descargar Excel completo
              </Button>
            </Group>
          </SimpleGrid>
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
                <Title order={4}>Resumen por licenciatura - {stats.periodo}</Title>
              </Group>

              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                {stats.por_licenciatura.map((lic) => (
                  <Card
                    key={lic.clave}
                    withBorder
                    p="md"
                    shadow="sm"
                  >
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text fw={700} size="lg">{lic.clave}</Text>
                        <Badge variant="light" color="indigo">{lic.nombre}</Badge>
                      </Group>
                      <SimpleGrid cols={2}>
                        <div>
                          <Text size="xs" c="dimmed">Diagnósticos</Text>
                          <Text fw={700} size="xl">{lic.diagnosticos}</Text>
                        </div>
                        <div>
                          <Text size="xs" c="dimmed">WebAssign</Text>
                          <Text fw={700} size="xl">{lic.webassign}</Text>
                        </div>
                      </SimpleGrid>
                      <Button
                        variant="light"
                        size="xs"
                        leftSection={<IconDownload size={15} />}
                        onClick={() => handleDownload(lic.clave)}
                        loading={downloadingClave === lic.clave}
                        disabled={!periodo}
                      >
                        Excel
                      </Button>
                    </Stack>
                  </Card>
                ))}
              </SimpleGrid>
            </Stack>
          </Card>
        )}
    </Stack>
  );
}
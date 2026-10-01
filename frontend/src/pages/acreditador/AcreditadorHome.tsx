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

  const handleDownload = async (licenciatura?: string) => {
    if (!periodo) return;
    setDownloadingClave(licenciatura ?? 'all');
    setError(null);
    try {
      const params = new URLSearchParams({ periodo });
      if (licenciatura) params.set('licenciatura', licenciatura);
      const res = await fetch(`${API_BASE_URL}/reportes/excel?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Error ${res.status} al descargar el reporte`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = licenciatura
        ? `reporte_${licenciatura}_${periodo}.xlsx`
        : `reporte_${periodo}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al descargar el reporte');
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
              nothingFoundMessage="No hay periodos con resultados cargados"
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
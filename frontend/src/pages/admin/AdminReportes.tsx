import {
  Alert,
  Button,
  Card,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconArrowRight,
  IconCircleCheck,
  IconDownload,
  IconReport,
  IconUserSearch,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { usePeriodo } from '../../contexts/PeriodoContext';
import { descargarAlumnosPorRevisar } from '../../lib/alumnosAdminApi';
import { fmtIndice } from '../../lib/categorias';
import { descargarCreani, fetchResumenCreani } from '../../lib/reportesApi';
import type { ResumenCreani } from '../../lib/reportesApi';
import classes from './AdminCargaAlumnos.module.css';

function bajar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

function alumnos(n: number): string {
  return `${n} alumno${n !== 1 ? 's' : ''}`;
}

export default function AdminReportes() {
  const { periodo } = usePeriodo();
  const navigate = useNavigate();
  const [resumen, setResumen] = useState<ResumenCreani | null>(null);
  const [cargando, setCargando] = useState(false);
  // 'todo' o la clave de la carrera que se está descargando.
  const [descargando, setDescargando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [descargandoRevisar, setDescargandoRevisar] = useState(false);
  const [avisoRevisar, setAvisoRevisar] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setCargando(true);
    setResumen(null);
    setAvisoRevisar(null);
    fetchResumenCreani(periodo)
      .then((data) => {
        if (mounted) setResumen(data);
      })
      .catch((err: unknown) => {
        if (mounted) {
          setError(
            `No se pudo cargar el resumen del CREANI: ${err instanceof Error ? err.message : 'error desconocido'}`,
          );
        }
      })
      .finally(() => {
        if (mounted) setCargando(false);
      });
    return () => {
      mounted = false;
    };
  }, [periodo]);

  const handleDescargar = async (licenciatura?: string) => {
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

  const total = resumen?.total;
  const duplicados = resumen?.posibles_duplicados ?? 0;

  return (
    <>
      <div className={classes.welcome}>
        <Text component="h1" className={classes.welcomeTitle}>
          Reportes · {periodo}
        </Text>
        <Text className={classes.welcomeSubtitle}>Descarga los reportes en Excel del periodo.</Text>
      </div>

      <Stack gap="lg" mt="lg">
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
                  <Title order={4}>CREANI {periodo}</Title>
                </Group>
                <Text size="sm" c="dimmed" mt={4}>
                  Resultados de cada alumno: examen diagnóstico, examen final, WebAssign e Índice FI
                  UAEMex, con una hoja de resumen y una por carrera.
                </Text>
              </div>
              <Button
                leftSection={<IconDownload size={18} />}
                onClick={() => handleDescargar()}
                loading={descargando === 'todo'}
              >
                Descargar CREANI completo
              </Button>
            </Group>

            {cargando && (
              <Group justify="center" py="md">
                <Loader size="sm" />
              </Group>
            )}

            {resumen && total && (
              <>
                {duplicados > 0 ? (
                  <Alert color="orange" variant="light" icon={<IconAlertTriangle size={18} />} py="xs">
                    <Group justify="space-between" wrap="wrap" gap="xs">
                      <Text size="sm">
                        Hay {duplicados} posible{duplicados !== 1 ? 's' : ''} duplicado
                        {duplicados !== 1 ? 's' : ''} por revisar antes de descargar. Puedes
                        descargar igual.
                      </Text>
                      <Button
                        size="xs"
                        color="orange"
                        variant="light"
                        rightSection={<IconArrowRight size={14} />}
                        onClick={() => navigate('/admin/alumnos?filtro=duplicados')}
                      >
                        Revisar
                      </Button>
                    </Group>
                  </Alert>
                ) : (
                  <Alert color="green" variant="light" icon={<IconCircleCheck size={18} />} py="xs">
                    Listo para descargar.
                  </Alert>
                )}

                {total.alumnos === 0 ? (
                  <Text size="sm" c="dimmed">
                    Aún no hay alumnos con resultados en {periodo}.
                  </Text>
                ) : (
                  <>
                    <Text size="sm">
                      Incluye <b>{alumnos(total.alumnos)}</b>: {total.completos} con todos sus
                      exámenes y {total.pendientes} con alguno pendiente.
                    </Text>

                    <Table.ScrollContainer minWidth={760}>
                      <Table striped highlightOnHover verticalSpacing="xs">
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Carrera</Table.Th>
                            <Table.Th ta="right">Alumnos</Table.Th>
                            <Table.Th ta="right">Examen diagnóstico</Table.Th>
                            <Table.Th ta="right">Examen final</Table.Th>
                            <Table.Th ta="right">WebAssign</Table.Th>
                            <Table.Th ta="right">Índice FI promedio</Table.Th>
                            <Table.Th />
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {resumen.carreras.map((c) => (
                            <Table.Tr key={c.clave || 'sin'}>
                              <Table.Td>
                                <Text size="sm" fw={600}>{c.clave || '—'}</Text>
                                <Text size="xs" c="dimmed">{c.nombre}</Text>
                              </Table.Td>
                              <Table.Td ta="right">{c.alumnos}</Table.Td>
                              <Table.Td ta="right">{c.diagnostico}</Table.Td>
                              <Table.Td ta="right">{c.final}</Table.Td>
                              <Table.Td ta="right">{c.webassign}</Table.Td>
                              <Table.Td ta="right" style={{ whiteSpace: 'nowrap' }}>
                                {fmtIndice(c.indice_promedio, resumen.maximo)}
                              </Table.Td>
                              <Table.Td ta="right">
                                {c.clave ? (
                                  <Button
                                    variant="subtle"
                                    size="xs"
                                    leftSection={<IconDownload size={14} />}
                                    onClick={() => handleDescargar(c.clave)}
                                    loading={descargando === c.clave}
                                  >
                                    Descargar solo esta carrera
                                  </Button>
                                ) : (
                                  <Text size="xs" c="dimmed">Solo en el completo</Text>
                                )}
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </Table.ScrollContainer>
                    <Text size="xs" c="dimmed">
                      Cada columna de examen dice cuántos alumnos lo hicieron. El Índice FI promedio
                      es de los alumnos con al menos un examen. Los exámenes no presentados cuentan
                      como 0.{' '}
                      {total.pendientes === 1
                        ? '1 alumno tiene exámenes pendientes.'
                        : `${total.pendientes} alumnos tienen exámenes pendientes.`}
                    </Text>
                  </>
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
                  Lista para contactar por Teams a los alumnos con datos incompletos o posibles
                  duplicados.
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

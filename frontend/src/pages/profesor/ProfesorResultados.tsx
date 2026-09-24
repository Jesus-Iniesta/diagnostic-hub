import {
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import {
  IconArrowRight,
  IconSearch,
  IconUsersGroup,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { fetchMisGrupos, fetchAlumnosGrupo, fetchEstadisticasGrupo } from '../../lib/profesorApi';
import { dashboardColors } from '../../theme/theme';
import type { Grupo, GrupoAlumno, GrupoEstadisticas } from '../../types/profesor';
import classes from './ProfesorResultados.module.css';

const NIVELES = ['Todos', 'Alto', 'Bueno', 'Medio', 'Bajo', 'Muy bajo'];

const NIVEL_COLORS: Record<string, string> = {
  Alto: dashboardColors.green,
  Bueno: 'teal',
  Medio: dashboardColors.orange,
  Bajo: '#fd7e14',
  'Muy bajo': dashboardColors.red,
};

const ScoreRanges = ['0-2', '2-4', '4-6', '6-8', '8-10'];
const RangeColors = ['#98A2B3', '#fd7e14', dashboardColors.orange, dashboardColors.blue, dashboardColors.green];

function HistogramTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { rango: string; cantidad: number } }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#fff', padding: '8px 12px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
      <Text size="sm" fw={600}>Puntaje {d.rango}</Text>
      <Text size="xs" c="dimmed">{d.cantidad} alumnos</Text>
    </div>
  );
}

function IngenieriaTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { ingenieria: string; cantidad: number } }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#fff', padding: '8px 12px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
      <Text size="sm" fw={600}>{d.ingenieria}</Text>
      <Text size="xs" c="dimmed">{d.cantidad} alumnos</Text>
    </div>
  );
}

export default function ProfesorResultados() {
  const navigate = useNavigate();
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [grupoId, setGrupoId] = useState<string | null>(null);
  const [alumnos, setAlumnos] = useState<GrupoAlumno[]>([]);
  const [estadisticas, setEstadisticas] = useState<GrupoEstadisticas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoAlumnos, setCargandoAlumnos] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [nivel, setNivel] = useState<string>('Todos');
  const [seleccionado, setSeleccionado] = useState<GrupoAlumno | null>(null);

  useEffect(() => {
    let mounted = true;
    void fetchMisGrupos().then((data) => {
      if (mounted) {
        setGrupos(data);
        setCargando(false);
        if (data.length > 0) {
          setGrupoId(String(data[0].id));
        }
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!grupoId) return;
    let mounted = true;
    setCargandoAlumnos(true);
    void Promise.all([
      fetchAlumnosGrupo(Number(grupoId), '2026B'),
      fetchEstadisticasGrupo(Number(grupoId), '2026B').catch(() => null),
    ]).then(([alumnosData, stats]) => {
      if (mounted) {
        setAlumnos(alumnosData);
        setEstadisticas(stats);
        setCargandoAlumnos(false);
        setSeleccionado(null);
      }
    });
    return () => {
      mounted = false;
    };
  }, [grupoId]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return alumnos.filter((alumno) => {
      const coincideNivel = nivel === 'Todos' || alumno.nivel === nivel;
      const coincideBusqueda =
        !q ||
        alumno.nombre.toLowerCase().includes(q) ||
        alumno.numero_cuenta.includes(q);
      return coincideNivel && coincideBusqueda;
    });
  }, [alumnos, busqueda, nivel]);

  // Build histogram data from alumno scores
  const histogramData = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    for (const a of alumnos) {
      if (a.puntaje == null) continue;
      if (a.puntaje < 2) counts[0]++;
      else if (a.puntaje < 4) counts[1]++;
      else if (a.puntaje < 6) counts[2]++;
      else if (a.puntaje < 8) counts[3]++;
      else counts[4]++;
    }
    return ScoreRanges.map((rango, i) => ({ rango, cantidad: counts[i] }));
  }, [alumnos]);

  const sinGrupo = !cargando && grupos.length === 0;

  return (
    <>
      <div className={classes.welcome}>
        <Text component="h1" className={classes.welcomeTitle}>
          Resultados
        </Text>
        <Text className={classes.welcomeSubtitle}>
          Consulta los resultados de los alumnos de tus grupos.
        </Text>
      </div>

      {sinGrupo ? (
        <Card className={classes.card} padding="xl" radius="lg" mt="lg">
          <Stack gap="sm" align="flex-start">
            <span className={classes.emptyIcon}>
              <IconUsersGroup size={28} aria-hidden="true" />
            </span>
            <Title order={3} className={classes.cardTitle}>
              Aun no tienes un grupo
            </Title>
            <Text className={classes.cardText}>
              Crea un grupo y agrega alumnos para consultar sus resultados.
            </Text>
            <Button
              size="md"
              color="indigo"
              className={classes.actionButton}
              rightSection={<IconArrowRight size={18} aria-hidden="true" />}
              onClick={() => navigate('/profesor/grupo')}
            >
              Ir a Mis grupos
            </Button>
          </Stack>
        </Card>
      ) : (
        <>
          {/* Charts section */}
          {estadisticas && estadisticas.evaluados > 0 && (
            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg" mt="lg">
              {/* Histograma de puntajes */}
              <Card className={classes.card} padding="xl" radius="lg">
                <Title order={4} className={classes.cardTitle} mb="md">
                  Distribucion de puntajes
                </Title>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={histogramData}
                    margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
                    barCategoryGap="15%"
                  >
                    <CartesianGrid vertical={false} strokeDasharray="5 5" stroke="#E8EAF0" />
                    <XAxis
                      dataKey="rango"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#667085', fontSize: 12, fontWeight: 600 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#98A2B3', fontSize: 12 }}
                      width={40}
                    />
                    <Tooltip content={<HistogramTooltip />} cursor={{ fill: 'rgba(16,24,40,0.04)' }} />
                    <Bar dataKey="cantidad" radius={[8, 8, 0, 0]} barSize={48}>
                      {histogramData.map((entry, index) => (
                        <Cell key={entry.rango} fill={RangeColors[index]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Alumnos por ingenieria */}
              <Card className={classes.card} padding="xl" radius="lg">
                <Title order={4} className={classes.cardTitle} mb="md">
                  Alumnos por ingenieria
                </Title>
                {estadisticas.distribucion_ingenieria.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={estadisticas.distribucion_ingenieria}
                      margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
                      barCategoryGap="20%"
                    >
                      <CartesianGrid vertical={false} strokeDasharray="5 5" stroke="#E8EAF0" />
                      <XAxis
                        dataKey="ingenieria"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#667085', fontSize: 12, fontWeight: 600 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#98A2B3', fontSize: 12 }}
                        width={40}
                      />
                      <Tooltip content={<IngenieriaTooltip />} cursor={{ fill: 'rgba(16,24,40,0.04)' }} />
                      <Bar dataKey="cantidad" radius={[8, 8, 0, 0]} barSize={48} fill={dashboardColors.blue} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Text c="dimmed" ta="center" py="xl">
                    Sin datos de ingenieria
                  </Text>
                )}
              </Card>
            </SimpleGrid>
          )}

          {/* Table section */}
          <Grid gutter="lg" mt="lg" align="stretch">
            <Grid.Col span={{ base: 12, lg: seleccionado ? 8 : 12 }}>
              <Card className={classes.card} padding="xl" radius="lg">
                <Group justify="space-between" align="center" wrap="wrap" mb="lg">
                  <Select
                    placeholder="Seleccionar grupo"
                    data={grupos.map((g) => ({
                      value: String(g.id),
                      label: `${g.nombre} (${g.materia_clave})`,
                    }))}
                    value={grupoId}
                    onChange={(value) => setGrupoId(value)}
                    w={220}
                    size="md"
                    variant="default"
                    radius="md"
                    aria-label="Seleccionar grupo"
                  />
                  <Group gap="sm">
                    <TextInput
                      placeholder="Buscar por nombre o cuenta"
                      leftSection={<IconSearch size={18} aria-hidden="true" />}
                      className={classes.searchInput}
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.currentTarget.value)}
                    />
                    <Select
                      placeholder="Filtrar por nivel"
                      data={NIVELES}
                      value={nivel}
                      onChange={(value) => setNivel(value ?? 'Todos')}
                      w={170}
                      size="md"
                      variant="default"
                      radius="md"
                      aria-label="Filtrar por nivel"
                    />
                  </Group>
                </Group>

                {cargandoAlumnos ? (
                  <Text c="dimmed" ta="center" py="xl">
                    Cargando alumnos...
                  </Text>
                ) : (
                  <>
                    <Table highlightOnHover verticalSpacing="sm" className={classes.table}>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Alumno</Table.Th>
                          <Table.Th>Numero de cuenta</Table.Th>
                          <Table.Th>Puntaje</Table.Th>
                          <Table.Th>Nivel</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {filtrados.map((alumno) => (
                          <Table.Tr
                            key={alumno.alumno_id}
                            className={
                              seleccionado?.alumno_id === alumno.alumno_id
                                ? classes.rowActive
                                : undefined
                            }
                            onClick={() => setSeleccionado(alumno)}
                          >
                            <Table.Td className={classes.cellName}>
                              {alumno.nombre}
                            </Table.Td>
                            <Table.Td>{alumno.numero_cuenta}</Table.Td>
                            <Table.Td>
                              {alumno.puntaje != null ? alumno.puntaje.toFixed(2) : '—'}
                            </Table.Td>
                            <Table.Td>
                              {alumno.nivel ? (
                                <Badge
                                  variant="light"
                                  radius="md"
                                  color={NIVEL_COLORS[alumno.nivel] ?? 'gray'}
                                >
                                  {alumno.nivel}
                                </Badge>
                              ) : (
                                '—'
                              )}
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>

                    {filtrados.length === 0 && (
                      <Text c="dimmed" ta="center" py="xl">
                        No se encontraron alumnos con los filtros seleccionados.
                      </Text>
                    )}
                  </>
                )}
              </Card>
            </Grid.Col>

            {seleccionado && (
              <Grid.Col span={{ base: 12, lg: 4 }}>
                <Card className={classes.card} padding="xl" radius="lg">
                  <Stack gap="sm">
                    <Title order={3} className={classes.cardTitle}>
                      {seleccionado.nombre}
                    </Title>
                    <Group gap={6}>
                      <Badge variant="light" radius="md" color="indigo">
                        {seleccionado.nivel ?? 'Sin nivel'}
                      </Badge>
                      <Badge
                        variant="light"
                        radius="md"
                        color={NIVEL_COLORS[seleccionado.nivel ?? ''] ?? 'gray'}
                      >
                        Puntaje:{' '}
                        {seleccionado.puntaje != null
                          ? seleccionado.puntaje.toFixed(2)
                          : '—'}
                      </Badge>
                    </Group>

                    <Stack gap={4} mt="sm">
                      <Text className={classes.detailLabel}>Numero de cuenta</Text>
                      <Text className={classes.detailValue}>
                        {seleccionado.numero_cuenta}
                      </Text>
                      {seleccionado.ingenieria_clave && (
                        <>
                          <Text className={classes.detailLabel} mt="xs">
                            Ingenieria
                          </Text>
                          <Text className={classes.detailValue}>
                            {seleccionado.ingenieria_clave}
                          </Text>
                        </>
                      )}
                    </Stack>
                  </Stack>
                </Card>
              </Grid.Col>
            )}
          </Grid>
        </>
      )}
    </>
  );
}

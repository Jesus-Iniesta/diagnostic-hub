import {
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Select,
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
import { useNavigate, useSearchParams } from 'react-router-dom';
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

import CreaniCharts from '../../components/CreaniCharts/CreaniCharts';
import { colorCategoria, fmtIndice } from '../../lib/categorias';
import {
  fetchAlumnosGrupo,
  fetchCreaniGrupo,
  fetchEstadisticasGrupo,
  fetchMisGrupos,
} from '../../lib/profesorApi';
import type {
  CategoriaDistribucion,
  Grupo,
  GrupoAlumno,
  GrupoCreani,
  GrupoEstadisticas,
} from '../../types/profesor';
import classes from './ProfesorResultados.module.css';

const TODAS = 'Todas';

function CategoriaTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: CategoriaDistribucion }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#fff', padding: '8px 12px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
      <Text size="sm" fw={600}>{d.categoria}</Text>
      <Text size="xs" c="dimmed">{d.cantidad} alumnos · {d.porcentaje}%</Text>
    </div>
  );
}

export default function ProfesorResultados() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [grupoId, setGrupoId] = useState<string | null>(null);
  const [alumnos, setAlumnos] = useState<GrupoAlumno[]>([]);
  const [estadisticas, setEstadisticas] = useState<GrupoEstadisticas | null>(null);
  const [creani, setCreani] = useState<GrupoCreani | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoAlumnos, setCargandoAlumnos] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState<string>(TODAS);
  const [seleccionado, setSeleccionado] = useState<GrupoAlumno | null>(null);

  useEffect(() => {
    let mounted = true;
    void fetchMisGrupos().then((data) => {
      if (mounted) {
        setGrupos(data);
        setCargando(false);
        // Desde Inicio llega con ?grupo=<id>.
        const pedido = searchParams.get('grupo');
        const inicial = data.find((g) => String(g.id) === pedido) ?? data[0];
        if (inicial) setGrupoId(String(inicial.id));
      }
    });
    return () => {
      mounted = false;
    };
  }, [searchParams]);

  useEffect(() => {
    if (!grupoId) return;
    let mounted = true;
    setCargandoAlumnos(true);
    void Promise.all([
      fetchAlumnosGrupo(Number(grupoId)),
      fetchEstadisticasGrupo(Number(grupoId)).catch(() => null),
      fetchCreaniGrupo(Number(grupoId)).catch(() => null),
    ]).then(([alumnosData, stats, creaniData]) => {
      if (mounted) {
        setAlumnos(alumnosData);
        setEstadisticas(stats);
        setCreani(creaniData);
        setCargandoAlumnos(false);
        setSeleccionado(null);
        setCategoria(TODAS);
      }
    });
    return () => {
      mounted = false;
    };
  }, [grupoId]);

  const categorias = useMemo(
    () => estadisticas?.distribucion.map((d) => d.categoria) ?? [],
    [estadisticas],
  );

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return alumnos.filter((alumno) => {
      const coincideCategoria = categoria === TODAS || alumno.categoria === categoria;
      const coincideBusqueda =
        !q ||
        alumno.nombre.toLowerCase().includes(q) ||
        alumno.numero_cuenta.includes(q);
      return coincideCategoria && coincideBusqueda;
    });
  }, [alumnos, busqueda, categoria]);

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
              Aún no tienes grupos
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
          <Group mt="lg">
            <Select
              placeholder="Seleccionar grupo"
              data={grupos.map((g) => ({
                value: String(g.id),
                label: g.materia_nombre ? `Grupo ${g.nombre} - ${g.materia_nombre}` : `Grupo ${g.nombre}`,
              }))}
              value={grupoId}
              onChange={(value) => setGrupoId(value)}
              w={340}
              size="md"
              variant="default"
              radius="md"
              aria-label="Seleccionar grupo"
            />
          </Group>

          {estadisticas && estadisticas.evaluados > 0 && (
            <Card className={classes.card} padding="xl" radius="lg" mt="lg">
              <Group justify="space-between" align="flex-start" mb="md">
                <div>
                  <Title order={4} className={classes.cardTitle}>
                    Distribución por categoría del Índice FI UAEMex
                  </Title>
                  <Text size="sm" c="dimmed">
                    {estadisticas.evaluados} alumnos evaluados · promedio{' '}
                    {fmtIndice(estadisticas.promedio_indice, estadisticas.maximo)}
                  </Text>
                </div>
              </Group>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={estadisticas.distribucion}
                  margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid vertical={false} strokeDasharray="5 5" stroke="#E8EAF0" />
                  <XAxis
                    dataKey="categoria"
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    tick={{ fill: '#667085', fontSize: 12, fontWeight: 600 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#98A2B3', fontSize: 12 }}
                    width={36}
                  />
                  <Tooltip content={<CategoriaTooltip />} cursor={{ fill: 'rgba(16,24,40,0.04)' }} />
                  <Bar dataKey="cantidad" radius={[8, 8, 0, 0]} maxBarSize={56}>
                    {estadisticas.distribucion.map((entry) => (
                      <Cell key={entry.categoria} fill={colorCategoria(entry.categoria, categorias)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {!cargandoAlumnos && creani && alumnos.length > 0 && (
            <CreaniCharts
              creani={creani}
              cardClassName={classes.card}
              titleClassName={classes.cardTitle}
            />
          )}

          <Grid gutter="lg" mt="lg" align="stretch">
            <Grid.Col span={{ base: 12, lg: seleccionado ? 8 : 12 }}>
              <Card className={classes.card} padding="xl" radius="lg">
                <Group justify="flex-end" align="center" wrap="wrap" mb="lg" gap="sm">
                  <TextInput
                    placeholder="Buscar por nombre o cuenta"
                    leftSection={<IconSearch size={18} aria-hidden="true" />}
                    className={classes.searchInput}
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.currentTarget.value)}
                  />
                  <Select
                    placeholder="Filtrar por categoría"
                    data={[TODAS, ...categorias]}
                    value={categoria}
                    onChange={(value) => setCategoria(value ?? TODAS)}
                    w={180}
                    size="md"
                    variant="default"
                    radius="md"
                    aria-label="Filtrar por categoría"
                  />
                </Group>

                {cargandoAlumnos ? (
                  <Text c="dimmed" ta="center" py="xl">
                    Cargando alumnos...
                  </Text>
                ) : (
                  <>
                    <Table.ScrollContainer minWidth={640}>
                      <Table highlightOnHover verticalSpacing="sm" className={classes.table}>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Alumno</Table.Th>
                            <Table.Th>Número de cuenta</Table.Th>
                            <Table.Th>Examen final</Table.Th>
                            <Table.Th>Índice FI UAEMex</Table.Th>
                            <Table.Th>Categoría</Table.Th>
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
                                {alumno.examen_final != null ? alumno.examen_final.toFixed(2) : '—'}
                              </Table.Td>
                              <Table.Td style={{ whiteSpace: 'nowrap' }}>
                                {fmtIndice(alumno.indice, alumno.maximo)}
                              </Table.Td>
                              <Table.Td>
                                {alumno.categoria ? (
                                  <Badge
                                    variant="light"
                                    radius="md"
                                    tt="none"
                                    color={colorCategoria(alumno.categoria, categorias)}
                                  >
                                    {alumno.categoria}
                                  </Badge>
                                ) : (
                                  '—'
                                )}
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </Table.ScrollContainer>

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
                      {seleccionado.categoria && (
                        <Badge
                          variant="light"
                          radius="md"
                          tt="none"
                          color={colorCategoria(seleccionado.categoria, categorias)}
                        >
                          {seleccionado.categoria}
                        </Badge>
                      )}
                      <Badge variant="light" radius="md" tt="none" color="indigo">
                        Índice FI: {fmtIndice(seleccionado.indice, seleccionado.maximo)}
                      </Badge>
                    </Group>

                    <Stack gap={4} mt="sm">
                      <Text className={classes.detailLabel}>Número de cuenta</Text>
                      <Text className={classes.detailValue}>
                        {seleccionado.numero_cuenta}
                      </Text>
                      <Text className={classes.detailLabel} mt="xs">
                        Examen final
                      </Text>
                      <Text className={classes.detailValue}>
                        {seleccionado.examen_final != null
                          ? `${seleccionado.examen_final.toFixed(2)} / 10`
                          : 'Sin resultado'}
                      </Text>
                      {seleccionado.ingenieria_clave && (
                        <>
                          <Text className={classes.detailLabel} mt="xs">
                            Ingeniería
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

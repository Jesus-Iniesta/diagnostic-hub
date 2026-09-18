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
import { useNavigate } from 'react-router-dom';

import { fetchMisGrupos, fetchAlumnosGrupo } from '../../lib/profesorApi';
import { dashboardColors } from '../../theme/theme';
import type { Grupo, GrupoAlumno } from '../../types/profesor';
import classes from './ProfesorResultados.module.css';

const NIVELES = ['Todos', 'Alto', 'Bueno', 'Medio', 'Bajo', 'Muy bajo'];

const NIVEL_COLORS: Record<string, string> = {
  Alto: dashboardColors.green,
  Bueno: 'teal',
  Medio: dashboardColors.orange,
  Bajo: '#fd7e14',
  'Muy bajo': dashboardColors.red,
};

export default function ProfesorResultados() {
  const navigate = useNavigate();
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [grupoId, setGrupoId] = useState<string | null>(null);
  const [alumnos, setAlumnos] = useState<GrupoAlumno[]>([]);
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
    void fetchAlumnosGrupo(Number(grupoId), '2026B').then((data) => {
      if (mounted) {
        setAlumnos(data);
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
              Aún no tienes un grupo
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
        <Grid gutter="lg" mt="lg" align="stretch">
          <Grid.Col span={{ base: 12, lg: 8 }}>
            <Card className={classes.card} padding="xl" radius="lg">
              <Group justify="space-between" align="center" wrap="wrap" mb="lg">
                <Select
                  placeholder="Seleccionar grupo"
                  data={grupos.map((g) => ({
                    value: String(g.id),
                    label: `${g.nombre} (${g.ingenieria_clave})`,
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
                        <Table.Th>Número de cuenta</Table.Th>
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
                    <Text className={classes.detailLabel}>Número de cuenta</Text>
                    <Text className={classes.detailValue}>
                      {seleccionado.numero_cuenta}
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
      )}
    </>
  );
}

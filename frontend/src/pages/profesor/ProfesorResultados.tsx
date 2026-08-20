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

import { fetchAlumnosGrupo } from '../../lib/profesorApi';
import { dashboardColors } from '../../theme/theme';
import type { AlumnoGrupo } from '../../types/profesor';
import classes from './ProfesorResultados.module.css';

const NIVELES = ['Todos', 'Alto', 'Medio', 'Bajo'];

const NIVEL_COLORS: Record<string, string> = {
  Alto: dashboardColors.green,
  Medio: dashboardColors.orange,
  Bajo: dashboardColors.red,
};

export default function ProfesorResultados() {
  const navigate = useNavigate();
  const [alumnos, setAlumnos] = useState<AlumnoGrupo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [nivel, setNivel] = useState<string>('Todos');
  const [seleccionado, setSeleccionado] = useState<AlumnoGrupo | null>(null);

  useEffect(() => {
    let mounted = true;
    void fetchAlumnosGrupo().then((data) => {
      if (mounted) {
        setAlumnos(data);
        setCargando(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

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

  const sinGrupo = !cargando && alumnos.length === 0;

  return (
    <>
      <div className={classes.welcome}>
        <Text component="h1" className={classes.welcomeTitle}>
          Resultados
        </Text>
        <Text className={classes.welcomeSubtitle}>
          Consulta los resultados de los alumnos de tu grupo.
        </Text>
      </div>

      {sinGrupo ? (
        <Card className={classes.card} padding="xl" radius="lg" mt="lg">
          <Stack gap="sm" align="flex-start">
            <span className={classes.emptyIcon}>
              <IconUsersGroup size={28} aria-hidden="true" />
            </span>
            <Title order={3} className={classes.cardTitle}>
              Aún no tienes un grupo cargado
            </Title>
            <Text className={classes.cardText}>
              Carga la lista de Control Escolar para consultar los resultados de
              tus alumnos.
            </Text>
            <Button
              size="md"
              color="indigo"
              className={classes.actionButton}
              rightSection={<IconArrowRight size={18} aria-hidden="true" />}
              onClick={() => navigate('/profesor/grupo')}
            >
              Cargar lista
            </Button>
          </Stack>
        </Card>
      ) : (
        <Grid gutter="lg" mt="lg" align="stretch">
          <Grid.Col span={{ base: 12, lg: 8 }}>
            <Card className={classes.card} padding="xl" radius="lg">
              <Group justify="space-between" align="center" wrap="wrap" mb="lg">
                <TextInput
                  placeholder="Buscar por nombre o número de cuenta"
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
                      key={alumno.id}
                      className={
                        seleccionado?.id === alumno.id ? classes.rowActive : undefined
                      }
                      onClick={() => setSeleccionado(alumno)}
                    >
                      <Table.Td className={classes.cellName}>{alumno.nombre}</Table.Td>
                      <Table.Td>{alumno.numero_cuenta}</Table.Td>
                      <Table.Td>{alumno.puntaje ?? '—'}</Table.Td>
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
                      Puntaje: {seleccionado.puntaje ?? '—'}
                    </Badge>
                  </Group>

                  <Stack gap={4} mt="sm">
                    <Text className={classes.detailLabel}>Número de cuenta</Text>
                    <Text className={classes.detailValue}>
                      {seleccionado.numero_cuenta}
                    </Text>
                    {seleccionado.licenciatura && (
                      <>
                        <Text className={classes.detailLabel} mt="xs">
                          Licenciatura
                        </Text>
                        <Text className={classes.detailValue}>
                          {seleccionado.licenciatura}
                        </Text>
                      </>
                    )}
                    {seleccionado.grupo && (
                      <>
                        <Text className={classes.detailLabel} mt="xs">
                          Grupo
                        </Text>
                        <Text className={classes.detailValue}>{seleccionado.grupo}</Text>
                      </>
                    )}
                  </Stack>

                  {seleccionado.retroalimentacion && (
                    <Stack gap={4} mt="sm">
                      <Text className={classes.detailLabel}>Retroalimentación</Text>
                      <Text className={classes.detailText}>
                        {seleccionado.retroalimentacion}
                      </Text>
                    </Stack>
                  )}
                </Stack>
              </Card>
            </Grid.Col>
          )}
        </Grid>
      )}
    </>
  );
}
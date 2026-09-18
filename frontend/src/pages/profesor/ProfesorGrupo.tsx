import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  NativeSelect,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconPlus,
  IconTrash,
  IconUsersGroup,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import {
  fetchMisGrupos,
  crearGrupo,
  eliminarGrupo,
  fetchAlumnosGrupo,
  agregarAlumno,
  quitarAlumno,
} from '../../lib/profesorApi';
import type { Grupo, GrupoAlumno } from '../../types/profesor';
import classes from './ProfesorGrupo.module.css';

const INGENIERIAS = ['ICO', 'IEL', 'IME', 'ISES', 'ICI', 'IIA'];

export default function ProfesorGrupo() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<Grupo | null>(null);
  const [alumnos, setAlumnos] = useState<GrupoAlumno[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAlumnos, setLoadingAlumnos] = useState(false);

  const [showCrearModal, setShowCrearModal] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaIngenieria, setNuevaIngenieria] = useState(INGENIERIAS[0]);
  const [nuevoPeriodo, setNuevoPeriodo] = useState('2026B');
  const [creando, setCreando] = useState(false);

  const [showAgregarModal, setShowAgregarModal] = useState(false);
  const [numeroCuenta, setNumeroCuenta] = useState('');
  const [agregando, setAgregando] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    cargarGrupos();
  }, []);

  async function cargarGrupos() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMisGrupos();
      setGrupos(data);
      if (data.length > 0 && !grupoSeleccionado) {
        seleccionarGrupo(data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar grupos');
    } finally {
      setLoading(false);
    }
  }

  async function seleccionarGrupo(grupo: Grupo) {
    setGrupoSeleccionado(grupo);
    setLoadingAlumnos(true);
    try {
      const data = await fetchAlumnosGrupo(grupo.id, '2026B');
      setAlumnos(data);
    } catch {
      setAlumnos([]);
    } finally {
      setLoadingAlumnos(false);
    }
  }

  async function handleCrearGrupo() {
    if (!nuevoNombre.trim()) return;
    setCreando(true);
    setError(null);
    try {
      await crearGrupo({
        nombre: nuevoNombre.trim(),
        ingenieria_clave: nuevaIngenieria,
        periodo: nuevoPeriodo,
      });
      setShowCrearModal(false);
      setNuevoNombre('');
      setSuccess('Grupo creado correctamente');
      await cargarGrupos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear grupo');
    } finally {
      setCreando(false);
    }
  }

  async function handleEliminarGrupo(grupo: Grupo) {
    if (!confirm(`¿Eliminar el grupo "${grupo.nombre}"?`)) return;
    setError(null);
    try {
      await eliminarGrupo(grupo.id);
      setSuccess('Grupo eliminado');
      if (grupoSeleccionado?.id === grupo.id) {
        setGrupoSeleccionado(null);
        setAlumnos([]);
      }
      await cargarGrupos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar grupo');
    }
  }

  async function handleAgregarAlumno() {
    if (!grupoSeleccionado || !numeroCuenta.trim()) return;
    setAgregando(true);
    setError(null);
    try {
      await agregarAlumno(grupoSeleccionado.id, numeroCuenta.trim());
      setShowAgregarModal(false);
      setNumeroCuenta('');
      setSuccess('Alumno agregado correctamente');
      await seleccionarGrupo(grupoSeleccionado);
      await cargarGrupos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar alumno');
    } finally {
      setAgregando(false);
    }
  }

  async function handleQuitarAlumno(alumnoId: number) {
    if (!grupoSeleccionado) return;
    if (!confirm('¿Quitar alumno del grupo?')) return;
    setError(null);
    try {
      await quitarAlumno(grupoSeleccionado.id, alumnoId);
      setSuccess('Alumno removido del grupo');
      await seleccionarGrupo(grupoSeleccionado);
      await cargarGrupos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al quitar alumno');
    }
  }

  return (
    <>
      <div className={classes.welcome}>
        <Text component="h1" className={classes.welcomeTitle}>
          Mis grupos
        </Text>
        <Text className={classes.welcomeSubtitle}>
          Administra tus grupos y alumnos asignados.
        </Text>
      </div>

      {error && (
        <Alert
          color="red"
          variant="light"
          radius="md"
          icon={<IconAlertTriangle size={18} />}
          mt="md"
          maw={720}
          onClose={() => setError(null)}
          withCloseButton
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          color="green"
          variant="light"
          radius="md"
          icon={<IconCheck size={18} />}
          mt="md"
          maw={720}
          onClose={() => setSuccess(null)}
          withCloseButton
        >
          {success}
        </Alert>
      )}

      <Group mt="lg" maw={720}>
        <Button
          leftSection={<IconPlus size={18} />}
          variant="filled"
          color="indigo"
          className={classes.actionButton}
          onClick={() => setShowCrearModal(true)}
        >
          Crear grupo
        </Button>
      </Group>

      {grupos.length === 0 && !loading && (
        <Card className={classes.card} padding="xl" radius="lg" mt="lg">
          <Stack align="center" gap="md">
            <IconUsersGroup size={48} color="#98a2b3" />
            <Text className={classes.subtitle}>
              Aún no tienes grupos creados. Crea uno para comenzar.
            </Text>
          </Stack>
        </Card>
      )}

      {grupos.length > 0 && (
        <Card className={classes.card} padding="lg" radius="lg" mt="lg">
          <Title order={3} className={classes.title} mb="md">
            Grupos asignados
          </Title>

          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Grupo</Table.Th>
                <Table.Th>Ingeniería</Table.Th>
                <Table.Th>Periodo</Table.Th>
                <Table.Th>Alumnos</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {grupos.map((g) => (
                <Table.Tr
                  key={g.id}
                  style={{
                    cursor: 'pointer',
                    background:
                      grupoSeleccionado?.id === g.id ? '#f5f6ff' : undefined,
                  }}
                  onClick={() => seleccionarGrupo(g)}
                >
                  <Table.Td>
                    <Text fw={600}>{g.nombre}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="indigo">
                      {g.ingenieria_clave}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{g.periodo}</Table.Td>
                  <Table.Td>{g.total_alumnos}</Table.Td>
                  <Table.Td>
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEliminarGrupo(g);
                      }}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}

      {grupoSeleccionado && (
        <Card className={classes.card} padding="lg" radius="lg" mt="lg">
          <Group justify="space-between" mb="md">
            <Title order={3} className={classes.title}>
              Alumnos de {grupoSeleccionado.nombre}
            </Title>
            <Button
              leftSection={<IconPlus size={16} />}
              variant="light"
              color="indigo"
              size="sm"
              onClick={() => setShowAgregarModal(true)}
            >
              Agregar alumno
            </Button>
          </Group>

          {loadingAlumnos ? (
            <Text className={classes.subtitle}>Cargando alumnos...</Text>
          ) : alumnos.length === 0 ? (
            <Text className={classes.subtitle}>
              Este grupo no tiene alumnos asignados aún.
            </Text>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Nombre</Table.Th>
                  <Table.Th>No. Cuenta</Table.Th>
                  <Table.Th>Ingeniería</Table.Th>
                  <Table.Th>Puntaje</Table.Th>
                  <Table.Th>Nivel</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {alumnos.map((a) => (
                  <Table.Tr key={a.alumno_id}>
                    <Table.Td>{a.nombre}</Table.Td>
                    <Table.Td>{a.numero_cuenta}</Table.Td>
                    <Table.Td>
                      <Badge variant="light" color="indigo">
                        {a.ingenieria_clave}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {a.puntaje != null ? a.puntaje.toFixed(2) : '—'}
                    </Table.Td>
                    <Table.Td>
                      {a.nivel ? (
                        <Badge
                          variant="light"
                          color={
                            a.nivel === 'Alto'
                              ? 'green'
                              : a.nivel === 'Bueno'
                                ? 'teal'
                                : a.nivel === 'Medio'
                                  ? 'yellow'
                                  : a.nivel === 'Bajo'
                                    ? 'orange'
                                    : 'red'
                          }
                        >
                          {a.nivel}
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => handleQuitarAlumno(a.alumno_id)}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Card>
      )}

      <Modal
        opened={showCrearModal}
        onClose={() => setShowCrearModal(false)}
        title="Crear nuevo grupo"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Nombre del grupo"
            placeholder="Ej: ICO-A"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.currentTarget.value)}
          />
          <NativeSelect
            label="Ingeniería"
            data={INGENIERIAS}
            value={nuevaIngenieria}
            onChange={(e) => setNuevaIngenieria(e.currentTarget.value)}
          />
          <TextInput
            label="Periodo"
            placeholder="Ej: 2026B"
            value={nuevoPeriodo}
            onChange={(e) => setNuevoPeriodo(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button
              variant="subtle"
              color="gray"
              onClick={() => setShowCrearModal(false)}
            >
              Cancelar
            </Button>
            <Button
              color="indigo"
              onClick={handleCrearGrupo}
              loading={creando}
              disabled={!nuevoNombre.trim()}
            >
              Crear
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={showAgregarModal}
        onClose={() => setShowAgregarModal(false)}
        title="Agregar alumno al grupo"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Número de cuenta"
            placeholder="Ej: 1724300"
            value={numeroCuenta}
            onChange={(e) => setNumeroCuenta(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button
              variant="subtle"
              color="gray"
              onClick={() => setShowAgregarModal(false)}
            >
              Cancelar
            </Button>
            <Button
              color="indigo"
              onClick={handleAgregarAlumno}
              loading={agregando}
              disabled={!numeroCuenta.trim()}
            >
              Agregar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

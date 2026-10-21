import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  FileInput,
  Group,
  Modal,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconFileSpreadsheet,
  IconPlus,
  IconTrash,
  IconUpload,
  IconUsersGroup,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import IndiceAlumno from '../../components/IndiceAlumno/IndiceAlumno';
import { colorCategoria } from '../../lib/categorias';
import {
  fetchMisGrupos,
  crearGrupo,
  eliminarGrupo,
  fetchAlumnosGrupo,
  fetchEstadisticasGrupo,
  agregarAlumno,
  quitarAlumno,
  cargarAlumnosExcel,
} from '../../lib/profesorApi';
import { getCurrentPeriodo } from '../../lib/periodo';
import type { Grupo, GrupoAlumno, CargaAlumnosResponse } from '../../types/profesor';
import classes from './ProfesorGrupo.module.css';

interface Confirmacion {
  titulo: string;
  mensaje: string;
  boton: string;
  accion: () => Promise<void>;
}

export default function ProfesorGrupo() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<Grupo | null>(null);
  const [alumnos, setAlumnos] = useState<GrupoAlumno[]>([]);
  // Categorías del coordinador, de la más alta a la más baja (para el color).
  const [categorias, setCategorias] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAlumnos, setLoadingAlumnos] = useState(false);

  const [showCrearModal, setShowCrearModal] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaMateria, setNuevaMateria] = useState('');
  const [nuevoPeriodo, setNuevoPeriodo] = useState(getCurrentPeriodo());
  const [creando, setCreando] = useState(false);

  const [showAgregarModal, setShowAgregarModal] = useState(false);
  const [numeroCuenta, setNumeroCuenta] = useState('');
  const [agregando, setAgregando] = useState(false);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [cargando, setCargando] = useState(false);
  const [resultadoCarga, setResultadoCarga] = useState<CargaAlumnosResponse | null>(null);

  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);
    setError(null);
    try {
      const gruposData = await fetchMisGrupos();
      setGrupos(gruposData);
      if (gruposData.length > 0 && !grupoSeleccionado) {
        seleccionarGrupo(gruposData[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }

  async function seleccionarGrupo(grupo: Grupo) {
    setGrupoSeleccionado(grupo);
    setLoadingAlumnos(true);
    try {
      const [data, stats] = await Promise.all([
        fetchAlumnosGrupo(grupo.id),
        fetchEstadisticasGrupo(grupo.id).catch(() => null),
      ]);
      setAlumnos(data);
      setCategorias(stats?.distribucion.map((d) => d.categoria) ?? []);
    } catch {
      setAlumnos([]);
    } finally {
      setLoadingAlumnos(false);
    }
  }

  async function handleCrearGrupo() {
    if (!nuevoNombre.trim() || !nuevaMateria.trim()) return;
    setCreando(true);
    setError(null);
    try {
      await crearGrupo({
        nombre: nuevoNombre.trim(),
        materia_nombre: nuevaMateria.trim(),
        periodo: nuevoPeriodo,
      });
      setShowCrearModal(false);
      setNuevoNombre('');
      setNuevaMateria('');
      setSuccess('Grupo creado correctamente');
      await cargarDatos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el grupo');
    } finally {
      setCreando(false);
    }
  }

  function pedirEliminarGrupo(grupo: Grupo) {
    setConfirmacion({
      titulo: 'Eliminar grupo',
      mensaje: `¿Eliminar el grupo ${grupo.nombre}${grupo.materia_nombre ? ` de ${grupo.materia_nombre}` : ''}? Sus alumnos ya no aparecerán en Mis grupos.`,
      boton: 'Eliminar grupo',
      accion: async () => {
        await eliminarGrupo(grupo.id);
        setSuccess('Grupo eliminado');
        if (grupoSeleccionado?.id === grupo.id) {
          setGrupoSeleccionado(null);
          setAlumnos([]);
        }
        await cargarDatos();
      },
    });
  }

  function pedirQuitarAlumno(alumno: GrupoAlumno) {
    if (!grupoSeleccionado) return;
    const grupo = grupoSeleccionado;
    setConfirmacion({
      titulo: 'Quitar alumno',
      mensaje: `¿Quitar a ${alumno.nombre} del grupo ${grupo.nombre}? Sus resultados no se borran.`,
      boton: 'Quitar alumno',
      accion: async () => {
        await quitarAlumno(grupo.id, alumno.alumno_id);
        setSuccess('Alumno quitado del grupo');
        await seleccionarGrupo(grupo);
        await cargarDatos();
      },
    });
  }

  async function handleConfirmar() {
    if (!confirmacion) return;
    setConfirmando(true);
    setError(null);
    try {
      await confirmacion.accion();
      setConfirmacion(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la acción');
      setConfirmacion(null);
    } finally {
      setConfirmando(false);
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
      await cargarDatos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar alumno');
    } finally {
      setAgregando(false);
    }
  }

  async function handleCargarExcel() {
    if (!grupoSeleccionado || !uploadFile) return;
    setCargando(true);
    setError(null);
    setResultadoCarga(null);
    try {
      const resultado = await cargarAlumnosExcel(grupoSeleccionado.id, uploadFile);
      setResultadoCarga(resultado);
      if (resultado.agregados > 0) {
        await seleccionarGrupo(grupoSeleccionado);
        await cargarDatos();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar archivo');
      cerrarUploadModal();
    } finally {
      setCargando(false);
    }
  }

  function cerrarUploadModal() {
    setShowUploadModal(false);
    setUploadFile(null);
    setResultadoCarga(null);
  }

  return (
    <>
      <div className={classes.welcome}>
        <Text component="h1" className={classes.welcomeTitle}>
          Mis grupos
        </Text>
        <Text className={classes.welcomeSubtitle}>
          Administra tus grupos y sus alumnos.
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
              Aún no tienes grupos. Crea uno para comenzar.
            </Text>
          </Stack>
        </Card>
      )}

      {grupos.length > 0 && (
        <Card className={classes.card} padding="lg" radius="lg" mt="lg">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Grupo</Table.Th>
                <Table.Th>Materia</Table.Th>
                <Table.Th>Periodo</Table.Th>
                <Table.Th>Alumnos</Table.Th>
                <Table.Th>Archivo</Table.Th>
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
                    <Badge variant="light" color="indigo" tt="none">
                      {g.materia_nombre || g.materia_clave}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{g.periodo}</Table.Td>
                  <Table.Td>{g.total_alumnos}</Table.Td>
                  <Table.Td>
                    {g.nombre_archivo ? (
                      <Badge variant="light" color="green" tt="none" leftSection={<IconFileSpreadsheet size={12} />}>
                        {g.nombre_archivo}
                      </Badge>
                    ) : (
                      <Text size="sm" c="dimmed">—</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      aria-label={`Eliminar el grupo ${g.nombre}`}
                      title="Eliminar grupo"
                      onClick={(e) => {
                        e.stopPropagation();
                        pedirEliminarGrupo(g);
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
        <Card className={`${classes.card} ${classes.cardAncha}`} padding="lg" radius="lg" mt="lg">
          <Group justify="space-between" mb="md">
            <Text className={classes.title}>
              Alumnos del grupo {grupoSeleccionado.nombre}
            </Text>
            <Group>
              <Button
                leftSection={<IconUpload size={16} />}
                variant="light"
                color="teal"
                size="sm"
                onClick={() => setShowUploadModal(true)}
              >
                Cargar lista de alumnos
              </Button>
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
          </Group>

          {loadingAlumnos ? (
            <Text className={classes.subtitle}>Cargando alumnos...</Text>
          ) : alumnos.length === 0 ? (
            <Text className={classes.subtitle}>
              Este grupo aún no tiene alumnos. Carga la lista de alumnos o agrégalos uno por uno.
            </Text>
          ) : (
            <Table.ScrollContainer minWidth={760}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Nombre</Table.Th>
                    <Table.Th>No. de cuenta</Table.Th>
                    <Table.Th>Ingeniería</Table.Th>
                    <Table.Th>Examen final</Table.Th>
                    <Table.Th>Índice FI UAEMex</Table.Th>
                    <Table.Th>Categoría</Table.Th>
                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {alumnos.map((a) => (
                    <Table.Tr key={a.alumno_id}>
                      <Table.Td>{a.nombre}</Table.Td>
                      <Table.Td>{a.numero_cuenta}</Table.Td>
                      <Table.Td>
                        {a.ingenieria_clave ? (
                          <Badge variant="light" color="indigo">
                            {a.ingenieria_clave}
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </Table.Td>
                      <Table.Td>
                        {a.examen_final != null ? a.examen_final.toFixed(2) : '—'}
                      </Table.Td>
                      <Table.Td>
                        <IndiceAlumno indice={a.indice} maximo={a.maximo} faltantes={a.examenes_faltantes} />
                      </Table.Td>
                      <Table.Td>
                        {a.categoria ? (
                          <Badge
                            variant="light"
                            tt="none"
                            color={colorCategoria(a.categoria, categorias)}
                          >
                            {a.categoria}
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </Table.Td>
                      <Table.Td>
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          aria-label={`Quitar a ${a.nombre} del grupo`}
                          title="Quitar del grupo"
                          onClick={() => pedirQuitarAlumno(a)}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Card>
      )}

      <Modal
        opened={showCrearModal}
        onClose={() => setShowCrearModal(false)}
        title="Crear grupo"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Grupo"
            placeholder="Ej: 02"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.currentTarget.value)}
          />
          <TextInput
            label="Materia"
            placeholder="Ej: Cálculo III"
            value={nuevaMateria}
            onChange={(e) => setNuevaMateria(e.currentTarget.value)}
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
              disabled={!nuevoNombre.trim() || !nuevaMateria.trim()}
            >
              Crear grupo
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

      <Modal
        opened={showUploadModal}
        onClose={cerrarUploadModal}
        title="Cargar lista de alumnos"
        centered
      >
        {resultadoCarga ? (
          <Stack gap="md">
            <Alert
              color={
                !resultadoCarga.ok ||
                (resultadoCarga.agregados === 0 &&
                  resultadoCarga.duplicados_en_grupo === 0 &&
                  (resultadoCarga.errores_archivo > 0 || resultadoCarga.total_en_archivo === 0))
                  ? 'red'
                  : 'green'
              }
              variant="light"
            >
              <Stack gap={2}>
                <Text size="sm">Alumnos en el archivo: {resultadoCarga.total_en_archivo}</Text>
                <Text size="sm">Agregados al grupo: {resultadoCarga.agregados}</Text>
                <Text size="sm">Ya estaban en el grupo: {resultadoCarga.duplicados_en_grupo}</Text>
                <Text size="sm">No encontrados: {resultadoCarga.no_encontrados.length}</Text>
              </Stack>
              {resultadoCarga.no_encontrados.length > 0 && (
                <Stack gap={4} mt="sm">
                  <Text size="sm" fw={600}>
                    No se agregaron porque no están registrados en el sistema:
                  </Text>
                  <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                    {resultadoCarga.no_encontrados.map((a) => (
                      <Text key={a.numero_cuenta} size="xs">
                        • {a.nombre} — {a.numero_cuenta}
                        {a.correo ? ` (${a.correo})` : ''}
                      </Text>
                    ))}
                  </div>
                </Stack>
              )}
              {resultadoCarga.detalles_errores.length > 0 && (
                <Text size="xs" mt="xs" c="dimmed">
                  Errores: {resultadoCarga.detalles_errores.join('; ')}
                </Text>
              )}
            </Alert>
            <Group justify="flex-end">
              <Button color="indigo" onClick={cerrarUploadModal}>
                Cerrar
              </Button>
            </Group>
          </Stack>
        ) : (
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              El archivo debe comenzar con "LN" y tener formato:
              LINC05-CALCULO III-02 1
            </Text>
            <Text size="sm" c="dimmed">
              Columnas esperadas: CUENTA, APELLIDO PATERNO, APELLIDO MATERNO, NOMBRE, PLAN DE ESTUDIOS, ORGANISMO, CORREO INSTITUCIONAL, ESTADO DEL ALUMNO
            </Text>
            <FileInput
              label="Archivo Excel"
              placeholder="Selecciona un archivo .xls o .xlsx"
              accept=".xls,.xlsx"
              value={uploadFile}
              onChange={setUploadFile}
              leftSection={<IconFileSpreadsheet size={16} />}
            />
            <Group justify="flex-end">
              <Button variant="subtle" color="gray" onClick={cerrarUploadModal}>
                Cancelar
              </Button>
              <Button
                color="teal"
                leftSection={<IconUpload size={16} />}
                onClick={handleCargarExcel}
                loading={cargando}
                disabled={!uploadFile}
              >
                Cargar lista de alumnos
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      <Modal
        opened={confirmacion !== null}
        onClose={() => !confirmando && setConfirmacion(null)}
        title={confirmacion?.titulo}
        centered
      >
        <Stack gap="md">
          <Text size="sm">{confirmacion?.mensaje}</Text>
          <Group justify="flex-end">
            <Button
              variant="subtle"
              color="gray"
              onClick={() => setConfirmacion(null)}
              disabled={confirmando}
            >
              Cancelar
            </Button>
            <Button color="red" onClick={handleConfirmar} loading={confirmando}>
              {confirmacion?.boton}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

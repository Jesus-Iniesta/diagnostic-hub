import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  Radio,
  SegmentedControl,
  Select,
  SimpleGrid,
  Switch,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { IconArrowsJoin, IconInfoCircle, IconPencil, IconSearch } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { usePeriodo } from '../../contexts/PeriodoContext';
import {
  editarDatosAlumno,
  listarAlumnosAdmin,
  unirAlumnos,
  type AlumnoAdmin,
  type FiltroAlumnos,
  type MarcaExamen,
} from '../../lib/alumnosAdminApi';
import { getProgramas, type Ingenieria } from '../../lib/dashboardApi';
import classes from './AdminCargaAlumnos.module.css';

const PAGE_SIZE = 20;

const FILTROS: { value: FiltroAlumnos; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'por_revisar', label: 'Por revisar' },
  { value: 'provisionales', label: 'Provisionales' },
  { value: 'sin_cuenta', label: 'Sin cuenta' },
];

function esFiltro(v: string | null): v is FiltroAlumnos {
  return FILTROS.some((f) => f.value === v);
}

const MARCAS: { key: MarcaExamen; label: string; nombre: string }[] = [
  { key: 'c1', label: 'C1', nombre: 'Cuestionario 1' },
  { key: 'c2', label: 'C2', nombre: 'Cuestionario 2' },
  { key: 'algebra', label: 'Álg', nombre: 'Final Álgebra' },
  { key: 'trigonometria', label: 'Trig', nombre: 'Final Trigonometría' },
  { key: 'geometria', label: 'Geo', nombre: 'Final Geometría' },
  { key: 'calculo', label: 'Cálc', nombre: 'Final Cálculo' },
  { key: 'wa', label: 'WA', nombre: 'WebAssign' },
];

/** Las 7 marcas cortas con ✓ o —; al pasar el mouse se ve el detalle. */
function MarcasExamenes({ alumno }: { alumno: AlumnoAdmin }) {
  const detalle = MARCAS.map((m) => {
    const lista = alumno.marcas[m.key];
    if (!lista?.length) return `${m.nombre}: sin resultado`;
    // Solo se agrega el detalle si dice algo más (carrera de WebAssign o periodo).
    const extra = lista.filter((t) => t !== m.nombre);
    return `${m.nombre}: ✓${extra.length ? ` (${extra.join(', ')})` : ''}`;
  }).join('\n');
  return (
    <Tooltip label={<span style={{ whiteSpace: 'pre-line' }}>{detalle}</span>} withArrow multiline w={300}>
      <div style={{ display: 'flex', gap: 4, whiteSpace: 'nowrap' }}>
        {MARCAS.map((m) => {
          const tiene = Boolean(alumno.marcas[m.key]?.length);
          return (
            <span
              key={m.key}
              style={{
                fontSize: 11,
                fontWeight: 600,
                lineHeight: '18px',
                padding: '0 5px',
                borderRadius: 4,
                border: `1px solid ${tiene ? 'var(--mantine-color-green-3)' : 'var(--mantine-color-gray-3)'}`,
                background: tiene ? 'var(--mantine-color-green-0)' : 'transparent',
                color: tiene ? 'var(--mantine-color-green-8)' : 'var(--mantine-color-gray-5)',
              }}
            >
              {m.label} {tiene ? '✓' : '—'}
            </span>
          );
        })}
      </div>
    </Tooltip>
  );
}

function errorTexto(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

function useDebounced<T>(valor: T, ms = 400): T {
  const [v, setV] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return v;
}

function correoDe(a: AlumnoAdmin): string {
  return a.correo_personal || a.correo_institucional || '—';
}

// ── Editar cuenta, folio e ingeniería ───────────────────────────

interface EditarModalProps {
  alumno: AlumnoAdmin | null;
  ingenierias: Ingenieria[];
  onClose: () => void;
  onGuardado: (alumno: AlumnoAdmin) => void;
}

function EditarModal({ alumno, ingenierias, onClose, onGuardado }: EditarModalProps) {
  const [cuenta, setCuenta] = useState('');
  const [folio, setFolio] = useState('');
  const [ingenieriaId, setIngenieriaId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!alumno) return;
    setCuenta(alumno.numero_cuenta ?? '');
    setFolio(alumno.numero_folio ?? '');
    setIngenieriaId(alumno.ingenieria_id !== null ? String(alumno.ingenieria_id) : null);
    setError(null);
  }, [alumno]);

  const guardar = async () => {
    if (!alumno) return;
    setGuardando(true);
    setError(null);
    try {
      const actualizado = await editarDatosAlumno(alumno.id, {
        numero_cuenta: cuenta.trim() || null,
        numero_folio: folio.trim() || null,
        ingenieria_id: ingenieriaId ? Number(ingenieriaId) : null,
      });
      onGuardado(actualizado);
    } catch (err) {
      setError(errorTexto(err, 'No se pudieron guardar los datos'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal opened={alumno !== null} onClose={onClose} title="Editar datos del alumno" centered>
      {alumno && (
        <Stack gap="md">
          <Text size="sm">
            <strong>{alumno.nombre || 'Sin nombre'}</strong> · {correoDe(alumno)}
          </Text>
          <TextInput
            label="Número de cuenta"
            description="7 dígitos. Vacío para quitarlo."
            value={cuenta}
            onChange={(e) => setCuenta(e.currentTarget.value)}
          />
          <TextInput
            label="Folio"
            description="9 dígitos. Vacío para quitarlo."
            value={folio}
            onChange={(e) => setFolio(e.currentTarget.value)}
          />
          <Select
            label="Ingeniería"
            placeholder="Sin ingeniería"
            data={ingenierias.map((i) => ({ value: String(i.id), label: `${i.clave} — ${i.nombre}` }))}
            value={ingenieriaId}
            onChange={setIngenieriaId}
            clearable
          />
          {error && (
            <Alert color="red" variant="light" icon={<IconInfoCircle size={18} />}>
              {error}
            </Alert>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={guardar} loading={guardando}>
              Guardar
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}

// ── Unir dos alumnos ─────────────────────────────────────────────

function FichaAlumno({ alumno }: { alumno: AlumnoAdmin }) {
  const dato = (label: string, valor: string | null | undefined) => (
    <Text size="xs">
      <Text span c="dimmed" size="xs">
        {label}:{' '}
      </Text>
      {valor || '—'}
    </Text>
  );
  return (
    <Stack gap={2}>
      <Group gap="xs">
        <Text fw={600} size="sm">
          {alumno.nombre || 'Sin nombre'}
        </Text>
        {alumno.es_provisional && (
          <Badge size="xs" variant="light" color="orange">
            Provisional
          </Badge>
        )}
      </Group>
      {dato('Correo', alumno.correo_personal)}
      {alumno.correo_institucional && dato('Correo institucional', alumno.correo_institucional)}
      {dato('Cuenta', alumno.numero_cuenta)}
      {dato('Folio', alumno.numero_folio)}
      {dato('Ingeniería', alumno.ingenieria)}
      {dato('Periodo de ingreso', alumno.periodo_ingreso)}
      {dato('Exámenes', alumno.examenes.join(', '))}
    </Stack>
  );
}

interface UnirModalProps {
  alumno: AlumnoAdmin | null;
  onClose: () => void;
  onUnido: () => void;
}

function UnirModal({ alumno, onClose, onUnido }: UnirModalProps) {
  const [busqueda, setBusqueda] = useState('');
  const busquedaDebounced = useDebounced(busqueda);
  const [resultados, setResultados] = useState<AlumnoAdmin[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [otro, setOtro] = useState<AlumnoAdmin | null>(null);
  const [conservar, setConservar] = useState<string>('');
  const [uniendo, setUniendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBusqueda(alumno?.nombre ?? '');
    setResultados([]);
    setOtro(null);
    setError(null);
  }, [alumno]);

  useEffect(() => {
    if (!alumno || otro) return;
    const q = busquedaDebounced.trim();
    if (!q) {
      setResultados([]);
      return;
    }
    let vigente = true;
    setBuscando(true);
    listarAlumnosAdmin({ busqueda: q, limit: 10 })
      .then((r) => {
        if (vigente) setResultados(r.items.filter((a) => a.id !== alumno.id));
      })
      .catch((err) => {
        if (vigente) setError(errorTexto(err, 'Error al buscar'));
      })
      .finally(() => {
        if (vigente) setBuscando(false);
      });
    return () => {
      vigente = false;
    };
  }, [alumno, otro, busquedaDebounced]);

  const elegir = (a: AlumnoAdmin) => {
    if (!alumno) return;
    setOtro(a);
    // Por defecto se conserva el que no es provisional (el del padrón).
    setConservar(String(alumno.es_provisional && !a.es_provisional ? a.id : alumno.id));
  };

  const confirmar = async () => {
    if (!alumno || !otro) return;
    const conservarId = Number(conservar);
    const eliminarId = conservarId === alumno.id ? otro.id : alumno.id;
    setUniendo(true);
    setError(null);
    try {
      await unirAlumnos(conservarId, eliminarId);
      onUnido();
    } catch (err) {
      setError(errorTexto(err, 'No se pudieron unir'));
    } finally {
      setUniendo(false);
    }
  };

  return (
    <Modal opened={alumno !== null} onClose={onClose} title="Unir alumnos" size="xl" centered>
      {alumno && !otro && (
        <Stack gap="md">
          <Text size="sm">
            Busca el otro registro de <strong>{alumno.nombre || correoDe(alumno)}</strong> (la misma persona registrada dos
            veces).
          </Text>
          <TextInput
            placeholder="Nombre, correo, cuenta o folio"
            leftSection={<IconSearch size={16} />}
            value={busqueda}
            onChange={(e) => setBusqueda(e.currentTarget.value)}
            rightSection={buscando ? <Loader size="xs" /> : null}
            data-autofocus
          />
          <Stack gap={6}>
            {resultados.map((a) => (
              <div
                key={a.id}
                className={classes.searchResult}
                onClick={() => elegir(a)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    elegir(a);
                  }
                }}
              >
                <div className={classes.searchResultName}>{a.nombre || 'Sin nombre'}</div>
                <div className={classes.searchResultDetail}>
                  {correoDe(a)} · Cuenta {a.numero_cuenta || '—'} · Folio {a.numero_folio || '—'} ·{' '}
                  {a.ingenieria || 'Sin ingeniería'}
                </div>
              </div>
            ))}
            {!buscando && busquedaDebounced.trim() && resultados.length === 0 && (
              <Text size="sm" c="dimmed">
                No se encontró otro alumno.
              </Text>
            )}
          </Stack>
        </Stack>
      )}

      {alumno && otro && (
        <Stack gap="md">
          <Text size="sm">
            Elige cuál se conserva. Todos los resultados, correos, cuenta y folio del otro pasan al que se conserva, y el otro
            se borra. <strong>No se puede deshacer.</strong>
          </Text>
          <Radio.Group value={conservar} onChange={setConservar}>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              {[alumno, otro].map((a) => (
                <Card
                  key={a.id}
                  withBorder
                  padding="md"
                  radius="md"
                  style={{
                    borderColor: conservar === String(a.id) ? 'var(--mantine-color-green-6)' : undefined,
                    cursor: 'pointer',
                  }}
                  onClick={() => setConservar(String(a.id))}
                >
                  <Stack gap="xs">
                    <Radio value={String(a.id)} label={conservar === String(a.id) ? 'Se conserva' : 'Se borra'} />
                    <FichaAlumno alumno={a} />
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          </Radio.Group>
          {error && (
            <Alert color="red" variant="light" icon={<IconInfoCircle size={18} />}>
              {error}
            </Alert>
          )}
          <Group justify="space-between">
            <Button variant="subtle" onClick={() => setOtro(null)} disabled={uniendo}>
              Elegir otro
            </Button>
            <Group>
              <Button variant="default" onClick={onClose} disabled={uniendo}>
                Cancelar
              </Button>
              <Button color="red" onClick={confirmar} loading={uniendo}>
                Unir alumnos
              </Button>
            </Group>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}

// ── Página ───────────────────────────────────────────────────────

export default function AdminListaAlumnos() {
  const { periodo } = usePeriodo();
  const [searchParams, setSearchParams] = useSearchParams();
  const filtroParam = searchParams.get('filtro');
  const filtro: FiltroAlumnos = esFiltro(filtroParam) ? filtroParam : 'todos';
  const [soloPeriodo, setSoloPeriodo] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const busquedaDebounced = useDebounced(busqueda);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AlumnoAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ingenierias, setIngenierias] = useState<Ingenieria[]>([]);
  const [editando, setEditando] = useState<AlumnoAdmin | null>(null);
  const [uniendo, setUniendo] = useState<AlumnoAdmin | null>(null);
  const ultimaConsulta = useRef(0);

  useEffect(() => {
    getProgramas()
      .then(setIngenierias)
      .catch(() => setIngenierias([]));
  }, []);

  const cargar = useCallback(async () => {
    const consulta = ++ultimaConsulta.current;
    setLoading(true);
    try {
      const r = await listarAlumnosAdmin({
        busqueda: busquedaDebounced.trim() || undefined,
        periodo: soloPeriodo ? periodo : undefined,
        filtro,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      if (consulta === ultimaConsulta.current) {
        setItems(r.items);
        setTotal(r.total);
        setError(null);
      }
    } catch (err) {
      if (consulta === ultimaConsulta.current) setError(errorTexto(err, 'No se pudo cargar la lista de alumnos'));
    } finally {
      if (consulta === ultimaConsulta.current) setLoading(false);
    }
  }, [busquedaDebounced, periodo, soloPeriodo, filtro, page]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    setPage(1);
  }, [busquedaDebounced, periodo, soloPeriodo, filtro]);

  const cambiarFiltro = (v: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (v === 'todos') next.delete('filtro');
        else next.set('filtro', v);
        return next;
      },
      { replace: true },
    );
  };

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div className={classes.welcome}>
        <Text component="h1" className={classes.welcomeTitle}>
          Alumnos · {periodo}
        </Text>
        <Text className={classes.welcomeSubtitle}>
          Corrige la cuenta, el folio o la ingeniería de un alumno, o une dos registros que son la misma persona.
        </Text>
      </div>

      <Card className={classes.card} padding="xl" radius="lg" mt="lg">
        <Stack gap="md">
          <Group gap="md" wrap="wrap" align="flex-end">
            <TextInput
              label="Buscar"
              placeholder="Nombre, correo, cuenta o folio"
              leftSection={<IconSearch size={16} />}
              value={busqueda}
              onChange={(e) => setBusqueda(e.currentTarget.value)}
              style={{ flex: 1, minWidth: 220 }}
            />
            <Switch
              label={`Solo ${periodo}`}
              description="Ingresaron o tienen exámenes en el periodo"
              checked={soloPeriodo}
              onChange={(e) => setSoloPeriodo(e.currentTarget.checked)}
              mb={4}
            />
          </Group>

          <SegmentedControl data={FILTROS} value={filtro} onChange={cambiarFiltro} style={{ alignSelf: 'flex-start' }} />
          {filtro === 'por_revisar' && (
            <Text size="xs" c="dimmed">
              Posibles duplicados (mismo nombre o marcados al registrarse) y alumnos sin número de cuenta. Las filas que
              no se pudieron registrar están en Reportes → "Alumnos por revisar".
            </Text>
          )}

          {aviso && (
            <Alert color="green" variant="light" withCloseButton onClose={() => setAviso(null)}>
              {aviso}
            </Alert>
          )}
          {error && (
            <Alert color="red" variant="light" icon={<IconInfoCircle size={18} />}>
              {error}
            </Alert>
          )}

          <Title order={5}>
            {total} alumno(s) {loading && <Loader size="xs" ml="xs" />}
          </Title>

          <div className={classes.scrollTable}>
            <table className={classes.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Cuenta</th>
                  <th>Folio</th>
                  <th>Ingeniería</th>
                  <th>Periodo</th>
                  <th>Exámenes</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: '#667085' }}>
                      Sin alumnos
                    </td>
                  </tr>
                ) : (
                  items.map((a) => (
                    <tr key={a.id}>
                      <td className={classes.wrapCell}>
                        {a.nombre || <Text span c="dimmed" size="sm">Sin nombre</Text>}
                        {a.es_provisional && (
                          <Badge size="xs" variant="light" color="orange" ml={6}>
                            Provisional
                          </Badge>
                        )}
                      </td>
                      <td className={classes.wrapCell}>{correoDe(a)}</td>
                      <td>{a.numero_cuenta || '—'}</td>
                      <td>{a.numero_folio || '—'}</td>
                      <td>{a.ingenieria || '—'}</td>
                      <td>{a.periodo_ingreso}</td>
                      <td>
                        <MarcasExamenes alumno={a} />
                      </td>
                      <td>
                        <Group gap={4} wrap="nowrap">
                          <Button
                            size="compact-xs"
                            variant="subtle"
                            leftSection={<IconPencil size={14} />}
                            onClick={() => setEditando(a)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="compact-xs"
                            variant="subtle"
                            color="grape"
                            leftSection={<IconArrowsJoin size={14} />}
                            onClick={() => setUniendo(a)}
                          >
                            Unir
                          </Button>
                        </Group>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className={classes.paginationBar}>
            <Button size="compact-xs" variant="default" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Anterior
            </Button>
            <Text className={classes.paginationInfo}>
              Página {Math.min(page, totalPaginas)} de {totalPaginas}
            </Text>
            <Button size="compact-xs" variant="default" disabled={page >= totalPaginas} onClick={() => setPage(page + 1)}>
              Siguiente
            </Button>
          </div>
        </Stack>
      </Card>

      <EditarModal
        alumno={editando}
        ingenierias={ingenierias}
        onClose={() => setEditando(null)}
        onGuardado={(actualizado) => {
          setItems((prev) => prev.map((a) => (a.id === actualizado.id ? actualizado : a)));
          setEditando(null);
          setAviso(`Se guardaron los datos de ${actualizado.nombre || 'el alumno'}.`);
        }}
      />

      <UnirModal
        alumno={uniendo}
        onClose={() => setUniendo(null)}
        onUnido={() => {
          setUniendo(null);
          setAviso('Los alumnos se unieron.');
          cargar();
        }}
      />
    </>
  );
}

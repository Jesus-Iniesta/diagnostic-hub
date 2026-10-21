import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import {
  IconArrowRight,
  IconArrowsJoin,
  IconCircleCheck,
  IconClipboardList,
  IconFileSpreadsheet,
  IconInfoCircle,
  IconPlayerPlay,
  IconSearch,
  IconUpload,
  IconWorld,
} from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';

import CorreccionModal from '../../components/CorreccionModal/CorreccionModal';
import UnirAlumnosModal from '../../components/UnirAlumnosModal/UnirAlumnosModal';
import { usePeriodo } from '../../contexts/PeriodoContext';
import type { AlumnoAdmin, ParejaDuplicada } from '../../lib/alumnosAdminApi';
import {
  corregirArchivo,
  guardarArchivo,
  juntarRepetidos,
  listarArchivos,
  obtenerRevision,
  procesarArchivo,
  type ArchivoGuardado,
  type FilaNoRegistrada,
  type ResumenArchivo,
  type RevisionPeriodo,
} from '../../lib/cargaPeriodoApi';
import { fetchPeriodoRango, type PeriodoRango } from '../../lib/configuracionApi';
import {
  exportarResultados,
  getRespuestaKeyStatus,
  getRespuestasCorrectas,
  saveRespuestasCorrectas,
} from '../../lib/diagnosticoApi';
import type { RespuestaCorrecta } from '../../types/diagnostico';
import classes from './AdminCargaAlumnos.module.css';

// ── Pasos y exámenes (en el orden en que se procesan, igual que el backend) ──

interface Examen {
  id: string;
  label: string;
}

interface PasoCarga {
  id: 'cuestionario' | 'diagnostico' | 'webassign';
  numero: number;
  titulo: string;
  descripcion: string;
  icono: typeof IconClipboardList;
  examenes: Examen[];
}

const PASOS_CARGA: PasoCarga[] = [
  {
    id: 'cuestionario',
    numero: 1,
    titulo: 'Examen diagnóstico',
    descripcion: 'Los dos cuestionarios de Google Forms (preguntas 1–10 y 11–20).',
    icono: IconClipboardList,
    examenes: [
      { id: 'cuestionario_1', label: 'Cuestionario 1' },
      { id: 'cuestionario_2', label: 'Cuestionario 2' },
    ],
  },
  {
    id: 'diagnostico',
    numero: 2,
    titulo: 'Examen final',
    descripcion: 'El archivo de Google Forms de cada materia.',
    icono: IconFileSpreadsheet,
    examenes: [
      { id: 'final_algebra', label: 'Álgebra' },
      { id: 'final_trigonometria', label: 'Trigonometría' },
      { id: 'final_geometria', label: 'Geometría' },
      { id: 'final_calculo', label: 'Cálculo' },
    ],
  },
  {
    id: 'webassign',
    numero: 3,
    titulo: 'WebAssign',
    descripcion: 'El reporte de WebAssign de cada carrera.',
    icono: IconWorld,
    examenes: ['ICI', 'ICO', 'IEL', 'IIA', 'IME', 'ISES'].map((c) => ({ id: `webassign_${c}`, label: c })),
  },
];

const ETIQUETA_COMPLETA: Record<string, string> = {
  cuestionario_1: 'Cuestionario 1',
  cuestionario_2: 'Cuestionario 2',
  final_algebra: 'Final Álgebra',
  final_trigonometria: 'Final Trigonometría',
  final_geometria: 'Final Geometría',
  final_calculo: 'Final Cálculo',
  ...Object.fromEntries(['ICI', 'ICO', 'IEL', 'IIA', 'IME', 'ISES'].map((c) => [`webassign_${c}`, `WebAssign ${c}`])),
};
const TODOS_LOS_EXAMENES = PASOS_CARGA.flatMap((p) => p.examenes.map((e) => e.id));

const TABS = ['cuestionario', 'diagnostico', 'webassign', 'procesar'] as const;
type TabId = (typeof TABS)[number];

function isTabId(value: string | null): value is TabId {
  return TABS.includes(value as TabId);
}

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function formatFechaHora(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

function errorTexto(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

function RangoPeriodoInfo({ periodo }: { periodo: string }) {
  const [rango, setRango] = useState<PeriodoRango | null>(null);

  useEffect(() => {
    let mounted = true;
    setRango(null);
    fetchPeriodoRango(periodo)
      .then((data) => {
        if (mounted) setRango(data);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [periodo]);

  return (
    <Text size="sm" c="dimmed">
      {rango && `Se toman las respuestas del ${formatFecha(rango.inicio)} al ${formatFecha(rango.fin)}`}
      {rango && ' · '}
      <Link to="/admin/configuracion">Cambiar en Configuración</Link>
    </Text>
  );
}

// ── Pasos 1 a 3: subir (solo guardar) ───────────────────────────

interface RanuraProps {
  examen: Examen;
  archivo: ArchivoGuardado | undefined;
  subiendo: boolean;
  deshabilitado: boolean;
  onArchivo: (examen: string, file: File) => void;
}

function RanuraArchivo({ examen, archivo, subiendo, deshabilitado, onArchivo }: RanuraProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const elegir = () => {
    if (!deshabilitado) inputRef.current?.click();
  };

  return (
    <div
      className={`${classes.dropzone} ${dragging ? classes.dropzoneActive : ''}`}
      style={{
        padding: '1rem',
        textAlign: 'left',
        cursor: deshabilitado ? 'default' : 'pointer',
        borderColor: archivo ? 'var(--mantine-color-green-5)' : undefined,
      }}
      onClick={elegir}
      onDragOver={(e) => {
        e.preventDefault();
        if (!deshabilitado) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && !deshabilitado) onArchivo(examen.id, file);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          elegir();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onArchivo(examen.id, file);
          e.target.value = '';
        }}
      />
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Text fw={600} size="sm" c={archivo ? 'green.8' : undefined}>
          {archivo ? '✓ ' : ''}
          {examen.label}
        </Text>
        {subiendo ? <Loader size="xs" /> : <IconUpload size={18} color="#667085" />}
      </Group>
      {archivo ? (
        <>
          <Text size="xs" className={classes.wrapCell} title={archivo.nombre_archivo}>
            {archivo.nombre_archivo}
          </Text>
          <Text size="xs" c="dimmed">
            Subido el {formatFechaHora(archivo.subido_en)} · clic para reemplazarlo
          </Text>
        </>
      ) : (
        <Text size="xs" c="dimmed">
          {subiendo ? 'Guardando…' : 'Arrastra el archivo o haz clic (.xlsx o .xls)'}
        </Text>
      )}
    </div>
  );
}

// ── Respuestas correctas del examen final (antes del paso 2) ─────

const MATERIAS_FINAL: Record<string, string> = {
  algebra: 'Álgebra',
  trigonometria: 'Trigonometría',
  geometria: 'Geometría',
  calculo: 'Cálculo Diferencial',
};

function RespuestasFinal({ periodo }: { periodo: string }) {
  const [config, setConfig] = useState<Record<string, { configurada: boolean; total_preguntas: number }>>({});
  const [editando, setEditando] = useState<string | null>(null);
  const [respuestas, setRespuestas] = useState<RespuestaCorrecta[]>([]);
  const [cargando, setCargando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargarEstado = useCallback(() => {
    getRespuestaKeyStatus(periodo)
      .then(setConfig)
      .catch(() => setConfig({}));
  }, [periodo]);

  useEffect(() => {
    cargarEstado();
  }, [cargarEstado]);

  const abrir = async (materia: string) => {
    setCargando(materia);
    setError(null);
    try {
      const r = await getRespuestasCorrectas(materia, periodo);
      setRespuestas(r.respuestas || []);
      setEditando(materia);
    } catch (err) {
      setError(errorTexto(err, 'Error al cargar las respuestas'));
    } finally {
      setCargando(null);
    }
  };

  const guardar = async () => {
    if (!editando) return;
    try {
      await saveRespuestasCorrectas({ materia: editando, periodo, respuestas });
      setEditando(null);
      cargarEstado();
    } catch (err) {
      setError(errorTexto(err, 'Error al guardar las respuestas'));
    }
  };

  const exportar = async () => {
    try {
      const blob = await exportarResultados(periodo);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `examen_final_${periodo}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(errorTexto(err, 'Error al exportar'));
    }
  };

  const faltan = Object.keys(MATERIAS_FINAL).filter((m) => !config[m]?.configurada);

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Text fw={600} size="sm">
          Respuestas correctas del periodo
        </Text>
        <Button size="compact-xs" variant="subtle" leftSection={<IconFileSpreadsheet size={14} />} onClick={exportar}>
          Exportar resultados del examen final
        </Button>
      </Group>
      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="xs">
        {Object.entries(MATERIAS_FINAL).map(([m, nombre]) => {
          const ok = config[m]?.configurada;
          return (
            <Button
              key={m}
              size="xs"
              variant="light"
              color={ok ? 'green' : 'orange'}
              loading={cargando === m}
              onClick={() => abrir(m)}
            >
              {ok ? '✓ ' : ''}
              {nombre}
            </Button>
          );
        })}
      </SimpleGrid>
      {faltan.length > 0 && (
        <Text size="xs" c="orange.8">
          Sin configurar en {periodo}: {faltan.map((m) => MATERIAS_FINAL[m]).join(', ')}. Se usará la clave por defecto.
        </Text>
      )}
      {error && (
        <Text size="xs" c="red">
          {error}
        </Text>
      )}

      <Modal
        opened={editando !== null}
        onClose={() => setEditando(null)}
        title={`Respuestas correctas — ${editando ? MATERIAS_FINAL[editando] : ''}`}
        size="lg"
        centered
      >
        <Stack gap="md">
          <div className={classes.scrollTable} style={{ maxHeight: 400 }}>
            <table className={classes.table}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Respuesta correcta</th>
                </tr>
              </thead>
              <tbody>
                {respuestas.map((r, idx) => (
                  <tr key={r.codigo}>
                    <td>{r.codigo}</td>
                    <td>
                      <Select
                        size="xs"
                        data={['a', 'b', 'c', 'd'].map((v) => ({ value: v, label: v.toUpperCase() }))}
                        value={r.respuesta_correcta}
                        onChange={(val) =>
                          setRespuestas((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], respuesta_correcta: val || '' };
                            return next;
                          })
                        }
                        style={{ width: 80 }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button color="green" onClick={guardar}>
              Guardar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

// ── Paso 4: procesar todo ────────────────────────────────────────

interface FilaResumen extends Partial<ResumenArchivo> {
  examen: string;
  etiqueta: string;
  error?: string;
}

const POR_PAGINA = 20;

/** Lista de los recuadros: buscador y páginas de 20. */
function ListaPaginada<T>({
  items,
  texto,
  encabezados,
  fila,
  vacio,
}: {
  items: T[];
  texto: (item: T) => string;
  encabezados: string[];
  fila: (item: T) => ReactNode;
  vacio: string;
}) {
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const q = busqueda.trim().toLowerCase();
  const filtrados = q ? items.filter((i) => texto(i).toLowerCase().includes(q)) : items;
  const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const actual = Math.min(pagina, paginas);
  const visibles = filtrados.slice((actual - 1) * POR_PAGINA, actual * POR_PAGINA);

  return (
    <Stack gap="sm">
      <TextInput
        placeholder="Buscar por nombre, correo, cuenta o folio"
        leftSection={<IconSearch size={16} />}
        value={busqueda}
        onChange={(e) => {
          setBusqueda(e.currentTarget.value);
          setPagina(1);
        }}
      />
      <div className={classes.scrollTable}>
        <table className={classes.table}>
          <thead>
            <tr>
              {encabezados.map((e) => (
                <th key={e}>{e}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 ? (
              <tr>
                <td colSpan={encabezados.length} style={{ textAlign: 'center', color: '#667085' }}>
                  {vacio}
                </td>
              </tr>
            ) : (
              visibles.map(fila)
            )}
          </tbody>
        </table>
      </div>
      {filtrados.length > POR_PAGINA && (
        <div className={classes.paginationBar}>
          <Button size="compact-xs" variant="default" disabled={actual <= 1} onClick={() => setPagina(actual - 1)}>
            Anterior
          </Button>
          <Text className={classes.paginationInfo}>
            Página {actual} de {paginas} · {filtrados.length} en total
          </Text>
          <Button size="compact-xs" variant="default" disabled={actual >= paginas} onClick={() => setPagina(actual + 1)}>
            Siguiente
          </Button>
        </div>
      )}
    </Stack>
  );
}

interface RecuadroProps {
  color: 'green' | 'yellow' | 'red';
  titulo: string;
  valor: number | null;
  detalle: string;
  abierto?: boolean;
  onClick?: () => void;
}

/** Recuadro gris, más chico: los sin cuenta no son trabajo del coordinador. */
function RecuadroSinCuenta({ valor, abierto, onClick }: { valor: number | null; abierto: boolean; onClick: () => void }) {
  const clicable = (valor ?? 0) > 0;
  const contenido = (
    <Group gap="xs" wrap="wrap">
      <Text size="sm" fw={700} c="gray.8">
        Sin número de cuenta: {valor === null ? '…' : valor.toLocaleString()}
      </Text>
      <Text size="sm" c="gray.7">
        — se completa cuando el alumno se registra
        {clicable && (abierto ? ' · ocultar' : ' · ver lista')}
      </Text>
    </Group>
  );
  const estilo = {
    display: 'block',
    width: '100%',
    padding: '0.6rem 1rem',
    borderRadius: 10,
    background: 'var(--mantine-color-gray-0)',
    border: `1px solid var(--mantine-color-gray-${abierto ? 6 : 3})`,
  };
  return clicable ? (
    <UnstyledButton style={estilo} onClick={onClick} aria-expanded={abierto}>
      {contenido}
    </UnstyledButton>
  ) : (
    <div style={estilo}>{contenido}</div>
  );
}

/** Recuadro grande; el amarillo y el rojo se abren con un clic si no están en 0. */
function Recuadro({ color, titulo, valor, detalle, abierto, onClick }: RecuadroProps) {
  const clicable = Boolean(onClick) && (valor ?? 0) > 0;
  const contenido = (
    <Stack gap={4}>
      <Text fw={600} size="sm" c={`${color}.9`}>
        {titulo}
      </Text>
      <Text fw={800} style={{ fontSize: 40, lineHeight: 1.1 }} c={`${color}.8`}>
        {valor === null ? '…' : valor.toLocaleString()}
      </Text>
      <Text size="xs" c={`${color}.9`}>
        {detalle}
        {clicable && (abierto ? ' · ocultar' : ' · ver lista')}
      </Text>
    </Stack>
  );
  const estilo = {
    display: 'block',
    width: '100%',
    padding: '1.25rem',
    borderRadius: 12,
    background: `var(--mantine-color-${color}-0)`,
    border: `2px solid var(--mantine-color-${color}-${abierto ? 6 : 3})`,
  };
  return clicable ? (
    <UnstyledButton style={estilo} onClick={onClick} aria-expanded={abierto}>
      {contenido}
    </UnstyledButton>
  ) : (
    <div style={estilo}>{contenido}</div>
  );
}

function correoDe(a: AlumnoAdmin): string {
  return a.correo_personal || a.correo_institucional || '—';
}

function textoAlumno(a: AlumnoAdmin): string {
  return [a.nombre, a.correo_personal, a.correo_institucional, a.numero_cuenta, a.numero_folio].join(' ');
}

/** Celda con los dos alumnos de una pareja, uno arriba del otro. */
function Dos({ a, b }: { a: ReactNode; b: ReactNode }) {
  return (
    <Stack gap={4}>
      <div>{a}</div>
      <div style={{ borderTop: '1px dashed var(--mantine-color-gray-4)', paddingTop: 4 }}>{b}</div>
    </Stack>
  );
}

interface ProcesarTodoProps {
  periodo: string;
  archivos: Record<string, ArchivoGuardado>;
  onProcesado: () => void;
}

function ProcesarTodo({ periodo, archivos, onProcesado }: ProcesarTodoProps) {
  const [procesando, setProcesando] = useState(false);
  const [progreso, setProgreso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resumen, setResumen] = useState<FilaResumen[] | null>(null);
  const [juntados, setJuntados] = useState<number | null>(null);
  // Filas sin registrar de cada examen (las de la segunda vuelta).
  const [filas, setFilas] = useState<Record<string, FilaNoRegistrada[]>>({});
  const [revision, setRevision] = useState<RevisionPeriodo | null>(null);
  const [abierto, setAbierto] = useState<'revisar' | 'rojo' | 'sin_cuenta' | null>(null);
  const [corrigiendo, setCorrigiendo] = useState<{ examen: string; fila: FilaNoRegistrada } | null>(null);
  const [uniendo, setUniendo] = useState<ParejaDuplicada | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // Al cambiar de periodo se limpia el resumen anterior.
  useEffect(() => {
    setResumen(null);
    setJuntados(null);
    setFilas({});
    setRevision(null);
    setAbierto(null);
    setAviso(null);
  }, [periodo]);

  const guardados = TODOS_LOS_EXAMENES.filter((e) => archivos[e]);
  const faltan = TODOS_LOS_EXAMENES.filter((e) => !archivos[e]);

  const cargarRevision = useCallback(async () => {
    try {
      setRevision(await obtenerRevision(periodo));
    } catch (err) {
      setError(errorTexto(err, 'No se pudo cargar lo que hay por revisar'));
    }
  }, [periodo]);

  const procesarTodo = async () => {
    if (guardados.length === 0) return;
    setProcesando(true);
    setError(null);
    setAviso(null);
    setResumen(null);
    setJuntados(null);
    setFilas({});
    setRevision(null);
    setAbierto(null);

    // Primera vuelta: registra y empareja; sus números son los de la tabla.
    const primera: FilaResumen[] = [];
    const detalle: Record<string, FilaNoRegistrada[]> = {};
    for (const [i, examen] of guardados.entries()) {
      setProgreso(`Primera vuelta: ${ETIQUETA_COMPLETA[examen]} (${i + 1} de ${guardados.length})`);
      try {
        const r = await procesarArchivo(periodo, examen);
        primera.push(r);
        detalle[examen] = r.no_registrados_detalle;
      } catch (err) {
        primera.push({ examen, etiqueta: ETIQUETA_COMPLETA[examen], error: errorTexto(err, 'Error al procesar') });
      }
    }

    // Segunda vuelta: junta a los alumnos que ahora se reconocen como la misma
    // persona y vuelve a pasar los archivos para acomodar sus resultados.
    let total: number | null = null;
    try {
      setProgreso('Segunda vuelta: buscando alumnos registrados dos veces');
      total = (await juntarRepetidos(periodo)).juntados;
      for (const [i, examen] of guardados.entries()) {
        if (primera[i]?.error) continue;
        setProgreso(`Segunda vuelta: ${ETIQUETA_COMPLETA[examen]} (${i + 1} de ${guardados.length})`);
        detalle[examen] = (await procesarArchivo(periodo, examen)).no_registrados_detalle;
      }
    } catch (err) {
      setError(`La segunda vuelta no terminó: ${errorTexto(err, 'error desconocido')}`);
    }

    setProgreso('Contando alumnos y lo que hay por revisar');
    await cargarRevision();
    setResumen(primera);
    setJuntados(total);
    setFilas(detalle);
    setProgreso(null);
    setProcesando(false);
    onProcesado();
  };

  const corregible = (examen: string) => resumen?.find((r) => r.examen === examen)?.corregible ?? false;

  // Se asigna en cuanto se elige el alumno en "Corregir".
  const asignar = async (examen: string, indice: number, alumnoId: number) => {
    setError(null);
    setAviso(null);
    try {
      const r = await corregirArchivo(periodo, examen, [{ indice, alumno_id: alumnoId }]);
      if (r.omitidas_ya_tenian_resultado.length > 0) {
        setAviso(`${ETIQUETA_COMPLETA[examen]}: no se asignó porque ese alumno ya tenía resultado.`);
        return;
      }
      setFilas((prev) => ({ ...prev, [examen]: (prev[examen] ?? []).filter((f) => f.indice !== indice) }));
      setAviso(`${ETIQUETA_COMPLETA[examen]}: se asignó la fila.`);
      await cargarRevision();
      onProcesado();
    } catch (err) {
      setError(errorTexto(err, 'No se pudo asignar la fila'));
    }
  };

  // Por revisar: solo los posibles duplicados (lo que el coordinador sí revisa).
  const casosRevisar: ParejaDuplicada[] = revision?.posibles_duplicados ?? [];
  const sinCuenta: AlumnoAdmin[] = revision?.sin_cuenta ?? [];
  const noRegistradas = guardados.flatMap((examen) => (filas[examen] ?? []).map((fila) => ({ examen, fila })));
  const todoListo = revision !== null && casosRevisar.length === 0 && noRegistradas.length === 0;

  return (
    <Stack gap="lg">
      <div>
        <Text fw={600} size="sm" mb="xs">
          Archivos del periodo ({guardados.length} de {TODOS_LOS_EXAMENES.length})
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing={6}>
          {TODOS_LOS_EXAMENES.map((e) => (
            <Group key={e} gap={6} wrap="nowrap">
              {archivos[e] ? (
                <Text size="sm" c="green.8" fw={600}>
                  ✓
                </Text>
              ) : (
                <Badge size="xs" color="orange" variant="light">
                  falta
                </Badge>
              )}
              <Text size="sm">{ETIQUETA_COMPLETA[e]}</Text>
              {archivos[e]?.procesado && (
                <Text size="xs" c="dimmed">
                  · procesado
                </Text>
              )}
            </Group>
          ))}
        </SimpleGrid>
      </div>

      {faltan.length > 0 && guardados.length > 0 && (
        <Alert color="orange" variant="light" radius="md" icon={<IconInfoCircle size={18} />}>
          Faltan {faltan.length} archivo(s): {faltan.map((e) => ETIQUETA_COMPLETA[e]).join(', ')}. Puedes procesar los
          que hay y subir los demás después.
        </Alert>
      )}
      {guardados.length === 0 && (
        <Alert color="gray" variant="light" radius="md" icon={<IconInfoCircle size={18} />}>
          Aún no hay archivos guardados en {periodo}. Súbelos en los pasos 1 a 3.
        </Alert>
      )}

      <Group justify="flex-end">
        <Button
          size="md"
          leftSection={<IconPlayerPlay size={18} />}
          onClick={procesarTodo}
          loading={procesando}
          disabled={procesando || guardados.length === 0}
        >
          Procesar todo
        </Button>
      </Group>

      {progreso && (
        <Alert color="blue" variant="light" radius="md" icon={<Loader size="xs" />}>
          {progreso}
        </Alert>
      )}
      {error && (
        <Alert color="red" variant="light" radius="md" icon={<IconInfoCircle size={18} />} withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {aviso && (
        <Alert color="green" variant="light" radius="md" withCloseButton onClose={() => setAviso(null)}>
          {aviso}
        </Alert>
      )}

      {resumen && (
        <Card padding="md" radius="md" className={classes.expandCard}>
          <Stack gap="md">
            <Group justify="space-between" wrap="wrap">
              <Text fw={600} size="sm">
                Resumen del periodo {periodo}
              </Text>
              {juntados !== null && (
                <Badge color={juntados > 0 ? 'blue' : 'gray'} variant="light" size="lg">
                  {juntados} alumno(s) juntados en la segunda vuelta
                </Badge>
              )}
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <Recuadro
                color="green"
                titulo="Alumnos del periodo"
                valor={revision?.alumnos_del_periodo ?? null}
                detalle="Con algún examen"
              />
              <Recuadro
                color="yellow"
                titulo="Por revisar"
                valor={revision ? casosRevisar.length : null}
                detalle="Posibles duplicados"
                abierto={abierto === 'revisar'}
                onClick={() => setAbierto(abierto === 'revisar' ? null : 'revisar')}
              />
              <Recuadro
                color="red"
                titulo="No se pudieron registrar"
                valor={noRegistradas.length}
                detalle="Filas sin correo, cuenta ni folio"
                abierto={abierto === 'rojo'}
                onClick={() => setAbierto(abierto === 'rojo' ? null : 'rojo')}
              />
            </SimpleGrid>

            <RecuadroSinCuenta
              valor={revision ? sinCuenta.length : null}
              abierto={abierto === 'sin_cuenta'}
              onClick={() => setAbierto(abierto === 'sin_cuenta' ? null : 'sin_cuenta')}
            />

            {todoListo && (
              <Alert color="green" variant="light" radius="md" icon={<IconCircleCheck size={18} />}>
                <Group justify="space-between" wrap="wrap" gap="sm">
                  <Text size="sm" fw={600}>
                    Todo listo: ya puedes descargar el CREANI
                  </Text>
                  <Button component={Link} to="/admin/reportes" size="xs" color="green" rightSection={<IconArrowRight size={14} />}>
                    Ir a Reportes
                  </Button>
                </Group>
              </Alert>
            )}

            {abierto === 'revisar' && casosRevisar.length > 0 && (
              <Card padding="md" radius="md" withBorder style={{ borderColor: 'var(--mantine-color-yellow-4)' }}>
                <Text fw={600} size="sm" mb="sm">
                  Por revisar: posibles duplicados ({casosRevisar.length})
                </Text>
                <ListaPaginada
                  items={casosRevisar}
                  texto={(c) => `${textoAlumno(c.alumno)} ${textoAlumno(c.otro)}`}
                  encabezados={['Nombre', 'Correo', 'Cuenta', 'Folio', 'Examen', 'Motivo', 'Acción']}
                  vacio="Nada coincide con la búsqueda"
                  fila={(c) => {
                    const { alumno: a, otro: b, motivo } = c;
                    return (
                      <tr key={`d-${a.id}-${b.id}`}>
                        <td className={classes.wrapCell}>
                          <Dos a={a.nombre || 'Sin nombre'} b={b.nombre || 'Sin nombre'} />
                        </td>
                        <td className={classes.wrapCell}>
                          <Dos a={correoDe(a)} b={correoDe(b)} />
                        </td>
                        <td>
                          <Dos a={a.numero_cuenta || '—'} b={b.numero_cuenta || '—'} />
                        </td>
                        <td>
                          <Dos a={a.numero_folio || '—'} b={b.numero_folio || '—'} />
                        </td>
                        <td className={classes.wrapCell}>
                          <Dos a={a.examenes.join(', ') || '—'} b={b.examenes.join(', ') || '—'} />
                        </td>
                        <td className={classes.wrapCell}>{motivo}</td>
                        <td>
                          <Button
                            size="compact-xs"
                            color="grape"
                            leftSection={<IconArrowsJoin size={14} />}
                            onClick={() => setUniendo(c)}
                          >
                            Unir
                          </Button>
                        </td>
                      </tr>
                    );
                  }}
                />
              </Card>
            )}

            {abierto === 'sin_cuenta' && sinCuenta.length > 0 && (
              <Card padding="md" radius="md" withBorder>
                <Text fw={600} size="sm" mb="sm">
                  Sin número de cuenta ({sinCuenta.length})
                </Text>
                <ListaPaginada
                  items={sinCuenta}
                  texto={textoAlumno}
                  encabezados={['Nombre', 'Correo', 'Folio', 'Examen']}
                  vacio="Nada coincide con la búsqueda"
                  fila={(a) => (
                    <tr key={a.id}>
                      <td className={classes.wrapCell}>{a.nombre || 'Sin nombre'}</td>
                      <td className={classes.wrapCell}>{correoDe(a)}</td>
                      <td>{a.numero_folio || '—'}</td>
                      <td className={classes.wrapCell}>{a.examenes.join(', ') || '—'}</td>
                    </tr>
                  )}
                />
              </Card>
            )}

            {abierto === 'rojo' && noRegistradas.length > 0 && (
              <Card padding="md" radius="md" withBorder style={{ borderColor: 'var(--mantine-color-red-4)' }}>
                <Text fw={600} size="sm" mb="sm">
                  No se pudieron registrar ({noRegistradas.length})
                </Text>
                <ListaPaginada
                  items={noRegistradas}
                  texto={({ fila }) => [fila.nombre_original, fila.correo, fila.cuenta, fila.folio].join(' ')}
                  encabezados={['Nombre', 'Correo', 'Cuenta', 'Folio', 'Examen', 'Motivo', 'Acción']}
                  vacio="Nada coincide con la búsqueda"
                  fila={({ examen, fila }) => (
                    <tr key={`${examen}-${fila.indice}`}>
                      <td className={classes.wrapCell}>{fila.nombre_original || '—'}</td>
                      <td className={classes.wrapCell}>{fila.correo || '—'}</td>
                      <td>{fila.cuenta || '—'}</td>
                      <td>{fila.folio || '—'}</td>
                      <td className={classes.wrapCell}>{ETIQUETA_COMPLETA[examen]}</td>
                      <td className={classes.wrapCell}>{fila.motivo}</td>
                      <td>
                        {corregible(examen) ? (
                          <Button size="compact-xs" variant="light" onClick={() => setCorrigiendo({ examen, fila })}>
                            Corregir
                          </Button>
                        ) : (
                          <Text size="xs" c="dimmed" title="Las filas de WebAssign no se pueden asignar a mano">
                            —
                          </Text>
                        )}
                      </td>
                    </tr>
                  )}
                />
              </Card>
            )}

            <div className={classes.scrollTable}>
              <table className={classes.table}>
                <thead>
                  <tr>
                    <th>Examen</th>
                    <th>Encontrados</th>
                    <th>Registrados nuevos</th>
                    <th>Omitidas</th>
                    <th>Repetidos</th>
                    <th>No se pudieron registrar</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.map((f) => (
                    <tr key={f.examen}>
                      <td>{f.etiqueta}</td>
                      {f.error ? (
                        <td colSpan={5} className={classes.wrapCell} style={{ color: 'var(--mantine-color-red-7)' }}>
                          {f.error}
                        </td>
                      ) : (
                        <>
                          <td>
                            {f.encontrados}
                            {(f.unidos_por_nombre ?? 0) > 0 && (
                              <Text span size="xs" c="dimmed">
                                {' '}
                                ({f.unidos_por_nombre} por nombre)
                              </Text>
                            )}
                          </td>
                          <td>{f.registrados_nuevos}</td>
                          <td>{f.omitidas ?? 0}</td>
                          <td>{f.repetidos ?? 0}</td>
                          <td>{(filas[f.examen] ?? []).length}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Text size="xs" c="dimmed">
              Omitidas: filas de otro periodo. Repetidos: filas de más del mismo alumno (se queda una). Todo esto también
              sale en Reportes → "Alumnos por revisar".
            </Text>
          </Stack>
        </Card>
      )}

      <CorreccionModal
        opened={corrigiendo !== null}
        onClose={() => setCorrigiendo(null)}
        item={
          corrigiendo
            ? {
                ...corrigiendo.fila,
                cuenta: corrigiendo.fila.cuenta ?? null,
                folio: corrigiendo.fila.folio ?? null,
              }
            : null
        }
        periodo={periodo}
        onAsignar={(indice, alumnoId) => {
          if (corrigiendo) asignar(corrigiendo.examen, indice, alumnoId);
        }}
      />

      <UnirAlumnosModal
        alumno={uniendo?.alumno ?? null}
        otroInicial={uniendo?.otro ?? null}
        onClose={() => setUniendo(null)}
        onUnido={() => {
          setUniendo(null);
          setAviso('Los alumnos se unieron.');
          cargarRevision();
        }}
      />
    </Stack>
  );
}

// ── Página ───────────────────────────────────────────────────────

export default function AdminCargaExamenes() {
  const { periodo } = usePeriodo();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: TabId = isTabId(tabParam) ? tabParam : 'cuestionario';

  const [archivos, setArchivos] = useState<Record<string, ArchivoGuardado>>({});
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ultimaConsulta = useRef(0);

  const cargarArchivos = useCallback(async () => {
    const consulta = ++ultimaConsulta.current;
    setCargando(true);
    try {
      const lista = await listarArchivos(periodo);
      if (consulta === ultimaConsulta.current) setArchivos(Object.fromEntries(lista.map((a) => [a.examen, a])));
    } catch (err) {
      if (consulta === ultimaConsulta.current) {
        setArchivos({});
        setError(errorTexto(err, 'No se pudieron cargar los archivos guardados'));
      }
    } finally {
      if (consulta === ultimaConsulta.current) setCargando(false);
    }
  }, [periodo]);

  useEffect(() => {
    setError(null);
    cargarArchivos();
  }, [cargarArchivos]);

  const irA = (value: string | null) => {
    if (!isTabId(value)) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', value);
        return next;
      },
      { replace: true },
    );
  };

  const handleArchivo = async (examen: string, file: File) => {
    if (!/\.xlsx?$/i.test(file.name)) {
      setError('Solo se permiten archivos .xlsx o .xls');
      return;
    }
    setError(null);
    setSubiendo(examen);
    try {
      const guardado = await guardarArchivo(periodo, examen, file);
      setArchivos((prev) => ({ ...prev, [examen]: guardado }));
    } catch (err) {
      setError(errorTexto(err, 'No se pudo guardar el archivo'));
    } finally {
      setSubiendo(null);
    }
  };

  // Enlaces viejos a la pestaña de alumnos: ahora son las herramientas de prueba.
  if (tabParam === 'alumnos') {
    return <Navigate to="/admin/herramientas" replace />;
  }

  const guardadosDe = (paso: PasoCarga) => paso.examenes.filter((e) => archivos[e.id]).length;
  const completo = (paso: PasoCarga) => guardadosDe(paso) === paso.examenes.length;
  const lista = Object.values(archivos);
  const procesado = lista.length > 0 && lista.every((a) => a.procesado);

  return (
    <>
      <div className={classes.welcome}>
        <Text component="h1" className={classes.welcomeTitle}>
          Carga de exámenes · {periodo}
        </Text>
        <Text className={classes.welcomeSubtitle}>
          Sube los archivos paso por paso (solo se guardan) y al final presiona "Procesar todo".
        </Text>
        <RangoPeriodoInfo periodo={periodo} />
      </div>

      {error && (
        <Alert color="red" variant="light" radius="md" mt="md" icon={<IconInfoCircle size={18} />} withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Tabs value={activeTab} onChange={irA} mt="lg">
        <Tabs.List>
          {PASOS_CARGA.map((paso) => (
            <Tabs.Tab
              key={paso.id}
              value={paso.id}
              leftSection={completo(paso) ? <IconCircleCheck size={16} color="var(--mantine-color-green-6)" /> : <paso.icono size={16} />}
            >
              {paso.numero}. {paso.titulo}
            </Tabs.Tab>
          ))}
          <Tabs.Tab
            value="procesar"
            leftSection={procesado ? <IconCircleCheck size={16} color="var(--mantine-color-green-6)" /> : <IconPlayerPlay size={16} />}
          >
            4. Procesar todo
          </Tabs.Tab>
        </Tabs.List>

        {PASOS_CARGA.map((paso, i) => (
          <Tabs.Panel key={paso.id} value={paso.id} pt="md">
            <Card className={classes.card} padding="xl" radius="lg">
              <Stack gap="lg">
                <Group justify="space-between" align="flex-start" wrap="wrap">
                  <div>
                    <Title order={3} className={classes.title}>
                      Paso {paso.numero} · {paso.titulo}
                    </Title>
                    <Text className={classes.subtitle}>
                      {paso.descripcion} Al subir un archivo solo se guarda; si subes otro del mismo examen, reemplaza
                      al anterior.
                    </Text>
                  </div>
                  <Badge size="lg" variant="light" color={completo(paso) ? 'green' : 'gray'}>
                    {cargando ? '…' : `${guardadosDe(paso)} de ${paso.examenes.length}`}
                  </Badge>
                </Group>

                {paso.id === 'diagnostico' && <RespuestasFinal periodo={periodo} />}

                <SimpleGrid cols={{ base: 1, sm: 2, md: paso.examenes.length > 4 ? 3 : paso.examenes.length }} spacing="sm">
                  {paso.examenes.map((examen) => (
                    <RanuraArchivo
                      key={examen.id}
                      examen={examen}
                      archivo={archivos[examen.id]}
                      subiendo={subiendo === examen.id}
                      deshabilitado={subiendo !== null}
                      onArchivo={handleArchivo}
                    />
                  ))}
                </SimpleGrid>

                <Group justify="flex-end">
                  <Button rightSection={<IconArrowRight size={16} />} onClick={() => irA(TABS[i + 1])}>
                    Siguiente paso
                  </Button>
                </Group>
              </Stack>
            </Card>
          </Tabs.Panel>
        ))}

        <Tabs.Panel value="procesar" pt="md">
          <Card className={classes.card} padding="xl" radius="lg">
            <Stack gap="lg">
              <div>
                <Title order={3} className={classes.title}>
                  Paso 4 · Procesar todo
                </Title>
                <Text className={classes.subtitle}>
                  Procesa los archivos guardados en orden (cuestionarios → finales → WebAssign) y da una segunda vuelta
                  para juntar a los alumnos que se registraron dos veces. Los alumnos que no existen se registran solos.
                </Text>
              </div>
              <ProcesarTodo periodo={periodo} archivos={archivos} onProcesado={cargarArchivos} />
            </Stack>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </>
  );
}

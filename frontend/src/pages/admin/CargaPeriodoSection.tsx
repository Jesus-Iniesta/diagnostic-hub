import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconInfoCircle, IconPlayerPlay, IconUpload } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  guardarArchivo,
  juntarRepetidos,
  listarArchivos,
  procesarArchivo,
  type ArchivoGuardado,
  type ResumenArchivo,
} from '../../lib/cargaPeriodoApi';
import { getCurrentPeriodo } from '../../lib/periodo';
import classes from './AdminCargaAlumnos.module.css';

interface Examen {
  id: string;
  label: string;
}

// En el orden en que se procesan (igual que en el backend).
const GRUPOS: { titulo: string; examenes: Examen[] }[] = [
  {
    titulo: 'Examen diagnóstico',
    examenes: [
      { id: 'cuestionario_1', label: 'Cuestionario 1' },
      { id: 'cuestionario_2', label: 'Cuestionario 2' },
    ],
  },
  {
    titulo: 'Examen final',
    examenes: [
      { id: 'final_algebra', label: 'Final Álgebra' },
      { id: 'final_trigonometria', label: 'Final Trigonometría' },
      { id: 'final_geometria', label: 'Final Geometría' },
      { id: 'final_calculo', label: 'Final Cálculo' },
    ],
  },
  {
    titulo: 'WebAssign por carrera',
    examenes: ['ICI', 'ICO', 'IEL', 'IIA', 'IME', 'ISES'].map((c) => ({
      id: `webassign_${c}`,
      label: `WebAssign ${c}`,
    })),
  },
];
const EXAMENES = GRUPOS.flatMap((g) => g.examenes);

interface FilaResumen extends Partial<ResumenArchivo> {
  examen: string;
  etiqueta: string;
  error?: string;
}

function formatFechaHora(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

function errorTexto(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

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
      style={{ padding: '0.75rem', textAlign: 'left', cursor: deshabilitado ? 'default' : 'pointer' }}
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
            Subido el {formatFechaHora(archivo.subido_en)}
          </Text>
        </>
      ) : (
        <Text size="xs" c="dimmed">
          {subiendo ? 'Guardando…' : 'Arrastra o haz clic para subir'}
        </Text>
      )}
    </div>
  );
}

export default function CargaPeriodoSection() {
  const [periodo, setPeriodo] = useState(getCurrentPeriodo());
  const [archivos, setArchivos] = useState<Record<string, ArchivoGuardado>>({});
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [procesando, setProcesando] = useState(false);
  const [progreso, setProgreso] = useState<string | null>(null);
  const [resumen, setResumen] = useState<FilaResumen[] | null>(null);
  const [juntados, setJuntados] = useState<number | null>(null);
  const [periodoResumen, setPeriodoResumen] = useState('');

  // Solo se aplica la respuesta de la última consulta (el periodo se escribe a mano).
  const ultimaConsulta = useRef(0);

  const cargarArchivos = useCallback(async () => {
    const consulta = ++ultimaConsulta.current;
    const p = periodo.trim();
    if (!p) {
      setArchivos({});
      return;
    }
    setCargando(true);
    try {
      const lista = await listarArchivos(p);
      if (consulta === ultimaConsulta.current) {
        setArchivos(Object.fromEntries(lista.map((a) => [a.examen, a])));
      }
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
    const t = setTimeout(() => {
      cargarArchivos();
    }, 400);
    return () => clearTimeout(t);
  }, [cargarArchivos]);

  const handleArchivo = async (examen: string, file: File) => {
    if (!/\.xlsx?$/i.test(file.name)) {
      setError('Solo se permiten archivos .xlsx o .xls');
      return;
    }
    setError(null);
    setSubiendo(examen);
    try {
      const guardado = await guardarArchivo(periodo.trim(), examen, file);
      setArchivos((prev) => ({ ...prev, [examen]: guardado }));
    } catch (err) {
      setError(errorTexto(err, 'No se pudo guardar el archivo'));
    } finally {
      setSubiendo(null);
    }
  };

  const guardados = EXAMENES.filter((e) => archivos[e.id]);

  const procesarTodo = async () => {
    const p = periodo.trim();
    if (!p || guardados.length === 0) return;
    setProcesando(true);
    setError(null);
    setResumen(null);
    setJuntados(null);
    setPeriodoResumen(p);

    // Primera vuelta: registra y empareja; su resultado es el que se muestra.
    const filas: FilaResumen[] = [];
    for (const [i, examen] of guardados.entries()) {
      setProgreso(`Primera vuelta: ${examen.label} (${i + 1} de ${guardados.length})`);
      try {
        filas.push(await procesarArchivo(p, examen.id));
      } catch (err) {
        filas.push({ examen: examen.id, etiqueta: examen.label, error: errorTexto(err, 'Error al procesar') });
      }
    }

    // Segunda vuelta: junta a los alumnos que ahora se reconocen como la misma
    // persona y vuelve a pasar los archivos para acomodar sus resultados.
    let total: number | null = null;
    try {
      setProgreso('Segunda vuelta: buscando alumnos registrados dos veces');
      total = (await juntarRepetidos(p)).juntados;
      for (const [i, examen] of guardados.entries()) {
        if (filas[i]?.error) continue;
        setProgreso(`Segunda vuelta: ${examen.label} (${i + 1} de ${guardados.length})`);
        await procesarArchivo(p, examen.id);
      }
    } catch (err) {
      setError(`La segunda vuelta no terminó: ${errorTexto(err, 'error desconocido')}`);
    }

    setResumen(filas);
    setJuntados(total);
    setProgreso(null);
    setProcesando(false);
  };

  const hayNoRegistrados = (resumen ?? []).some((f) => (f.no_registrados ?? 0) > 0);

  return (
    <Card className={classes.card} padding="xl" radius="lg">
      <Stack gap="lg">
        <div>
          <Title order={3} className={classes.title}>
            Carga completa del periodo
          </Title>
          <Text className={classes.subtitle}>
            Sube todos los archivos del periodo (se guardan sin procesar; si subes otro del mismo examen, reemplaza al
            anterior) y después presiona "Procesar todo". Los alumnos que no existan se registran solos.
          </Text>
        </div>

        <Group gap="md" align="flex-end" wrap="wrap">
          <TextInput
            label="Periodo"
            value={periodo}
            onChange={(e) => setPeriodo(e.currentTarget.value)}
            style={{ width: 140 }}
            size="sm"
            disabled={procesando}
          />
          {cargando && <Loader size="xs" mb={8} />}
        </Group>

        {GRUPOS.map((grupo) => (
          <div key={grupo.titulo}>
            <Text fw={600} size="sm" mb="xs">
              {grupo.titulo}
            </Text>
            <SimpleGrid cols={{ base: 1, xs: 2, md: grupo.examenes.length > 4 ? 3 : grupo.examenes.length }} spacing="sm">
              {grupo.examenes.map((examen) => (
                <RanuraArchivo
                  key={examen.id}
                  examen={examen}
                  archivo={archivos[examen.id]}
                  subiendo={subiendo === examen.id}
                  deshabilitado={procesando || subiendo !== null || !periodo.trim()}
                  onArchivo={handleArchivo}
                />
              ))}
            </SimpleGrid>
          </div>
        ))}

        <Group justify="space-between" wrap="wrap">
          <Text size="sm" c="dimmed">
            {guardados.length} de {EXAMENES.length} archivos guardados
            {guardados.length > 0 && guardados.length < EXAMENES.length && ' · se procesarán los que haya'}
          </Text>
          <Button
            leftSection={<IconPlayerPlay size={18} />}
            onClick={procesarTodo}
            loading={procesando}
            disabled={procesando || subiendo !== null || guardados.length === 0}
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

        {resumen && (
          <Card padding="md" radius="md" className={classes.expandCard}>
            <Group justify="space-between" mb="sm" wrap="wrap">
              <Text fw={600} size="sm">
                Resumen del periodo {periodoResumen}
              </Text>
              {juntados !== null && (
                <Badge color={juntados > 0 ? 'blue' : 'gray'} variant="light" size="lg">
                  {juntados} alumno(s) juntados en la segunda vuelta
                </Badge>
              )}
            </Group>
            <div className={classes.scrollTable}>
              <table className={classes.table}>
                <thead>
                  <tr>
                    <th>Examen</th>
                    <th>Encontrados</th>
                    <th>Registrados nuevos</th>
                    <th>No se pudieron registrar</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.map((f) => (
                    <tr key={f.examen}>
                      <td>{f.etiqueta}</td>
                      {f.error ? (
                        <td colSpan={3} className={classes.wrapCell} style={{ color: 'var(--mantine-color-red-7)' }}>
                          {f.error}
                        </td>
                      ) : (
                        <>
                          <td>{f.encontrados}</td>
                          <td>{f.registrados_nuevos}</td>
                          <td>{f.no_registrados}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hayNoRegistrados && (
              <Text size="xs" c="dimmed" mt="sm">
                Las filas que no se pudieron registrar no traen correo, cuenta ni folio. Revísalas en Reportes → "Alumnos por revisar".
              </Text>
            )}
          </Card>
        )}
      </Stack>
    </Card>
  );
}

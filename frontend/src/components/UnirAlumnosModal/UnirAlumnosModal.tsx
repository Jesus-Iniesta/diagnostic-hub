import { Alert, Badge, Button, Card, Group, Loader, Modal, Radio, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { IconInfoCircle, IconSearch } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import { listarAlumnosAdmin, unirAlumnos, type AlumnoAdmin } from '../../lib/alumnosAdminApi';
import classes from '../../pages/admin/AdminCargaAlumnos.module.css';

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

// ── Unir dos alumnos ─────────────────────────────────────────────

export function FichaAlumno({ alumno }: { alumno: AlumnoAdmin }) {
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
  /** El otro registro, si ya se sabe (posibles duplicados): se salta la búsqueda. */
  otroInicial?: AlumnoAdmin | null;
  onClose: () => void;
  onUnido: () => void;
}

export default function UnirAlumnosModal({ alumno, otroInicial = null, onClose, onUnido }: UnirModalProps) {
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
    setError(null);
    if (alumno && otroInicial) elegir(otroInicial, alumno);
    else setOtro(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alumno, otroInicial]);

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

  function elegir(a: AlumnoAdmin, base: AlumnoAdmin | null = alumno) {
    if (!base) return;
    setOtro(a);
    // Por defecto se conserva el que no es provisional (el del padrón).
    setConservar(String(base.es_provisional && !a.es_provisional ? a.id : base.id));
  }

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
            <Button variant="subtle" onClick={() => setOtro(null)} disabled={uniendo || otroInicial !== null}>
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

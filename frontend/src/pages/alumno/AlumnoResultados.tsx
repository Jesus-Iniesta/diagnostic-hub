import {
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconArrowRight,
  IconAward,
  IconClipboardList,
  IconDownload,
  IconInfoCircle,
  IconTrophy,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  descargarResultadoPdf,
  fetchMiCuestionario,
  fetchMiDiagnostico,
  fetchMiIndiceFi,
  fetchMiPerfil,
  fetchMiWebAssign,
} from '../../lib/alumnoApi';
import { dashboardColors } from '../../theme/theme';
import type {
  CuestionarioAlumnoResponse,
  CuestionarioMateriaResultado,
  DiagnosticoAlumnoResponse,
  IndiceFiAlumno,
  MateriaResultado,
  WebAssignAlumnoResponse,
  WebAssignMateriaResultado,
} from '../../types/alumno';
import classes from './AlumnoResultados.module.css';

// Sin datos el ícono de la materia se ve gris.
function colorMateria(tieneDatos: boolean): string {
  return tieneDatos ? dashboardColors.blue : '#9ca3af';
}

const MATERIA_ICONS: Record<string, string> = {
  algebra: 'A',
  trigonometria: 'T',
  geometria: 'G',
  calculo: 'C',
};

function ScoreBar({ puntaje, maximo }: { puntaje: number | null; maximo: number }) {
  const pct = puntaje !== null ? (puntaje / maximo) * 100 : 0;
  const color =
    pct >= 90
      ? dashboardColors.green
      : pct >= 70
        ? dashboardColors.blue
        : pct >= 45
          ? dashboardColors.orange
          : dashboardColors.red;

  return (
    <div className={classes.barTrack}>
      <div
        className={classes.barFill}
        style={{
          width: `${pct}%`,
          backgroundColor: puntaje !== null ? color : '#e5e7eb',
        }}
      />
    </div>
  );
}

function WebAssignMateriaCard({ materia }: { materia: WebAssignMateriaResultado }) {
  const isSinDatos = materia.nivel === 'Sin datos';
  const color = colorMateria(!isSinDatos);

  return (
    <Card className={classes.materiaCard} padding="lg" radius="lg">
      <Group gap="sm" wrap="nowrap" align="flex-start" mb="md">
        <span
          className={classes.materiaIcon}
          style={{
            backgroundColor: isSinDatos ? '#f3f4f6' : `${color}15`,
            color: isSinDatos ? '#9ca3af' : color,
          }}
        >
          {MATERIA_ICONS[materia.materia] ?? '?'}
        </span>
        <div style={{ flex: 1 }}>
          <Text fw={600} size="sm" c="dark">
            {materia.nombre}
          </Text>
        </div>
      </Group>

      <div className={classes.scoreSection}>
        <Group justify="space-between" mb={6}>
          <Text size="xs" c="dimmed">Trabajo</Text>
          <Text fw={700} size="sm" c="dark">
            {materia.trabajo !== null ? materia.trabajo.toFixed(1) : '—'}
            <Text component="span" size="xs" c="dimmed" fw={400}> / 10</Text>
          </Text>
        </Group>
        <ScoreBar puntaje={materia.trabajo} maximo={10} />
      </div>

      <div className={classes.scoreSection} style={{ marginTop: '8px' }}>
        <Group justify="space-between" mb={6}>
          <Text size="xs" c="dimmed">Examen</Text>
          <Text fw={700} size="sm" c="dark">
            {materia.examen !== null ? materia.examen.toFixed(1) : '—'}
            <Text component="span" size="xs" c="dimmed" fw={400}> / 10</Text>
          </Text>
        </Group>
        <ScoreBar puntaje={materia.examen} maximo={10} />
      </div>

      <div className={classes.scoreSection} style={{ marginTop: '8px' }}>
        <Group justify="space-between" mb={6}>
          <Text size="xs" c="dimmed">Promedio materia</Text>
          <Text fw={700} size="sm" c="dark">
            {materia.promedio !== null ? materia.promedio.toFixed(1) : '—'}
            <Text component="span" size="xs" c="dimmed" fw={400}> / 10</Text>
          </Text>
        </Group>
        <ScoreBar puntaje={materia.promedio} maximo={10} />
      </div>

      {materia.retroalimentacion && (
        <>
          <Divider my="md" color="#F0F1F5" />
          <Text size="xs" c="dimmed" lh={1.5}>
            {materia.retroalimentacion}
          </Text>
        </>
      )}
    </Card>
  );
}

function CuestionarioMateriaCard({ materia }: { materia: CuestionarioMateriaResultado }) {
  const isSinDatos = materia.nivel === 'Sin datos';
  const color = colorMateria(!isSinDatos);
  const aciertos = (valor: number | null) =>
    valor !== null ? `${valor} / ${materia.preguntas_por_cuestionario}` : '—';

  return (
    <Card className={classes.materiaCard} padding="lg" radius="lg">
      <Group gap="sm" wrap="nowrap" align="flex-start" mb="md">
        <span
          className={classes.materiaIcon}
          style={{
            backgroundColor: isSinDatos ? '#f3f4f6' : `${color}15`,
            color: isSinDatos ? '#9ca3af' : color,
          }}
        >
          {MATERIA_ICONS[materia.materia] ?? '?'}
        </span>
        <div style={{ flex: 1 }}>
          <Text fw={600} size="sm" c="dark">
            {materia.nombre}
          </Text>
        </div>
      </Group>

      <div className={classes.scoreSection}>
        <Group justify="space-between" mb={6}>
          <Text size="xs" c="dimmed">
            Calificación
          </Text>
          <Text fw={700} size="lg" c="dark">
            {materia.calificacion !== null ? materia.calificacion.toFixed(1) : '—'}
            <Text component="span" size="xs" c="dimmed" fw={400}>
              {' '}/ {materia.maximo}
            </Text>
          </Text>
        </Group>
        <ScoreBar puntaje={materia.calificacion} maximo={materia.maximo} />
      </div>

      <Divider my="md" color="#F0F1F5" />
      <Group justify="space-between">
        <Text size="xs" c="dimmed">Cuestionario 1</Text>
        <Text size="xs" fw={600} c="dark">{aciertos(materia.aciertos_c1)}</Text>
      </Group>
      <Group justify="space-between" mt={4}>
        <Text size="xs" c="dimmed">Cuestionario 2</Text>
        <Text size="xs" fw={600} c="dark">{aciertos(materia.aciertos_c2)}</Text>
      </Group>
    </Card>
  );
}

function MateriaCard({ materia }: { materia: MateriaResultado }) {
  const isSinDatos = materia.nivel === 'Sin datos';
  const color = colorMateria(!isSinDatos);

  return (
    <Card className={classes.materiaCard} padding="lg" radius="lg">
      <Group gap="sm" wrap="nowrap" align="flex-start" mb="md">
        <span
          className={classes.materiaIcon}
          style={{
            backgroundColor: isSinDatos ? '#f3f4f6' : `${color}15`,
            color: isSinDatos ? '#9ca3af' : color,
          }}
        >
          {MATERIA_ICONS[materia.materia] ?? '?'}
        </span>
        <div style={{ flex: 1 }}>
          <Text fw={600} size="sm" c="dark">
            {materia.nombre}
          </Text>
        </div>
      </Group>

      <div className={classes.scoreSection}>
        <Group justify="space-between" mb={6}>
          <Text size="xs" c="dimmed">
            Puntaje
          </Text>
          <Text fw={700} size="lg" c="dark">
            {materia.puntaje !== null ? materia.puntaje.toFixed(1) : '—'}
            <Text component="span" size="xs" c="dimmed" fw={400}>
              {' '}/ {materia.maximo}
            </Text>
          </Text>
        </Group>
        <ScoreBar puntaje={materia.puntaje} maximo={materia.maximo} />
      </div>

      {materia.retroalimentacion && (
        <>
          <Divider my="md" color="#F0F1F5" />
          <Text size="xs" c="dimmed" lh={1.5}>
            {materia.retroalimentacion}
          </Text>
        </>
      )}
    </Card>
  );
}

export default function AlumnoResultados() {
  const [data, setData] = useState<DiagnosticoAlumnoResponse | null>(null);
  const [cuestionario, setCuestionario] = useState<CuestionarioAlumnoResponse | null>(null);
  const [webassignData, setWebassignData] = useState<WebAssignAlumnoResponse | null>(null);
  const [indiceFi, setIndiceFi] = useState<IndiceFiAlumno | null>(null);
  const [loading, setLoading] = useState(true);
  const [descargando, setDescargando] = useState(false);
  // Un alumno creado desde los exámenes completa sus datos antes de ver resultados.
  const [pendienteRegistro, setPendienteRegistro] = useState(false);
  const navigate = useNavigate();

  const handleDescargarPdf = async () => {
    setDescargando(true);
    try {
      await descargarResultadoPdf();
    } catch {
      // silently fail
    } finally {
      setDescargando(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    void (async () => {
      const perfil = await fetchMiPerfil().catch(() => null);
      if (!mounted) return;
      if (perfil?.es_provisional) {
        setPendienteRegistro(true);
        setLoading(false);
        return;
      }
      setPendienteRegistro(false);
      const [diag, wa, cuest, indice] = await Promise.all([
        fetchMiDiagnostico().catch(() => null),
        fetchMiWebAssign().catch(() => null),
        fetchMiCuestionario().catch(() => null),
        fetchMiIndiceFi().catch(() => null),
      ]);
      if (mounted) {
        setIndiceFi(indice);
        setData(diag);
        setWebassignData(wa);
        setCuestionario(cuest);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (pendienteRegistro) {
    return (
      <>
        <div className={classes.welcome}>
          <Text component="h1" className={classes.welcomeTitle}>
            Mis resultados
          </Text>
          <Text className={classes.welcomeSubtitle}>
            Antes de ver tus resultados, completa tus datos.
          </Text>
        </div>
        <Alert
          color="orange"
          variant="light"
          radius="md"
          mt="lg"
          maw={720}
          icon={<IconInfoCircle size={18} />}
          title="Te falta completar tus datos"
        >
          <Text size="sm">
            Tus resultados estarán disponibles en cuanto completes tus datos obligatorios.
          </Text>
          <Button
            mt="md"
            color="orange"
            rightSection={<IconArrowRight size={16} aria-hidden="true" />}
            onClick={() => navigate('/alumno/contacto')}
          >
            Completar mis datos
          </Button>
        </Alert>
      </>
    );
  }

  return (
    <>
      <div className={classes.welcome}>
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <div>
            <Text component="h1" className={classes.welcomeTitle}>
              Mis resultados
            </Text>
            <Text className={classes.welcomeSubtitle}>
              Consulta tu Índice FI UAEMex y tus resultados de cada examen.
            </Text>
          </div>
          <Button
            variant="light"
            leftSection={<IconDownload size={18} />}
            onClick={handleDescargarPdf}
            loading={descargando}
          >
            Descargar carta de recomendación
          </Button>
        </Group>
      </div>

      {loading ? (
        <Card className={classes.card} padding="xl" radius="lg" mt="lg">
          <Stack align="center" py="xl">
            <Loader size="sm" />
          </Stack>
        </Card>
      ) : null}

      {!loading && indiceFi && (
        <Card className={`${classes.card} ${classes.indiceCard}`} padding="xl" radius="lg" mt="lg">
          <Group gap="sm" wrap="nowrap" align="flex-start">
            <span className={classes.iconBox} style={{ backgroundColor: '#EEF2FF' }}>
              <IconAward size={22} color="#4F46E5" stroke={2} />
            </span>
            <div>
              <Title order={3} className={classes.title}>
                Índice FI UAEMex
              </Title>
              <Text className={classes.subtitle}>
                {indiceFi.tiene_resultados
                  ? `Periodo ${indiceFi.periodo}`
                  : 'Aún no tienes resultados registrados'}
              </Text>
            </div>
          </Group>

          {indiceFi.tiene_resultados && (
            <>
              <div className={classes.scoreRow} style={{ marginTop: 'var(--mantine-spacing-lg)' }}>
                <Stack gap={2}>
                  <Text className={classes.scoreLabel}>Tu índice</Text>
                  <Text className={classes.scoreValue}>
                    {indiceFi.indice.toFixed(1)}
                    <Text component="span" className={classes.scoreMax}>
                      {' '}/ {Number(indiceFi.maximo.toFixed(2))}
                    </Text>
                  </Text>
                </Stack>
                {indiceFi.categoria && (
                  <Stack gap={2} align="flex-end">
                    <Text className={classes.scoreLabel}>Categoría</Text>
                    <Badge
                      size="lg"
                      radius="md"
                      variant="light"
                      color="indigo"
                      tt="none"
                      className={classes.levelBadge}
                    >
                      {indiceFi.categoria}
                    </Badge>
                  </Stack>
                )}
              </div>
              {indiceFi.comentario?.trim() && (
                <>
                  <Divider my="lg" color="#F0F1F5" />
                  <Text className={classes.feedbackText} style={{ whiteSpace: 'pre-line' }}>
                    {indiceFi.comentario.trim()}
                  </Text>
                </>
              )}
            </>
          )}
        </Card>
      )}

      {!loading && cuestionario && (
        <Stack gap="lg" mt="lg">
          <Card className={classes.card} padding="xl" radius="lg">
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <span className={classes.iconBox}>
                <IconClipboardList size={22} color={dashboardColors.blue} stroke={2} />
              </span>
              <div>
                <Title order={3} className={classes.title}>
                  Examen diagnóstico
                </Title>
                <Text className={classes.subtitle}>
                  {cuestionario.periodo
                    ? `Periodo ${cuestionario.periodo} — cuestionarios 1 y 2`
                    : 'Cuestionarios 1 y 2'}
                </Text>
              </div>
            </Group>

            <Stack gap="sm" mt="lg">
              <div className={classes.scoreRow}>
                <Stack gap={2}>
                  <Text className={classes.scoreLabel}>Promedio general</Text>
                  <Text className={classes.scoreValue}>
                    {cuestionario.promedio !== null ? cuestionario.promedio.toFixed(1) : '—'}
                  </Text>
                </Stack>
              </div>
            </Stack>
          </Card>

          <div>
            <Text fw={700} size="lg" c="dark" mb="md">
              Resultado por materia
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              {cuestionario.materias.map((m) => (
                <CuestionarioMateriaCard key={m.materia} materia={m} />
              ))}
            </SimpleGrid>
          </div>
        </Stack>
      )}

      {!loading && data ? (
        <Stack gap="lg" mt="lg">
          <Card className={classes.card} padding="xl" radius="lg">
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <span className={classes.iconBox}>
                <IconTrophy size={22} color={dashboardColors.green} stroke={2} />
              </span>
              <div>
                <Title order={3} className={classes.title}>
                  Examen final
                </Title>
                <Text className={classes.subtitle}>
                  {data.periodo ? `Periodo ${data.periodo}` : 'Evaluación de nivelación matemática'}
                </Text>
              </div>
            </Group>

            <Stack gap="sm" mt="lg">
              <div className={classes.scoreRow}>
                <Stack gap={2}>
                  <Text className={classes.scoreLabel}>Promedio general</Text>
                  <Text className={classes.scoreValue}>
                    {data.promedio !== null ? data.promedio.toFixed(1) : '—'}
                  </Text>
                </Stack>
              </div>
            </Stack>

            <Divider my="lg" color="#F0F1F5" />

            <Stack gap={6}>
              <Text className={classes.feedbackTitle}>Retroalimentación general</Text>
              <Text className={classes.feedbackText}>{data.retroalimentacion_general}</Text>
            </Stack>
          </Card>

          <div>
            <Text fw={700} size="lg" c="dark" mb="md">
              Resultado por materia
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              {data.materias.map((m) => (
                <MateriaCard key={m.materia} materia={m} />
              ))}
            </SimpleGrid>
          </div>
        </Stack>
      ) : null}

      {webassignData && webassignData.materias.length > 0 && (
        <Stack gap="lg" mt="lg">
          <Card className={classes.card} padding="xl" radius="lg">
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <span className={classes.iconBox} style={{ backgroundColor: '#EEF2FF', color: '#4F46E5' }}>
                W
              </span>
              <div>
                <Title order={3} className={classes.title}>
                  Resultados WebAssign
                </Title>
                <Text className={classes.subtitle}>
                  {webassignData.periodo ? `Periodo ${webassignData.periodo}` : 'Ejercicios en línea'}
                  {webassignData.carrera ? ` — ${webassignData.carrera}` : ''}
                </Text>
              </div>
            </Group>

            <Stack gap="sm" mt="lg">
              <div className={classes.scoreRow}>
                <Stack gap={2}>
                  <Text className={classes.scoreLabel}>Promedio general</Text>
                  <Text className={classes.scoreValue}>
                    {webassignData.promedio !== null ? webassignData.promedio.toFixed(1) : '—'}
                  </Text>
                </Stack>
              </div>
            </Stack>
          </Card>

          <div>
            <Text fw={700} size="lg" c="dark" mb="md">
              Resultado por materia
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              {webassignData.materias.map((m) => (
                <WebAssignMateriaCard key={m.materia} materia={m} />
              ))}
            </SimpleGrid>
          </div>
        </Stack>
      )}
    </>
  );
}

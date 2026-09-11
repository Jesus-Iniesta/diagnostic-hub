import {
  Badge,
  Card,
  Divider,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconMoodSad, IconTrophy } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import { fetchMiDiagnostico, fetchMiWebAssign } from '../../lib/alumnoApi';
import { dashboardColors } from '../../theme/theme';
import type { DiagnosticoAlumnoResponse, MateriaResultado, WebAssignAlumnoResponse, WebAssignMateriaResultado } from '../../types/alumno';
import classes from './AlumnoResultados.module.css';

const LEVEL_COLORS: Record<string, string> = {
  Alto: dashboardColors.green,
  Bueno: dashboardColors.blue,
  Medio: dashboardColors.orange,
  Bajo: dashboardColors.red,
  "Muy bajo": dashboardColors.red,
  "Sin datos": 'gray',
};

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
  const color = LEVEL_COLORS[materia.nivel] ?? 'gray';
  const isSinDatos = materia.nivel === 'Sin datos';

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
          <Badge size="sm" radius="md" variant="light" color={color} mt={4}>
            {materia.nivel}
          </Badge>
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

function MateriaCard({ materia }: { materia: MateriaResultado }) {
  const color = LEVEL_COLORS[materia.nivel] ?? 'gray';
  const isSinDatos = materia.nivel === 'Sin datos';

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
          <Badge
            size="sm"
            radius="md"
            variant="light"
            color={color}
            mt={4}
          >
            {materia.nivel}
          </Badge>
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
  const [webassignData, setWebassignData] = useState<WebAssignAlumnoResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    void Promise.all([
      fetchMiDiagnostico().catch(() => null),
      fetchMiWebAssign().catch(() => null),
    ]).then(([diag, wa]) => {
      if (mounted) {
        setData(diag);
        setWebassignData(wa);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const isSinDatos = data?.nivel_general === 'Sin datos';

  return (
    <>
      <div className={classes.welcome}>
        <Text component="h1" className={classes.welcomeTitle}>
          Mis resultados
        </Text>
        <Text className={classes.welcomeSubtitle}>
          Consulta tu puntaje, nivel de matemáticas y retroalimentación.
        </Text>
      </div>

      {loading ? (
        <Card className={classes.card} padding="xl" radius="lg" mt="lg">
          <Stack align="center" py="xl">
            <Loader size="sm" />
          </Stack>
        </Card>
      ) : data ? (
        <Stack gap="lg" mt="lg">
          <Card className={classes.card} padding="xl" radius="lg">
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <span className={classes.iconBox}>
                {isSinDatos ? (
                  <IconMoodSad size={22} color={dashboardColors.orange} stroke={2} />
                ) : (
                  <IconTrophy size={22} color={dashboardColors.green} stroke={2} />
                )}
              </span>
              <div>
                <Title order={3} className={classes.title}>
                  Resultado del examen diagnóstico
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
                <Stack gap={2} align="flex-end">
                  <Text className={classes.scoreLabel}>Nivel</Text>
                  <Badge
                    size="lg"
                    radius="md"
                    variant="light"
                    color={LEVEL_COLORS[data.nivel_general] ?? 'gray'}
                    className={classes.levelBadge}
                  >
                    {data.nivel_general}
                  </Badge>
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
                <Stack gap={2} align="flex-end">
                  <Text className={classes.scoreLabel}>Nivel</Text>
                  <Badge
                    size="lg"
                    radius="md"
                    variant="light"
                    color={LEVEL_COLORS[webassignData.nivel_general] ?? 'gray'}
                    className={classes.levelBadge}
                  >
                    {webassignData.nivel_general}
                  </Badge>
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

import {
  Box,
  Button,
  Card,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconArrowRight,
  IconClipboardList,
  IconUsers,
  IconUsersGroup,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import StatCard from '../../components/StatCard/StatCard';
import { fetchMisGrupos, fetchEstadisticasGrupo } from '../../lib/profesorApi';
import { dashboardColors } from '../../theme/theme';
import type { GrupoEstadisticas } from '../../types/profesor';
import classes from './ProfesorHome.module.css';

const NivelColors: Record<string, string> = {
  Alto: dashboardColors.green,
  Bueno: dashboardColors.blue,
  Medio: dashboardColors.orange,
  Bajo: dashboardColors.red,
  'Muy bajo': '#98A2B3',
};

const MATERIA_LABELS: Record<string, string> = {
  algebra: 'Algebra',
  trigonometria: 'Trigonom.',
  geometria: 'Geometria',
  calculo: 'Calculo',
};

function NivelTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { nivel: string; cantidad: number; porcentaje: number } }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#fff', padding: '8px 12px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
      <Text size="sm" fw={600}>{d.nivel}</Text>
      <Text size="xs" c="dimmed">{d.cantidad} alumnos · {d.porcentaje}%</Text>
    </div>
  );
}

function MateriaTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { materia: string; promedio: number } }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#fff', padding: '8px 12px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
      <Text size="sm" fw={600}>{d.materia}</Text>
      <Text size="xs" c="dimmed">Promedio: {d.promedio.toFixed(2)}</Text>
    </div>
  );
}

export default function ProfesorHome() {
  const navigate = useNavigate();
  const [estadisticas, setEstadisticas] = useState<GrupoEstadisticas | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const grupos = await fetchMisGrupos();
        if (grupos.length > 0) {
          const stats = await fetchEstadisticasGrupo(grupos[0].id, '2026B');
          if (mounted) setEstadisticas(stats);
        }
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const materiaData = estadisticas?.promedio_materias
    ? Object.entries(estadisticas.promedio_materias)
        .filter(([, v]) => v !== null)
        .map(([k, v]) => ({ materia: MATERIA_LABELS[k] || k, promedio: v! }))
    : [];

  return (
    <>
      <div className={classes.welcome}>
        <Text component="h1" className={classes.welcomeTitle}>
          ¡Hola, profesor!
        </Text>
        <Text className={classes.welcomeSubtitle}>
          Aquí tienes el resumen de tus grupos.
        </Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" mt="xl">
        <StatCard
          title="Alumnos"
          value={estadisticas?.total_alumnos ?? '—'}
          description="Alumnos identificados"
          color={dashboardColors.blue}
          lightColor={dashboardColors.blueLight}
          icon={<IconUsers size={22} color={dashboardColors.blue} aria-hidden="true" />}
          chartData={estadisticas?.distribucion_nivel.map((d) => d.cantidad) ?? []}
        />
        <StatCard
          title="Evaluados"
          value={estadisticas?.evaluados ?? '—'}
          description="Con resultados registrados"
          color={dashboardColors.green}
          lightColor={dashboardColors.greenLight}
          icon={<IconClipboardList size={22} color={dashboardColors.green} aria-hidden="true" />}
          chartData={estadisticas?.distribucion_nivel.map((d) => d.cantidad) ?? []}
        />
        <StatCard
          title="Promedio"
          value={estadisticas?.promedio != null ? estadisticas.promedio.toFixed(1) : '—'}
          description="Promedio del grupo"
          color={dashboardColors.purple}
          lightColor={dashboardColors.purpleLight}
          icon={<IconUsersGroup size={22} color={dashboardColors.purple} aria-hidden="true" />}
          chartData={materiaData.map((d) => d.promedio)}
        />
      </SimpleGrid>

      {loading ? (
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg" mt="xl">
          <Skeleton height={300} radius="lg" />
          <Skeleton height={300} radius="lg" />
        </SimpleGrid>
      ) : estadisticas && estadisticas.evaluados > 0 ? (
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg" mt="xl">
          {/* Distribucion por nivel */}
          <Card className={classes.card} padding="xl" radius="lg">
            <Title order={4} className={classes.cardTitle} mb="md">
              Distribucion por nivel
            </Title>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={estadisticas.distribucion_nivel}
                margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
                barCategoryGap="20%"
              >
                <CartesianGrid vertical={false} strokeDasharray="5 5" stroke="#E8EAF0" />
                <XAxis
                  dataKey="nivel"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#667085', fontSize: 12, fontWeight: 600 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#98A2B3', fontSize: 12 }}
                  width={40}
                />
                <Tooltip content={<NivelTooltip />} cursor={{ fill: 'rgba(16,24,40,0.04)' }} />
                <Bar dataKey="cantidad" radius={[8, 8, 0, 0]} barSize={48}>
                  {estadisticas.distribucion_nivel.map((entry) => (
                    <Cell key={entry.nivel} fill={NivelColors[entry.nivel] ?? '#98A2B3'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Promedio por materia */}
          <Card className={classes.card} padding="xl" radius="lg">
            <Title order={4} className={classes.cardTitle} mb="md">
              Promedio por materia
            </Title>
            {materiaData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={materiaData}
                  margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
                  barCategoryGap="25%"
                >
                  <CartesianGrid vertical={false} strokeDasharray="5 5" stroke="#E8EAF0" />
                  <XAxis
                    dataKey="materia"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#667085', fontSize: 12, fontWeight: 600 }}
                  />
                  <YAxis
                    domain={[0, 10]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#98A2B3', fontSize: 12 }}
                    width={40}
                  />
                  <Tooltip content={<MateriaTooltip />} cursor={{ fill: 'rgba(16,24,40,0.04)' }} />
                  <Bar dataKey="promedio" radius={[8, 8, 0, 0]} barSize={48} fill={dashboardColors.blue} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Text c="dimmed" ta="center" py="xl">
                Sin datos de materias disponibles
              </Text>
            )}
          </Card>
        </SimpleGrid>
      ) : null}

      <Box mt="xl">
        {estadisticas && estadisticas.total_alumnos > 0 ? (
          <Card className={classes.card} padding="xl" radius="lg">
            <Stack gap="sm">
              <Title order={3} className={classes.cardTitle}>
                Grupo actual: {estadisticas.nombre || 'Grupo'}
              </Title>
              <Group gap="xl" className={classes.statsRow}>
                <Stack gap={2}>
                  <Text className={classes.statValue}>{estadisticas.total_alumnos}</Text>
                  <Text className={classes.statLabel}>alumnos identificados</Text>
                </Stack>
                <Stack gap={2}>
                  <Text className={classes.statValue}>{estadisticas.evaluados}</Text>
                  <Text className={classes.statLabel}>alumnos con resultados</Text>
                </Stack>
              </Group>
              <Button
                size="md"
                color="indigo"
                className={classes.actionButton}
                rightSection={<IconArrowRight size={18} aria-hidden="true" />}
                onClick={() => navigate('/profesor/resultados')}
              >
                Ver resultados
              </Button>
            </Stack>
          </Card>
        ) : (
          <Card className={classes.card} padding="xl" radius="lg">
            <Stack gap="sm">
              <Title order={3} className={classes.cardTitle}>
                Aun no tienes un grupo
              </Title>
              <Text className={classes.cardText}>
                Crea un grupo y agrega alumnos para comenzar a consultar sus resultados.
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
        )}
      </Box>
    </>
  );
}

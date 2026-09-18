import {
  Box,
  Grid,
  Group,
  Select,
  SimpleGrid,
  Skeleton,
  Text,
} from '@mantine/core';
import {
  IconFileText,
  IconReport,
  IconUsers,
  IconUsersGroup,
} from '@tabler/icons-react';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

import QuickSummary from '../../components/QuickSummary/QuickSummary';
import StatCard from '../../components/StatCard/StatCard';
import StudentsLevelChart from '../../components/StudentsLevelChart/StudentsLevelChart';
import SystemAlert from '../../components/SystemAlert/SystemAlert';
import {
  getDashboardStats,
  getPeriodos,
  getProgramas,
  type DashboardStats,
  type Ingenieria,
} from '../../lib/dashboardApi';
import { dashboardColors } from '../../theme/theme';
import { welcome } from '../../mocks/adminDashboard';
import classes from './AdminDashboard.module.css';

type StatConfig = {
  icon: ReactElement;
  color: string;
  lightColor: string;
  title: string;
  description: string;
  getValue: (stats: DashboardStats) => number;
};

const STAT_CONFIGS: StatConfig[] = [
  {
    icon: <IconUsers size={22} color={dashboardColors.blue} aria-hidden="true" />,
    color: dashboardColors.blue,
    lightColor: dashboardColors.blueLight,
    title: 'Alumnos',
    description: 'Totales registrados',
    getValue: (s) => s.alumnos_total,
  },
  {
    icon: <IconUsersGroup size={22} color={dashboardColors.green} aria-hidden="true" />,
    color: dashboardColors.green,
    lightColor: dashboardColors.greenLight,
    title: 'Programas activos',
    description: 'Ingenierías disponibles',
    getValue: (s) => s.programas_activos,
  },
  {
    icon: <IconFileText size={22} color={dashboardColors.orange} aria-hidden="true" />,
    color: dashboardColors.orange,
    lightColor: dashboardColors.orangeLight,
    title: 'Evaluaciones',
    description: 'Diagnósticos en el periodo',
    getValue: (s) => s.evaluaciones_diagnostico,
  },
  {
    icon: <IconReport size={22} color={dashboardColors.purple} aria-hidden="true" />,
    color: dashboardColors.purple,
    lightColor: dashboardColors.purpleLight,
    title: 'Periodos',
    description: 'Con datos cargados',
    getValue: (s) => s.periodos_con_datos,
  },
];

export default function AdminDashboard() {
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [periodo, setPeriodo] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [programs, setPrograms] = useState<Ingenieria[]>([]);
  const [programa, setPrograma] = useState<string | null>(null);
  const [loadingPeriodos, setLoadingPeriodos] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([getPeriodos(), getProgramas()])
      .then(([periodosData, programasData]) => {
        if (mounted) {
          setPeriodos(periodosData);
          if (periodosData.length > 0) setPeriodo(periodosData[0]);
          setPrograms(programasData);
        }
      })
      .finally(() => {
        if (mounted) setLoadingPeriodos(false);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!periodo) return;
    let mounted = true;
    setLoadingStats(true);
    getDashboardStats(periodo, programa ?? undefined)
      .then((data) => {
        if (mounted) setStats(data);
      })
      .finally(() => {
        if (mounted) setLoadingStats(false);
      });
    return () => { mounted = false; };
  }, [periodo, programa]);

  const periodoSelectData = periodos.map((p) => ({ value: p, label: p }));

  const programSelectData = [
    { value: '__all__', label: 'Todos los programas' },
    ...programs.map((p) => ({ value: p.clave, label: p.nombre })),
  ];

  const handleProgramChange = (value: string | null) => {
    setPrograma(value === '__all__' ? null : value);
  };

  return (
    <>
      <div className={classes.welcome}>
        <Text component="h1" className={classes.welcomeTitle}>
          {welcome.title}
        </Text>
        <Text className={classes.welcomeSubtitle}>{welcome.subtitle}</Text>

        <Group gap="sm" mt="md">
          <Select
            data={periodoSelectData}
            value={periodo}
            onChange={setPeriodo}
            disabled={loadingPeriodos}
            placeholder="Selecciona periodo"
            w={160}
            size="sm"
          />
        </Group>
      </div>

      {loadingStats && !stats && (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg" mt="xl">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={160} radius="lg" />
          ))}
        </SimpleGrid>
      )}

      {stats && (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg" mt="xl">
          {STAT_CONFIGS.map((config) => (
            <StatCard
              key={config.title}
              title={config.title}
              value={config.getValue(stats).toLocaleString()}
              description={config.description}
              color={config.color}
              lightColor={config.lightColor}
              icon={config.icon}
              chartData={[]}
            />
          ))}
        </SimpleGrid>
      )}

      <Grid gutter="lg" mt="xl" align="stretch">
        <Grid.Col span={{ base: 12, lg: 9 }}>
          <StudentsLevelChart
            data={stats?.level_distribution ?? []}
            programs={programSelectData}
            program={programa}
            onProgramChange={handleProgramChange}
            loading={loadingStats}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 3 }}>
          <QuickSummary summary={stats?.quick_summary ?? null} loading={loadingStats} />
        </Grid.Col>
      </Grid>

      <Box mt="xl">
        <SystemAlert />
      </Box>
    </>
  );
}

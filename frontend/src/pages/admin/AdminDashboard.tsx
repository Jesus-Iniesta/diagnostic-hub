import { Box, Grid, SimpleGrid, Text } from '@mantine/core';
import {
  IconFileText,
  IconReport,
  IconUsers,
  IconUsersGroup,
} from '@tabler/icons-react';
import type { ReactElement } from 'react';

import QuickSummary from '../../components/QuickSummary/QuickSummary';
import StatCard from '../../components/StatCard/StatCard';
import StudentsLevelChart from '../../components/StudentsLevelChart/StudentsLevelChart';
import SystemAlert from '../../components/SystemAlert/SystemAlert';
import {
  adminStats,
  welcome,
  type StatMock,
} from '../../mocks/adminDashboard';
import { dashboardColors } from '../../theme/theme';
import classes from './AdminDashboard.module.css';

type StatConfig = {
  icon: ReactElement;
  color: string;
  lightColor: string;
};

const STAT_CONFIG: Record<StatMock['id'], StatConfig> = {
  alumnos: {
    icon: <IconUsers size={22} color={dashboardColors.blue} aria-hidden="true" />,
    color: dashboardColors.blue,
    lightColor: dashboardColors.blueLight,
  },
  grupos: {
    icon: <IconUsersGroup size={22} color={dashboardColors.green} aria-hidden="true" />,
    color: dashboardColors.green,
    lightColor: dashboardColors.greenLight,
  },
  evaluaciones: {
    icon: <IconFileText size={22} color={dashboardColors.orange} aria-hidden="true" />,
    color: dashboardColors.orange,
    lightColor: dashboardColors.orangeLight,
  },
  reportes: {
    icon: <IconReport size={22} color={dashboardColors.purple} aria-hidden="true" />,
    color: dashboardColors.purple,
    lightColor: dashboardColors.purpleLight,
  },
};

export default function AdminDashboard() {
  return (
    <>
      <div className={classes.welcome}>
        <Text component="h1" className={classes.welcomeTitle}>
          {welcome.title}
        </Text>
        <Text className={classes.welcomeSubtitle}>{welcome.subtitle}</Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg" mt="xl">
        {adminStats.map((stat) => {
          const config = STAT_CONFIG[stat.id];
          return (
            <StatCard
              key={stat.id}
              title={stat.title}
              value={stat.value}
              description={stat.description}
              color={config.color}
              lightColor={config.lightColor}
              icon={config.icon}
              chartData={stat.trend}
            />
          );
        })}
      </SimpleGrid>

      <Grid gutter="lg" mt="xl" align="stretch">
        <Grid.Col span={{ base: 12, lg: 9 }}>
          <StudentsLevelChart />
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 3 }}>
          <QuickSummary />
        </Grid.Col>
      </Grid>

      <Box mt="xl">
        <SystemAlert />
      </Box>
    </>
  );
}
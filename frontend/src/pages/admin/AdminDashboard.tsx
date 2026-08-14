import { AppShell, Box, Grid, SimpleGrid, Text } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import {
  IconFileText,
  IconReport,
  IconUsers,
  IconUsersGroup,
} from '@tabler/icons-react';
import type { ReactElement } from 'react';
import { useState } from 'react';

import DashboardHeader from '../../components/DashboardHeader/DashboardHeader';
import DashboardSidebar from '../../components/DashboardSidebar/DashboardSidebar';
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
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] =
    useDisclosure(false);
  const isMobile = useMediaQuery('(max-width: 62em)');

  const handleToggle = () => {
    if (isMobile) {
      toggleMobile();
    } else {
      setDesktopCollapsed((v) => !v);
    }
  };

  return (
    <AppShell
      layout="alt"
      header={{ height: 88 }}
      navbar={{
        width: desktopCollapsed ? 88 : 326,
        breakpoint: 'md',
        collapsed: { mobile: !mobileOpened },
      }}
      padding={0}
    >
      <AppShell.Navbar className={classes.navbar}>
        <DashboardSidebar
          collapsed={desktopCollapsed}
          onNavigate={closeMobile}
        />
      </AppShell.Navbar>

      <AppShell.Header className={classes.header}>
        <DashboardHeader onToggle={handleToggle} />
      </AppShell.Header>

      <AppShell.Main className={classes.mainArea}>
        <Box className={classes.main}>
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
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
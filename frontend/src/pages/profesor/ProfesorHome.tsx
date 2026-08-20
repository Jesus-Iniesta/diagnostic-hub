import { Box, Button, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import {
  IconArrowRight,
  IconClipboardList,
  IconUsers,
  IconUsersGroup,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import StatCard from '../../components/StatCard/StatCard';
import { fetchResumenGrupo } from '../../lib/profesorApi';
import { dashboardColors } from '../../theme/theme';
import type { ResumenGrupo } from '../../types/profesor';
import classes from './ProfesorHome.module.css';

export default function ProfesorHome() {
  const navigate = useNavigate();
  const [resumen, setResumen] = useState<ResumenGrupo | null>(null);

  useEffect(() => {
    let mounted = true;
    void fetchResumenGrupo().then((data) => {
      if (mounted) setResumen(data);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <div className={classes.welcome}>
        <Text component="h1" className={classes.welcomeTitle}>
          ¡Hola, profesor! 👋
        </Text>
        <Text className={classes.welcomeSubtitle}>
          Aquí tienes el resumen de tu grupo.
        </Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" mt="xl">
        <StatCard
          title="Alumnos"
          value={resumen?.totalAlumnos ?? '—'}
          description="Alumnos identificados"
          color={dashboardColors.blue}
          lightColor={dashboardColors.blueLight}
          icon={<IconUsers size={22} color={dashboardColors.blue} aria-hidden="true" />}
          chartData={[4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10]}
        />
        <StatCard
          title="Evaluados"
          value={resumen?.evaluados ?? '—'}
          description="Con resultados registrados"
          color={dashboardColors.green}
          lightColor={dashboardColors.greenLight}
          icon={<IconClipboardList size={22} color={dashboardColors.green} aria-hidden="true" />}
          chartData={[2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8]}
        />
        <StatCard
          title="Promedio"
          value={resumen?.promedio ?? '—'}
          description="Promedio del grupo"
          color={dashboardColors.purple}
          lightColor={dashboardColors.purpleLight}
          icon={<IconUsersGroup size={22} color={dashboardColors.purple} aria-hidden="true" />}
          chartData={[6, 6, 6.2, 6.4, 6.6, 6.8, 7, 7.1, 7.2, 7.4, 7.5, 7.6]}
        />
      </SimpleGrid>

      <Box mt="xl">
        {resumen?.grupoCargado ? (
          <Card className={classes.card} padding="xl" radius="lg">
            <Stack gap="sm">
              <Title order={3} className={classes.cardTitle}>
                Grupo actual
              </Title>
              <Group gap="xl" className={classes.statsRow}>
                <Stack gap={2}>
                  <Text className={classes.statValue}>
                    {resumen.totalAlumnos}
                  </Text>
                  <Text className={classes.statLabel}>alumnos identificados</Text>
                </Stack>
                <Stack gap={2}>
                  <Text className={classes.statValue}>
                    {resumen.alumnosConResultados}
                  </Text>
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
                Aún no tienes un grupo cargado
              </Title>
              <Text className={classes.cardText}>
                Sube el archivo proporcionado por Control Escolar para consultar
                los resultados de tus alumnos.
              </Text>
              <Button
                size="md"
                color="indigo"
                className={classes.actionButton}
                rightSection={<IconArrowRight size={18} aria-hidden="true" />}
                onClick={() => navigate('/profesor/grupo')}
              >
                Cargar lista
              </Button>
            </Stack>
          </Card>
        )}
      </Box>
    </>
  );
}
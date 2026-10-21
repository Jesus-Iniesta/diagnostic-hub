import {
  Badge,
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

import StatCard from '../../components/StatCard/StatCard';
import { fmtIndice } from '../../lib/categorias';
import { fetchResumenProfesor } from '../../lib/profesorApi';
import { dashboardColors } from '../../theme/theme';
import type { ResumenProfesor } from '../../types/profesor';
import classes from './ProfesorHome.module.css';

export default function ProfesorHome() {
  const navigate = useNavigate();
  const [resumen, setResumen] = useState<ResumenProfesor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    void fetchResumenProfesor()
      .then((data) => {
        if (mounted) setResumen(data);
      })
      .catch(() => {
        // Sin resumen se muestra la invitación a crear un grupo.
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const grupos = resumen?.grupos ?? [];

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
          value={resumen?.total_alumnos ?? '—'}
          description="En todos tus grupos"
          color={dashboardColors.blue}
          lightColor={dashboardColors.blueLight}
          icon={<IconUsers size={22} color={dashboardColors.blue} aria-hidden="true" />}
          chartData={[]}
        />
        <StatCard
          title="Evaluados"
          value={resumen?.evaluados ?? '—'}
          description="Con resultados registrados"
          color={dashboardColors.green}
          lightColor={dashboardColors.greenLight}
          icon={<IconClipboardList size={22} color={dashboardColors.green} aria-hidden="true" />}
          chartData={[]}
        />
        <StatCard
          title="Promedio del Índice FI"
          value={resumen ? fmtIndice(resumen.promedio_indice, resumen.maximo) : '—'}
          description="De los alumnos evaluados"
          color={dashboardColors.purple}
          lightColor={dashboardColors.purpleLight}
          icon={<IconUsersGroup size={22} color={dashboardColors.purple} aria-hidden="true" />}
          chartData={[]}
        />
      </SimpleGrid>

      {loading ? (
        <Skeleton height={160} radius="lg" mt="xl" maw={720} />
      ) : grupos.length > 0 ? (
        <Card className={classes.card} padding="xl" radius="lg" mt="xl">
          <Title order={3} className={classes.cardTitle} mb="md">
            Mis grupos
          </Title>
          <Stack gap="sm">
            {grupos.map((g) => (
              <Group key={g.id} justify="space-between" wrap="wrap" className={classes.grupoRow}>
                <div>
                  <Group gap="xs">
                    <Text fw={700} c="dark">Grupo {g.nombre}</Text>
                    {g.materia_nombre && (
                      <Badge variant="light" color="indigo">{g.materia_nombre}</Badge>
                    )}
                    <Text size="sm" c="dimmed">{g.periodo}</Text>
                  </Group>
                  <Text size="sm" c="dimmed" mt={4}>
                    {g.total_alumnos} alumnos · {g.evaluados} evaluados · Índice FI promedio{' '}
                    {fmtIndice(g.promedio_indice, resumen!.maximo)}
                  </Text>
                </div>
                <Button
                  variant="light"
                  color="indigo"
                  rightSection={<IconArrowRight size={16} aria-hidden="true" />}
                  onClick={() => navigate(`/profesor/resultados?grupo=${g.id}`)}
                >
                  Ver resultados
                </Button>
              </Group>
            ))}
          </Stack>
        </Card>
      ) : (
        <Card className={classes.card} padding="xl" radius="lg" mt="xl">
          <Stack gap="sm">
            <Title order={3} className={classes.cardTitle}>
              Aún no tienes grupos
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
    </>
  );
}

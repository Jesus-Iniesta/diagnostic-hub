import { Badge, Card, Divider, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { IconChartBar } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import { fetchMisResultados } from '../../lib/alumnoApi';
import { dashboardColors } from '../../theme/theme';
import type { ResultadoAlumno } from '../../types/alumno';
import classes from './AlumnoResultados.module.css';

const LEVEL_COLORS: Record<string, string> = {
  Alto: dashboardColors.green,
  Medio: dashboardColors.orange,
  Bajo: dashboardColors.red,
};

export default function AlumnoResultados() {
  const [resultado, setResultado] = useState<ResultadoAlumno | null>(null);

  useEffect(() => {
    let mounted = true;
    void fetchMisResultados().then((data) => {
      if (mounted) setResultado(data);
    });
    return () => {
      mounted = false;
    };
  }, []);

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

      {!resultado ? (
        <Card className={classes.card} padding="xl" radius="lg" mt="lg">
          <Stack align="center" py="xl">
            <Loader size="sm" />
          </Stack>
        </Card>
      ) : (
        <Card className={classes.card} padding="xl" radius="lg" mt="lg">
          <Group gap="sm" wrap="nowrap" align="flex-start">
            <span className={classes.iconBox}>
              <IconChartBar size={22} color={dashboardColors.blue} stroke={2} aria-hidden="true" />
            </span>
            <div>
              <Title order={3} className={classes.title}>
                Resultado del examen diagnóstico
              </Title>
              <Text className={classes.subtitle}>Evaluación de nivelación matemática</Text>
            </div>
          </Group>

          <Stack gap="sm" mt="lg">
            <div className={classes.scoreRow}>
              <Stack gap={2}>
                <Text className={classes.scoreLabel}>Puntaje</Text>
                <Text className={classes.scoreValue}>{resultado.puntaje}</Text>
              </Stack>
              <Stack gap={2} align="flex-end">
                <Text className={classes.scoreLabel}>Nivel de matemáticas</Text>
                <Badge
                  size="lg"
                  radius="md"
                  variant="light"
                  color={LEVEL_COLORS[resultado.nivel] ?? 'gray'}
                  className={classes.levelBadge}
                >
                  {resultado.nivel}
                </Badge>
              </Stack>
            </div>
          </Stack>

          <Divider my="lg" color="#F0F1F5" />

          <Stack gap={6}>
            <Text className={classes.feedbackTitle}>Retroalimentación</Text>
            <Text className={classes.feedbackText}>{resultado.retroalimentacion}</Text>
          </Stack>
        </Card>
      )}
    </>
  );
}
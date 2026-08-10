import { Stack, Text, Title } from '@mantine/core';

import DashboardLayout from '../layout/DashboardLayout';

export default function AlumnoHome() {
  return (
    <DashboardLayout>
      <Stack>
        <Title order={2}>Alumno</Title>
        <Text c="dimmed">
          Consulta de tus resultados, nivel de desempeño y retroalimentación. Funcionalidad en
          construcción.
        </Text>
      </Stack>
    </DashboardLayout>
  );
}
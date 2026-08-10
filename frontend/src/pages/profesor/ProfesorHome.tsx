import { Stack, Text, Title } from '@mantine/core';

import DashboardLayout from '../layout/DashboardLayout';

export default function ProfesorHome() {
  return (
    <DashboardLayout>
      <Stack>
        <Title order={2}>Profesor</Title>
        <Text c="dimmed">
          Consulta de resultados de los alumnos de tu grupo. Funcionalidad en construcción.
        </Text>
      </Stack>
    </DashboardLayout>
  );
}
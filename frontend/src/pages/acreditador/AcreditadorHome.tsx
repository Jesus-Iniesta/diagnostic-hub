import { Stack, Text, Title } from '@mantine/core';

import DashboardLayout from '../layout/DashboardLayout';

export default function AcreditadorHome() {
  return (
    <DashboardLayout>
      <Stack>
        <Title order={2}>Acreditador</Title>
        <Text c="dimmed">
          Estadísticas por licenciatura y semestre, y resultados de solo lectura. Funcionalidad
          en construcción.
        </Text>
      </Stack>
    </DashboardLayout>
  );
}
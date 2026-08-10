import { List, Stack, Text, Title } from '@mantine/core';

import DashboardLayout from '../layout/DashboardLayout';

export default function AdminHome() {
  return (
    <DashboardLayout>
      <Stack>
        <Title order={2}>Administración</Title>
        <Text c="dimmed">
          Módulo principal del administrador. Funcionalidades en construcción.
        </Text>
        <List>
          <List.Item>Carga de archivos Excel de resultados</List.Item>
          <List.Item>Validación y definición de rangos / retroalimentación</List.Item>
          <List.Item>Generación de PDFs y descarga del archivo final</List.Item>
        </List>
      </Stack>
    </DashboardLayout>
  );
}
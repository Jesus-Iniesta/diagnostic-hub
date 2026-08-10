import { AppShell, Badge, Box, Button, Group, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Title order={3}>TutoNet</Title>
          {user && (
            <Group>
              <Text size="sm">
                {user.nombre} {user.apellido_paterno}
              </Text>
              <Badge variant="light" color="blue">
                {user.role.name}
              </Badge>
              <Button size="xs" variant="subtle" onClick={handleLogout}>
                Salir
              </Button>
            </Group>
          )}
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <Box>{children}</Box>
      </AppShell.Main>
    </AppShell>
  );
}
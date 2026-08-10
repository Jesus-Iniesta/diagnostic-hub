import { Card, Center, Text, Title } from '@mantine/core';
import { Navigate, useSearchParams } from 'react-router-dom';

import LoginForm from '../components/auth/LoginForm';
import { useAuth } from '../contexts/AuthContext';
import { roleHome } from '../lib/roles';
import type { LoginTab } from '../components/auth/LoginForm';

function initialTabFromModo(modo: string | null): LoginTab | undefined {
  if (modo === 'alumno') return 'cuenta';
  if (modo === 'profesor') return 'credenciales';
  return undefined;
}

export default function LoginPage() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const modo = searchParams.get('modo');
  const initialTab = initialTabFromModo(modo);

  if (!loading && user) {
    return <Navigate to={roleHome(user.role.name)} replace />;
  }

  return (
    <Center h="100vh" bg="gray.0">
      <Card shadow="sm" padding="xl" radius="md" withBorder w={400}>
        <Title order={2} ta="center" c="brand">
          TutoNet
        </Title>
        <Text c="dimmed" size="sm" ta="center" mt={4}>
          Sistema de análisis de exámenes diagnósticos y nivelación matemática
        </Text>
        <LoginForm key={modo ?? 'default'} initialTab={initialTab} />
      </Card>
    </Center>
  );
}
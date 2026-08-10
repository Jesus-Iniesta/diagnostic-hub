import { Card, Center, Text, Title } from '@mantine/core';
import { Navigate } from 'react-router-dom';

import LoginForm from '../components/auth/LoginForm';
import { useAuth } from '../contexts/AuthContext';
import { roleHome } from '../lib/roles';

export default function LoginPage() {
  const { user, loading } = useAuth();

  if (!loading && user) {
    return <Navigate to={roleHome(user.role.name)} replace />;
  }

  return (
    <Center h="100vh" bg="gray.0">
      <Card shadow="sm" padding="xl" radius="md" withBorder w={400}>
        <Title order={2} ta="center">
          TutoNet
        </Title>
        <Text c="dimmed" size="sm" ta="center" mt={4}>
          Sistema de análisis de exámenes diagnósticos y nivelación matemática
        </Text>
        <LoginForm />
      </Card>
    </Center>
  );
}
import { Center, Loader } from '@mantine/core';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { roleHome } from '../lib/roles';

interface ProtectedRouteProps {
  roles?: string[];
  children: ReactNode;
}

export default function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role.name)) {
    return <Navigate to={roleHome(user.role.name)} replace />;
  }

  return <>{children}</>;
}
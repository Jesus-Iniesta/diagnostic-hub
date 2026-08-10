import {
  Alert,
  Button,
  PasswordInput,
  Stack,
  Tabs,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import { loginWithNumeroCuenta, loginWithPassword } from '../../lib/api';
import { roleHome } from '../../lib/roles';

type LoginTab = 'credenciales' | 'cuenta';

export type { LoginTab };

interface LoginFormProps {
  initialTab?: LoginTab;
}

export default function LoginForm({ initialTab = 'credenciales' }: LoginFormProps) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<LoginTab>(initialTab);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    initialValues: {
      username: '',
      password: '',
      numeroCuenta: '',
    },
    validate: {
      username: (value) =>
        tab === 'credenciales' && !value.trim() ? 'Ingresa tu correo o RFC' : null,
      password: (value) => (tab === 'credenciales' && !value ? 'Ingresa tu contraseña' : null),
      numeroCuenta: (value) =>
        tab === 'cuenta' && !value.trim() ? 'Ingresa tu número de cuenta' : null,
    },
  });

  const handleSubmit = form.onSubmit(async ({ username, password, numeroCuenta }) => {
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(async () => {
        if (tab === 'cuenta') {
          await loginWithNumeroCuenta(numeroCuenta);
        } else {
          await loginWithPassword(username, password);
        }
      });
      navigate(roleHome(user.role.name), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credenciales inválidas');
    } finally {
      setSubmitting(false);
    }
  });

  const handleTabChange = (value: string | null) => {
    if (value === 'credenciales' || value === 'cuenta') {
      setTab(value);
      setError(null);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Tabs value={tab} onChange={handleTabChange}>
        <Tabs.List grow>
          <Tabs.Tab value="credenciales">Correo / RFC</Tabs.Tab>
          <Tabs.Tab value="cuenta">Número de cuenta</Tabs.Tab>
        </Tabs.List>

        <Stack mt="md">
          {tab === 'credenciales' ? (
            <>
              <TextInput
                label="Usuario"
                placeholder="correo o RFC"
                autoComplete="username"
                {...form.getInputProps('username')}
              />
              <PasswordInput
                label="Contraseña"
                placeholder="Tu contraseña"
                autoComplete="current-password"
                {...form.getInputProps('password')}
              />
            </>
          ) : (
            <TextInput
              label="Número de cuenta"
              placeholder="ej. 1724300"
              autoComplete="username"
              {...form.getInputProps('numeroCuenta')}
            />
          )}
        </Stack>
      </Tabs>

      {error && (
        <Alert color="red" mt="md">
          {error}
        </Alert>
      )}

      <Button fullWidth mt="lg" type="submit" loading={submitting}>
        Iniciar sesión
      </Button>
    </form>
  );
}
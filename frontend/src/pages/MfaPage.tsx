import { Alert, Anchor, Button, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconInfoCircle, IconShieldLock } from '@tabler/icons-react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { mfaVerificar } from '../lib/api';
import { roleHome } from '../lib/roles';
import classes from './LoginPage.module.css';

/** Segundo paso del login del administrador: código de 6 dígitos de su app autenticadora. */
export default function MfaPage() {
  const { user, loading, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const form = useForm({
    initialValues: { codigo: '' },
    validate: { codigo: (v) => (/^\d{6}$/.test(v.trim()) ? null : 'Escribe los 6 dígitos del código') },
  });

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.mfa_pendiente) return <Navigate to={roleHome(user.role.name)} replace />;

  const handleSubmit = form.onSubmit(async ({ codigo }) => {
    setError(null);
    setEnviando(true);
    try {
      await mfaVerificar(codigo.trim());
      const me = await refreshUser();
      navigate(roleHome(me?.role.name ?? user.role.name), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código incorrecto');
    } finally {
      setEnviando(false);
    }
  });

  return (
    <div className={classes.page}>
      <div className={classes.wrapper}>
        <IconShieldLock size={44} stroke={1.5} className={classes.icon} aria-hidden="true" />
        <Title order={1} className={classes.title}>
          Verificación en dos pasos
        </Title>
        <Text className={classes.subtitle}>
          Escribe el código de 6 dígitos de tu aplicación autenticadora.
        </Text>

        <form onSubmit={handleSubmit}>
          <TextInput
            label="Código"
            placeholder="123456"
            size="xl"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            {...form.getInputProps('codigo')}
          />
          {error && (
            <Alert color="red" mt="md" icon={<IconInfoCircle size={18} />}>
              {error}
            </Alert>
          )}
          <Button type="submit" size="xl" fullWidth mt="lg" color="brand.8" loading={enviando}>
            Verificar
          </Button>
        </form>

        <div className={classes.backRow} style={{ marginTop: 24 }}>
          <Anchor
            component="button"
            type="button"
            className={classes.back}
            onClick={() => void logout().then(() => navigate('/login'))}
          >
            Cancelar y salir
          </Anchor>
        </div>
      </div>
    </div>
  );
}

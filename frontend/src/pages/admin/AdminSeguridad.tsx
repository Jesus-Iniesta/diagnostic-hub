import { Alert, Button, Card, PasswordInput, Stack, Text, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCircleCheck, IconInfoCircle, IconLock } from '@tabler/icons-react';
import { useState } from 'react';

import { cambiarMiPassword } from '../../lib/usersApi';
import classes from './AdminCargaAlumnos.module.css';

const LARGO_MINIMO = 8;

export default function AdminSeguridad() {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  const form = useForm({
    initialValues: { actual: '', nueva: '', confirmacion: '' },
    validate: {
      actual: (v) => (v ? null : 'Escribe tu contraseña actual'),
      nueva: (v, values) => {
        if (v.length < LARGO_MINIMO) return `Mínimo ${LARGO_MINIMO} caracteres`;
        if (v === values.actual) return 'Debe ser distinta de la actual';
        return null;
      },
      confirmacion: (v, values) => (v === values.nueva ? null : 'Las contraseñas no coinciden'),
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setGuardando(true);
    setError(null);
    setListo(false);
    try {
      await cambiarMiPassword(values.actual, values.nueva);
      setListo(true);
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña');
    } finally {
      setGuardando(false);
    }
  });

  return (
    <>
      <div className={classes.welcome}>
        <Text component="h1" className={classes.welcomeTitle}>
          Seguridad
        </Text>
        <Text className={classes.welcomeSubtitle}>Administra el acceso a tu cuenta.</Text>
      </div>

      <Card className={classes.card} padding="xl" radius="lg" mt="lg" maw={520}>
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <Title order={3} className={classes.title}>
              <IconLock size={20} style={{ verticalAlign: 'text-bottom', marginRight: 8 }} />
              Cambiar mi contraseña
            </Title>
            <PasswordInput label="Contraseña actual" autoComplete="current-password" {...form.getInputProps('actual')} />
            <PasswordInput
              label="Contraseña nueva"
              description={`Mínimo ${LARGO_MINIMO} caracteres.`}
              autoComplete="new-password"
              {...form.getInputProps('nueva')}
            />
            <PasswordInput
              label="Confirmar contraseña nueva"
              autoComplete="new-password"
              {...form.getInputProps('confirmacion')}
            />
            {error && (
              <Alert color="red" variant="light" icon={<IconInfoCircle size={18} />}>
                {error}
              </Alert>
            )}
            {listo && (
              <Alert color="green" variant="light" icon={<IconCircleCheck size={18} />}>
                Tu contraseña se cambió. Úsala la próxima vez que entres.
              </Alert>
            )}
            <Button type="submit" loading={guardando}>
              Cambiar contraseña
            </Button>
          </Stack>
        </form>
      </Card>
    </>
  );
}

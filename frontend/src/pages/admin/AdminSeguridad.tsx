import {
  Alert,
  Button,
  Card,
  Code,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCircleCheck, IconInfoCircle, IconLock, IconShieldLock } from '@tabler/icons-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { mfaSetup, mfaVerificar, type MfaSetup } from '../../lib/api';
import { cambiarMiPassword } from '../../lib/usersApi';
import classes from './AdminCargaAlumnos.module.css';

const LARGO_MINIMO = 12;

/** Configuración de la verificación en dos pasos (TOTP) del administrador. */
function MfaCard() {
  const { user, refreshUser } = useAuth();
  const [setup, setSetup] = useState<MfaSetup | null>(null);
  const [codigo, setCodigo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const configurado = Boolean(user?.mfa_configurado) && !setup;

  async function iniciar() {
    setCargando(true);
    setError(null);
    try {
      setSetup(await mfaSetup());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar la configuración');
    } finally {
      setCargando(false);
    }
  }

  // Confirma que ya la configuró: el código demuestra que la app quedó bien vinculada.
  async function confirmar() {
    setCargando(true);
    setError(null);
    try {
      await mfaVerificar(codigo.trim());
      setSetup(null);
      setCodigo('');
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código incorrecto');
    } finally {
      setCargando(false);
    }
  }

  return (
    <Card className={classes.card} padding="xl" radius="lg" mt="lg" maw={520}>
      <Stack gap="md">
        <Title order={3} className={classes.title}>
          <IconShieldLock size={20} style={{ verticalAlign: 'text-bottom', marginRight: 8 }} />
          Verificación en dos pasos (MFA)
        </Title>

        {configurado && (
          <Alert color="green" variant="light" icon={<IconCircleCheck size={18} />}>
            MFA está activo. Al iniciar sesión te pediremos el código de tu aplicación autenticadora.
          </Alert>
        )}

        {!configurado && !setup && (
          <>
            <Text size="sm" c="dimmed">
              Protege tu cuenta con un código de 6 dígitos de una aplicación autenticadora
              (Google Authenticator, Microsoft Authenticator, Authy…).
            </Text>
            <Button onClick={iniciar} loading={cargando}>
              Configurar MFA
            </Button>
          </>
        )}

        {setup && (
          <>
            <Text size="sm">
              1. Escanea este código QR con tu aplicación autenticadora.
            </Text>
            <Group justify="center">
              <QRCodeSVG value={setup.otpauth_url} size={176} marginSize={2} />
            </Group>
            <Text size="sm">¿No puedes escanearlo? Escribe este secreto en la aplicación:</Text>
            <Code block style={{ wordBreak: 'break-all' }}>{setup.secreto}</Code>
            <Text size="sm">
              2. Guárdalo bien: sin él no podrás entrar. Después escribe el código que muestra
              la aplicación y confirma.
            </Text>
            <TextInput
              label="Código de 6 dígitos"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={codigo}
              onChange={(e) => setCodigo(e.currentTarget.value)}
            />
            <Button onClick={confirmar} loading={cargando} disabled={codigo.trim().length !== 6}>
              Ya lo configuré
            </Button>
          </>
        )}

        {error && (
          <Alert color="red" variant="light" icon={<IconInfoCircle size={18} />}>
            {error}
          </Alert>
        )}
      </Stack>
    </Card>
  );
}

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

      <MfaCard />
    </>
  );
}

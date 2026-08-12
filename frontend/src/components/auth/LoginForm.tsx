import {
  Alert,
  Button,
  PasswordInput,
  Text,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  IconEye,
  IconEyeOff,
  IconLock,
  IconMail,
  IconUser,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import { loginWithNumeroCuenta, loginWithPassword } from '../../lib/api';
import { roleHome } from '../../lib/roles';
import classes from './LoginForm.module.css';

export type LoginMode = 'alumno' | 'profesor';

interface LoginFormProps {
  mode?: LoginMode;
}

export default function LoginForm({ mode = 'profesor' }: LoginFormProps) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const esAlumno = mode === 'alumno';
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
        !esAlumno && !value.trim() ? 'Ingresa tu correo institucional' : null,
      password: (value) => (!esAlumno && !value ? 'Ingresa tu contraseña' : null),
      numeroCuenta: (value) =>
        esAlumno && !value.trim() ? 'Ingresa tu número de cuenta' : null,
    },
  });

  const handleSubmit = form.onSubmit(async ({ username, password, numeroCuenta }) => {
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(async () => {
        if (esAlumno) {
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

  return (
    <form onSubmit={handleSubmit} className={classes.form}>
      {esAlumno ? (
        <TextInput
          label="Número de cuenta"
          placeholder="Ingresa tu número de cuenta"
          size="xl"
          autoComplete="username"
          leftSection={<IconUser size={18} aria-hidden="true" />}
          classNames={{ input: classes.fieldInput }}
          {...form.getInputProps('numeroCuenta')}
        />
      ) : (
        <>
          <TextInput
            label="Correo institucional"
            placeholder="tu.correo@uaemex.mx"
            size="xl"
            autoComplete="username"
            leftSection={<IconMail size={18} aria-hidden="true" />}
            classNames={{ input: classes.fieldInput }}
            {...form.getInputProps('username')}
          />
          <PasswordInput
            label="Contraseña"
            placeholder="Ingresa tu contraseña"
            size="xl"
            autoComplete="current-password"
            leftSection={<IconLock size={18} aria-hidden="true" />}
            visibilityToggleIcon={({ reveal }) =>
              reveal ? (
                <IconEyeOff size={18} aria-hidden="true" />
              ) : (
                <IconEye size={18} aria-hidden="true" />
              )
            }
            classNames={{ input: classes.fieldInput }}
            {...form.getInputProps('password')}
          />
        </>
      )}

      {error && (
        <Alert color="red" p="sm">
          {error}
        </Alert>
      )}

      <Button
        type="submit"
        size="xl"
        fullWidth
        color="brand.8"
        className={classes.submitButton}
        loading={submitting}
      >
        Ingresar
      </Button>

      <div className={classes.restricted}>
        <IconLock size={14} aria-hidden="true" />
        <Text component="span" size="sm">
          {esAlumno ? 'Acceso exclusivo para alumnos' : 'Solo personal autorizado'}
        </Text>
      </div>
    </form>
  );
}
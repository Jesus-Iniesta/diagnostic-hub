import {
  Alert,
  Button,
  Card,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCircleCheck, IconMail, IconUser } from '@tabler/icons-react';
import { useState } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { guardarDatosContacto } from '../../lib/alumnoApi';
import { contactoInicialMock } from '../../mocks/alumno';
import classes from './DatosContactoForm.module.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface DatosContactoFormProps {
  onContinuar: () => void;
}

export default function DatosContactoForm({ onContinuar }: DatosContactoFormProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const form = useForm({
    initialValues: {
      correoWebassign: user?.correo_personal ?? contactoInicialMock.correo_webassign ?? '',
      correoInstitucional: user?.correo_institucional ?? '',
    },
    validate: {
      correoWebassign: (value) => {
        if (!value.trim()) return 'Ingresa el correo que utilizaste en WebAssign';
        if (!EMAIL_REGEX.test(value.trim())) return 'Ingresa un correo válido';
        return null;
      },
      correoInstitucional: (value) => {
        if (!value.trim()) return null;
        if (!EMAIL_REGEX.test(value.trim())) return 'Ingresa un correo válido';
        return null;
      },
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setError(null);
    setSaving(true);
    try {
      await guardarDatosContacto({
        correo_webassign: values.correoWebassign.trim(),
        correo_institucional: values.correoInstitucional.trim() || null,
      });
      setSaved(true);
      window.setTimeout(onContinuar, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los datos');
      setSaving(false);
    }
  });

  return (
    <Card className={classes.card} padding="xl" radius="lg">
      <Stack gap="lg">
        <div>
          <Title order={3} className={classes.title}>
            Datos de contacto
          </Title>
          <Text className={classes.subtitle}>
            Completa la información para poder relacionar tus evaluaciones.
          </Text>
        </div>

        <form onSubmit={handleSubmit} className={classes.form}>
          <Stack gap="lg">
            {saved && (
              <Alert
                color="green"
                variant="light"
                radius="md"
                icon={<IconCircleCheck size={18} aria-hidden="true" />}
              >
                Tus datos de contacto se guardaron correctamente.
              </Alert>
            )}

            <TextInput
              label="Correo utilizado en WebAssign"
              description="Ingresa el correo que utilizaste para realizar tus actividades en WebAssign."
              placeholder="tu.correo@ejemplo.com"
              withAsterisk
              size="md"
              leftSection={<IconMail size={18} aria-hidden="true" />}
              classNames={{ input: classes.fieldInput }}
              {...form.getInputProps('correoWebassign')}
            />

            <TextInput
              label="Correo institucional UAEMéx"
              description="Solo si cuentas con uno."
              placeholder="tu.correo@uaemex.mx"
              size="md"
              leftSection={<IconUser size={18} aria-hidden="true" />}
              classNames={{ input: classes.fieldInput }}
              {...form.getInputProps('correoInstitucional')}
            />

            {error && (
              <Alert color="red" variant="light" radius="md">
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              size="md"
              color="indigo"
              className={classes.submitButton}
              loading={saving}
              fullWidth
            >
              Guardar y continuar
            </Button>
          </Stack>
        </form>
      </Stack>
    </Card>
  );
}
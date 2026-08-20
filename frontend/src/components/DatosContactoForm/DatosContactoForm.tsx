import {
  Alert,
  Button,
  Card,
  Divider,
  Loader,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCircleCheck, IconInfoCircle, IconMail, IconUser } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { guardarDatosContacto } from '../../lib/alumnoApi';
import { fetchEstadoFormularioContacto } from '../../lib/configuracionApi';
import { contactoInicialMock } from '../../mocks/alumno';
import classes from './DatosContactoForm.module.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface DatosContactoFormProps {
  onContinuar: () => void;
}

export default function DatosContactoForm({ onContinuar }: DatosContactoFormProps) {
  const { user } = useAuth();
  const [habilitado, setHabilitado] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const correoWebassignInicial =
    user?.correo_personal ?? contactoInicialMock.correo_webassign ?? '';
  const correoInstitucionalInicial = user?.correo_institucional ?? '';

  useEffect(() => {
    let mounted = true;
    void fetchEstadoFormularioContacto()
      .then(({ habilitado: hab }) => {
        if (mounted) setHabilitado(hab);
      })
      .catch(() => {
        if (mounted) setHabilitado(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const form = useForm({
    initialValues: {
      correoWebassign: correoWebassignInicial,
      correoInstitucional: correoInstitucionalInicial,
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

  if (habilitado === null) {
    return (
      <Card className={classes.card} padding="xl" radius="lg">
        <Stack align="center" py="xl">
          <Loader size="sm" />
        </Stack>
      </Card>
    );
  }

  if (!habilitado) {
    return (
      <Card className={classes.card} padding="xl" radius="lg">
        <Stack gap="lg">
          <div>
            <Title order={3} className={classes.title}>
              Datos de contacto
            </Title>
            <Text className={classes.subtitle}>
              Completa tus datos para continuar.
            </Text>
          </div>

          <Alert
            color="orange"
            variant="light"
            radius="md"
            icon={<IconInfoCircle size={18} aria-hidden="true" />}
          >
            El formulario de datos de contacto no se encuentra disponible en este
            momento.
            <Text component="span" className={classes.notice}>
              Cuando sea habilitado por la Coordinación, podrás registrar o
              actualizar tu información.
            </Text>
          </Alert>

          {(correoWebassignInicial || correoInstitucionalInicial) && (
            <>
              <Divider color="#F0F1F5" />
              <Stack gap="sm">
                {correoWebassignInicial && (
                  <div>
                    <Text className={classes.readonlyLabel}>
                      Correo utilizado en WebAssign
                    </Text>
                    <Text className={classes.readonlyValue}>
                      {correoWebassignInicial}
                    </Text>
                  </div>
                )}
                {correoInstitucionalInicial && (
                  <div>
                    <Text className={classes.readonlyLabel}>
                      Correo institucional UAEMéx
                    </Text>
                    <Text className={classes.readonlyValue}>
                      {correoInstitucionalInicial}
                    </Text>
                  </div>
                )}
              </Stack>
            </>
          )}
        </Stack>
      </Card>
    );
  }

  return (
    <Card className={classes.card} padding="xl" radius="lg">
      <Stack gap="lg">
        <div>
          <Title order={3} className={classes.title}>
            Datos de contacto
          </Title>
          <Text className={classes.subtitle}>
            Completa tus datos para continuar.
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
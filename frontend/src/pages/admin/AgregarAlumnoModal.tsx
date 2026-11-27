import {
  Alert,
  Button,
  Checkbox,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconInfoCircle } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import { agregarAlumno, type AlumnoAdmin, type NuevoAlumno } from '../../lib/alumnosAdminApi';
import type { Ingenieria } from '../../lib/dashboardApi';

interface AgregarAlumnoModalProps {
  opened: boolean;
  /** Periodo de ingreso que se propone (el periodo seleccionado). */
  periodo: string;
  ingenierias: Ingenieria[];
  onClose: () => void;
  onAgregado: (alumno: AlumnoAdmin) => void;
}

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Alta de un alumno por el administrador (mismos datos básicos que el registro). */
export default function AgregarAlumnoModal({
  opened,
  periodo,
  ingenierias,
  onClose,
  onAgregado,
}: AgregarAlumnoModalProps) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    initialValues: {
      nombre: '',
      apellido_paterno: '',
      apellido_materno: '',
      sin_apellido_materno: false,
      correo_personal: '',
      correo_institucional: '',
      numero_cuenta: '',
      numero_folio: '',
      ingenieria_id: null as string | null,
      periodo_ingreso: periodo,
    },
    validate: {
      nombre: (v) => (v.trim() ? null : 'Escribe el nombre'),
      apellido_paterno: (v) => (v.trim() ? null : 'Escribe el apellido paterno'),
      apellido_materno: (v, valores) =>
        valores.sin_apellido_materno || v.trim() ? null : 'Escribe el apellido materno o marca la casilla',
      correo_personal: (v) => (CORREO.test(v.trim()) ? null : 'Correo no válido'),
      correo_institucional: (v) => (!v.trim() || CORREO.test(v.trim()) ? null : 'Correo no válido'),
      numero_cuenta: (v, valores) => {
        if (v.trim() && !/^\d{7}$/.test(v.trim())) return 'Deben ser 7 dígitos';
        if (!v.trim() && !valores.numero_folio.trim()) return 'Escribe el número de cuenta o el folio';
        return null;
      },
      numero_folio: (v) => (!v.trim() || /^\d{9}$/.test(v.trim()) ? null : 'Deben ser 9 dígitos'),
      ingenieria_id: (v) => (v ? null : 'Elige la ingeniería'),
      periodo_ingreso: (v) => (/^\d{4}[AB]$/.test(v.trim().toUpperCase()) ? null : 'Formato AAAAA o AAAAB, p. ej. 2026B'),
    },
  });

  // Al abrir se propone el periodo seleccionado en ese momento.
  useEffect(() => {
    if (opened) form.setFieldValue('periodo_ingreso', periodo);
  }, [opened, periodo]);

  const cerrar = () => {
    form.reset();
    setError(null);
    onClose();
  };

  const guardar = form.onSubmit(async (v) => {
    const datos: NuevoAlumno = {
      nombre: v.nombre.trim(),
      apellido_paterno: v.apellido_paterno.trim(),
      apellido_materno: v.sin_apellido_materno ? '' : v.apellido_materno.trim(),
      sin_apellido_materno: v.sin_apellido_materno,
      correo_personal: v.correo_personal.trim(),
      correo_institucional: v.correo_institucional.trim() || null,
      numero_cuenta: v.numero_cuenta.trim() || null,
      numero_folio: v.numero_folio.trim() || null,
      ingenieria_id: Number(v.ingenieria_id),
      periodo_ingreso: v.periodo_ingreso.trim().toUpperCase(),
    };
    setGuardando(true);
    setError(null);
    try {
      const alumno = await agregarAlumno(datos);
      form.reset();
      onAgregado(alumno);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar al alumno');
    } finally {
      setGuardando(false);
    }
  });

  return (
    <Modal opened={opened} onClose={cerrar} title="Agregar alumno" size="lg" centered>
      <form onSubmit={guardar}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Si el alumno ya presentó exámenes sin registrarse, se completa ese registro y conserva sus
            resultados. Después entra con su número de cuenta y contesta el resto del formulario.
          </Text>

          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <TextInput label="Nombre(s)" withAsterisk {...form.getInputProps('nombre')} />
            <TextInput label="Apellido paterno" withAsterisk {...form.getInputProps('apellido_paterno')} />
            <TextInput
              label="Apellido materno"
              disabled={form.values.sin_apellido_materno}
              {...form.getInputProps('apellido_materno')}
            />
          </SimpleGrid>
          <Checkbox
            label="Solo tiene un apellido"
            {...form.getInputProps('sin_apellido_materno', { type: 'checkbox' })}
          />

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label="Correo personal" withAsterisk {...form.getInputProps('correo_personal')} />
            <TextInput
              label="Correo institucional"
              description="Opcional"
              {...form.getInputProps('correo_institucional')}
            />
            <TextInput
              label="Número de cuenta"
              description="7 dígitos. Cuenta o folio, al menos uno."
              {...form.getInputProps('numero_cuenta')}
            />
            <TextInput label="Folio" description="9 dígitos" {...form.getInputProps('numero_folio')} />
            <Select
              label="Ingeniería"
              withAsterisk
              placeholder="Elige la ingeniería"
              data={ingenierias.map((i) => ({ value: String(i.id), label: `${i.clave} — ${i.nombre}` }))}
              searchable
              {...form.getInputProps('ingenieria_id')}
            />
            <TextInput label="Periodo de ingreso" withAsterisk {...form.getInputProps('periodo_ingreso')} />
          </SimpleGrid>

          {error && (
            <Alert color="red" variant="light" icon={<IconInfoCircle size={18} />}>
              {error}
            </Alert>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" loading={guardando}>
              Agregar alumno
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

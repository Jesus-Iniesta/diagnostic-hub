import { Card, Divider, Group, Loader, Stack, Text, Title } from '@mantine/core';
import {
  IconId,
  IconSchool,
  IconUser,
  IconUsersGroup,
} from '@tabler/icons-react';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { fetchMiPerfil } from '../../lib/alumnoApi';
import type { AlumnoPerfil } from '../../types/alumno';
import classes from './ResumenAlumno.module.css';

interface ItemConfig {
  icon: ReactElement;
  label: string;
}

const ITEM_ORDER: Array<keyof AlumnoPerfil> = [
  'numero_cuenta',
  'nombre_completo',
  'licenciatura',
  'grupo',
];

const ITEM_CONFIG: Record<string, ItemConfig> = {
  numero_cuenta: { icon: <IconId size={20} aria-hidden="true" />, label: 'Número de cuenta' },
  nombre_completo: { icon: <IconUser size={20} aria-hidden="true" />, label: 'Nombre completo' },
  licenciatura: { icon: <IconSchool size={20} aria-hidden="true" />, label: 'Licenciatura' },
  grupo: { icon: <IconUsersGroup size={20} aria-hidden="true" />, label: 'Grupo' },
};

export default function ResumenAlumno() {
  const { user } = useAuth();
  const [perfil, setPerfil] = useState<AlumnoPerfil | null>(null);

  useEffect(() => {
    let mounted = true;
    void fetchMiPerfil().then((data) => {
      if (mounted) setPerfil(data);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const nombreCompleto =
    user && (user.nombre || user.apellido_paterno)
      ? `${user.nombre} ${user.apellido_paterno} ${user.apellido_materno ?? ''}`.trim()
      : perfil?.nombre_completo;

  const valores: AlumnoPerfil | null = perfil
    ? { ...perfil, nombre_completo: nombreCompleto ?? perfil.nombre_completo }
    : null;

  return (
    <Card className={classes.card} padding="xl" radius="lg">
      <Title order={3} className={classes.title}>
        Tu información
      </Title>
      <Text className={classes.subtitle}>Estos datos ya están registrados.</Text>

      {!valores ? (
        <Stack align="center" py="xl">
          <Loader size="sm" />
        </Stack>
      ) : (
        <Stack gap={0} mt="lg">
          {ITEM_ORDER.map((key, index) => {
            const value = valores[key];
            if (value == null || value === '') return null;
            const config = ITEM_CONFIG[key];
            return (
              <div key={key}>
                {index > 0 && <Divider my="sm" color="#F0F1F5" />}
                <Group gap="sm" wrap="nowrap" align="flex-start">
                  <span className={classes.iconBox}>{config.icon}</span>
                  <Stack gap={2} style={{ minWidth: 0 }}>
                    <Text className={classes.itemLabel}>{config.label}</Text>
                    <Text className={classes.itemValue}>{value}</Text>
                  </Stack>
                </Group>
              </div>
            );
          })}
        </Stack>
      )}
    </Card>
  );
}
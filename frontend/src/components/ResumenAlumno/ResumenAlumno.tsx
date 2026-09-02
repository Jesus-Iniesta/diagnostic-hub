import {
  Badge,
  Card,
  Divider,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconId,
  IconMail,
  IconSchool,
  IconUser,
  IconUsersGroup,
  IconCheck,
} from '@tabler/icons-react';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

import { fetchMiPerfil } from '../../lib/alumnoApi';
import type { AlumnoPerfil } from '../../types/alumno';
import classes from './ResumenAlumno.module.css';

interface FieldConfig {
  icon: ReactElement;
  label: string;
  category: 'personales' | 'academicos' | 'socioeconomicos';
}

const FIELD_CONFIG: Record<string, FieldConfig> = {
  nombre_completo: { icon: <IconUser size={18} />, label: 'Nombre completo', category: 'personales' },
  correo_personal: { icon: <IconMail size={18} />, label: 'Correo personal (WebAssign)', category: 'personales' },
  correo_institucional: { icon: <IconMail size={18} />, label: 'Correo institucional', category: 'personales' },
  numero_cuenta: { icon: <IconId size={18} />, label: 'Número de cuenta', category: 'academicos' },
  numero_folio: { icon: <IconId size={18} />, label: 'Número de folio', category: 'academicos' },
  ingenieria: { icon: <IconSchool size={18} />, label: 'Ingeniería', category: 'academicos' },
  periodo_ingreso: { icon: <IconSchool size={18} />, label: 'Periodo de ingreso', category: 'academicos' },
  promedio_bachillerato: { icon: <IconSchool size={18} />, label: 'Promedio bachillerato', category: 'academicos' },
  indice_uaem: { icon: <IconSchool size={18} />, label: 'Índice UAEM', category: 'academicos' },
  escuela_procedencia: { icon: <IconSchool size={18} />, label: 'Escuela de procedencia', category: 'academicos' },
  lugar_admision: { icon: <IconSchool size={18} />, label: 'Lugar de admisión', category: 'academicos' },
  tiene_internet: { icon: <IconUsersGroup size={18} />, label: 'Tiene internet', category: 'socioeconomicos' },
  tiene_computadora: { icon: <IconUsersGroup size={18} />, label: 'Tiene computadora', category: 'socioeconomicos' },
  vulnerabilidad_economica: { icon: <IconUsersGroup size={18} />, label: 'Vulnerabilidad económica', category: 'socioeconomicos' },
  es_foraneo: { icon: <IconUsersGroup size={18} />, label: 'Es foráneo', category: 'socioeconomicos' },
  convivencia: { icon: <IconUsersGroup size={18} />, label: 'Convivencia', category: 'socioeconomicos' },
};

const CATEGORY_LABELS: Record<string, string> = {
  personales: 'Datos personales',
  academicos: 'Datos académicos',
  socioeconomicos: 'Datos socioeconómicos',
};

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (key === 'ingenieria' && typeof value === 'object' && value !== null) {
    return (value as { nombre: string }).nombre;
  }
  return String(value);
}

export default function ResumenAlumno() {
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

  if (!perfil) {
    return (
      <Card className={classes.card} padding="xl" radius="lg">
        <Title order={3} className={classes.title}>Tu información</Title>
        <Stack align="center" py="xl">
          <Loader size="sm" />
        </Stack>
      </Card>
    );
  }

  const nombreCompleto = `${perfil.usuario.nombre} ${perfil.usuario.apellido_paterno} ${perfil.usuario.apellido_materno}`.trim();

  const allFields: Array<{ key: string; value: string | null; filled: boolean }> = [
    { key: 'nombre_completo', value: nombreCompleto, filled: !!nombreCompleto },
    { key: 'correo_personal', value: perfil.usuario.correo_personal, filled: !!perfil.usuario.correo_personal },
    { key: 'correo_institucional', value: perfil.usuario.correo_institucional, filled: !!perfil.usuario.correo_institucional },
    { key: 'numero_cuenta', value: perfil.numero_cuenta, filled: !!perfil.numero_cuenta },
    { key: 'numero_folio', value: perfil.numero_folio, filled: !!perfil.numero_folio },
    { key: 'ingenieria', value: formatValue('ingenieria', perfil.ingenieria), filled: true },
    { key: 'periodo_ingreso', value: perfil.periodo_ingreso, filled: !!perfil.periodo_ingreso },
    { key: 'promedio_bachillerato', value: perfil.promedio_bachillerato != null ? String(perfil.promedio_bachillerato) : null, filled: perfil.promedio_bachillerato != null },
    { key: 'indice_uaem', value: perfil.indice_uaem != null ? String(perfil.indice_uaem) : null, filled: perfil.indice_uaem != null },
    { key: 'escuela_procedencia', value: perfil.escuela_procedencia, filled: !!perfil.escuela_procedencia },
    { key: 'lugar_admision', value: perfil.lugar_admision != null ? String(perfil.lugar_admision) : null, filled: perfil.lugar_admision != null },
    { key: 'tiene_internet', value: perfil.tiene_internet != null ? (perfil.tiene_internet ? 'Sí' : 'No') : null, filled: perfil.tiene_internet != null },
    { key: 'tiene_computadora', value: perfil.tiene_computadora != null ? (perfil.tiene_computadora ? 'Sí' : 'No') : null, filled: perfil.tiene_computadora != null },
    { key: 'vulnerabilidad_economica', value: perfil.vulnerabilidad_economica != null ? (perfil.vulnerabilidad_economica ? 'Sí' : 'No') : null, filled: perfil.vulnerabilidad_economica != null },
    { key: 'es_foraneo', value: perfil.es_foraneo != null ? (perfil.es_foraneo ? 'Sí' : 'No') : null, filled: perfil.es_foraneo != null },
    { key: 'convivencia', value: perfil.convivencia, filled: !!perfil.convivencia },
  ];

  const completed = allFields.filter((f) => f.filled).length;
  const total = allFields.length;

  const grouped = allFields.reduce<Record<string, typeof allFields>>((acc, field) => {
    const cat = FIELD_CONFIG[field.key]?.category ?? 'personales';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(field);
    return acc;
  }, {});

  return (
    <Card className={classes.card} padding="xl" radius="lg">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={3} className={classes.title}>Tu información</Title>
          <Text className={classes.subtitle}>
            {completed} de {total} campos completados
          </Text>
        </div>
        <Badge
          color={completed === total ? 'green' : 'orange'}
          variant="light"
          size="lg"
          radius="md"
        >
          {completed === total ? 'Completo' : `${total - completed} pendiente${total - completed !== 1 ? 's' : ''}`}
        </Badge>
      </Group>

      {Object.entries(grouped).map(([cat, fields], groupIndex) => (
        <div key={cat}>
          {groupIndex > 0 && <Divider my="md" color="#F0F1F5" />}
          <Text className={classes.categoryLabel}>{CATEGORY_LABELS[cat]}</Text>
          <Stack gap={0} mt="xs">
            {fields.map((field, index) => {
              const config = FIELD_CONFIG[field.key];
              return (
                <div key={field.key}>
                  {index > 0 && <Divider my="xs" color="#F0F1F5" />}
                  <Group gap="sm" wrap="nowrap" align="flex-start">
                    <span className={`${classes.iconBox} ${field.filled ? classes.iconBoxFilled : classes.iconBoxPending}`}>
                      {field.filled ? <IconCheck size={18} /> : config?.icon}
                    </span>
                    <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
                      <Text className={classes.itemLabel}>{config?.label ?? field.key}</Text>
                      {field.filled ? (
                        <Text className={classes.itemValue}>{field.value}</Text>
                      ) : (
                        <Badge color="orange" variant="light" size="sm" radius="md">
                          Pendiente
                        </Badge>
                      )}
                    </Stack>
                  </Group>
                </div>
              );
            })}
          </Stack>
        </div>
      ))}
    </Card>
  );
}

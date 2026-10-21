import {
  Alert,
  Button,
  Card,
  Collapse,
  Loader,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconChevronDown, IconChevronUp, IconInfoCircle } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import { fetchMiPerfil } from '../../lib/alumnoApi';
import type { AlumnoPerfil } from '../../types/alumno';
import classes from './ResumenAlumno.module.css';

interface Dato {
  label: string;
  value: string | null;
}

function siNo(valor: boolean | null): string | null {
  if (valor === null || valor === undefined) return null;
  return valor ? 'Sí' : 'No';
}

function numero(valor: number | null): string | null {
  return valor === null || valor === undefined ? null : String(valor);
}

function Valor({ value }: { value: string | null }) {
  return value ? (
    <Text className={classes.valor}>{value}</Text>
  ) : (
    <Text className={classes.pendiente}>Pendiente</Text>
  );
}

function Bloque({ datos }: { datos: Dato[] }) {
  return (
    <div className={classes.tabla}>
      {datos.map((d) => (
        <div key={d.label} className={classes.fila}>
          <Text className={classes.label}>{d.label}</Text>
          <Valor value={d.value} />
        </div>
      ))}
    </div>
  );
}

export default function ResumenAlumno() {
  const [perfil, setPerfil] = useState<AlumnoPerfil | null>(null);
  const [verSocio, setVerSocio] = useState(false);

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

  const u = perfil.usuario;
  const nombreCompleto = [u.nombre, u.apellido_paterno, u.apellido_materno]
    .filter(Boolean)
    .join(' ');

  const principales: Dato[] = [
    { label: 'Número de cuenta', value: perfil.numero_cuenta },
    { label: 'Ingeniería', value: perfil.ingenieria?.nombre ?? null },
    { label: 'Periodo', value: perfil.periodo_ingreso || null },
  ];
  const contacto: Dato[] = [
    { label: 'Correo personal', value: u.correo_personal },
    { label: 'Correo institucional', value: u.correo_institucional },
  ];
  const academicos: Dato[] = [
    { label: 'Folio', value: perfil.numero_folio },
    { label: 'Promedio de bachillerato', value: numero(perfil.promedio_bachillerato) },
    { label: 'Índice UAEM', value: numero(perfil.indice_uaem) },
    { label: 'Lugar de admisión', value: numero(perfil.lugar_admision) },
    { label: 'Escuela de procedencia', value: perfil.escuela_procedencia },
  ];
  const socioeconomicos: Dato[] = [
    { label: 'Internet en casa', value: siNo(perfil.tiene_internet) },
    { label: 'Computadora propia', value: siNo(perfil.tiene_computadora) },
    { label: 'Foráneo', value: siNo(perfil.es_foraneo) },
    { label: 'Convivencia', value: perfil.convivencia },
  ];

  const todos = [
    { label: 'Nombre', value: nombreCompleto || null },
    ...principales,
    ...contacto,
    ...academicos,
    ...socioeconomicos,
  ];
  const faltan = todos.filter((d) => !d.value).length;

  return (
    <Card className={classes.card} padding="xl" radius="lg">
      <Stack gap="xl">
        <div>
          <Title order={3} className={classes.title}>Tu información</Title>
          {faltan > 0 && (
            <Alert
              color="orange"
              variant="light"
              radius="md"
              mt="sm"
              icon={<IconInfoCircle size={18} />}
            >
              Te faltan {faltan} dato{faltan !== 1 ? 's' : ''}.
            </Alert>
          )}
        </div>

        <div className={classes.principal}>
          {nombreCompleto ? (
            <Text className={classes.nombre}>{nombreCompleto}</Text>
          ) : (
            <Text className={classes.pendiente}>Nombre pendiente</Text>
          )}
          <Stack gap={6} mt="sm">
            {principales.map((d) => (
              <div key={d.label} className={classes.filaPrincipal}>
                <Text className={classes.labelPrincipal}>{d.label}</Text>
                {d.value ? (
                  <Text className={classes.valorPrincipal}>{d.value}</Text>
                ) : (
                  <Text className={classes.pendiente}>Pendiente</Text>
                )}
              </div>
            ))}
          </Stack>
        </div>

        <div>
          <Text className={classes.blockTitle}>Contacto</Text>
          <Bloque datos={contacto} />
        </div>

        <div>
          <Text className={classes.blockTitle}>Datos académicos</Text>
          <Bloque datos={academicos} />
        </div>

        <div>
          <Text className={classes.blockTitle}>Datos socioeconómicos</Text>
          <Collapse in={verSocio}>
            <Bloque datos={socioeconomicos} />
          </Collapse>
          <Button
            variant="subtle"
            color="indigo"
            size="compact-sm"
            mt={4}
            px={0}
            rightSection={verSocio ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
            onClick={() => setVerSocio((v) => !v)}
            aria-expanded={verSocio}
          >
            {verSocio ? 'Ver menos' : 'Ver más'}
          </Button>
        </div>
      </Stack>
    </Card>
  );
}

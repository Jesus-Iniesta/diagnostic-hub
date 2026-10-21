import { Alert, Card, Loader, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import { fetchMiPerfil } from '../../lib/alumnoApi';
import { obligatoriosFaltantes } from '../../lib/datosContacto';
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

// Etiqueta arriba y valor abajo, para que los correos y la escuela no se partan.
function Campo({ dato, grande = false }: { dato: Dato; grande?: boolean }) {
  return (
    <div className={classes.campo}>
      <Text className={classes.label}>{dato.label}</Text>
      {dato.value ? (
        <Text className={grande ? classes.valorGrande : classes.valor}>{dato.value}</Text>
      ) : (
        <Text className={classes.pendiente}>Pendiente</Text>
      )}
    </div>
  );
}

function Columna({ titulo, datos }: { titulo: string; datos: Dato[] }) {
  return (
    <div className={classes.columna}>
      <Text className={classes.blockTitle}>{titulo}</Text>
      <Stack gap="sm">
        {datos.map((d) => (
          <Campo key={d.label} dato={d} />
        ))}
      </Stack>
    </div>
  );
}

export default function ResumenAlumno() {
  const [perfil, setPerfil] = useState<AlumnoPerfil | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let mounted = true;
    void fetchMiPerfil()
      .then((data) => {
        if (mounted) setPerfil(data);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setCargando(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (cargando || !perfil) {
    return (
      <Card className={classes.card} padding="xl" radius="lg">
        <Title order={3} className={classes.title}>Tu información</Title>
        <Stack align="center" py="xl">
          {cargando ? (
            <Loader size="sm" />
          ) : (
            <Text c="dimmed" size="sm">No se pudo cargar tu información.</Text>
          )}
        </Stack>
      </Card>
    );
  }

  const u = perfil.usuario;
  const nombreCompleto = [u.nombre, u.apellido_paterno, u.apellido_materno]
    .filter(Boolean)
    .join(' ');

  const principales: Dato[] = [
    { label: 'Nombre completo', value: nombreCompleto || null },
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
    { label: 'Vulnerabilidad económica', value: siNo(perfil.vulnerabilidad_economica) },
  ];

  // Lo mismo que cuenta el formulario: solo los obligatorios.
  const faltan = obligatoriosFaltantes(perfil).length;

  return (
    <Card className={classes.card} padding="xl" radius="lg">
      <Stack gap="lg">
        <Title order={3} className={classes.title}>Tu información</Title>

        {faltan > 0 && (
          <Alert color="orange" variant="light" radius="md" icon={<IconInfoCircle size={18} />}>
            {faltan === 1 ? 'Te falta 1 dato.' : `Te faltan ${faltan} datos.`}
          </Alert>
        )}

        <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="lg" className={classes.principal}>
          {principales.map((d) => (
            <Campo key={d.label} dato={d} grande />
          ))}
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl">
          <Columna titulo="Contacto" datos={contacto} />
          <Columna titulo="Datos académicos" datos={academicos} />
          <Columna titulo="Datos socioeconómicos" datos={socioeconomicos} />
        </SimpleGrid>
      </Stack>
    </Card>
  );
}

import { Button, Card, Group, Skeleton, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { obtenerEstado, type EstadoPeriodo } from '../../lib/cargaPeriodoApi';

interface Paso {
  titulo: string;
  detalle: string;
  /** Línea gris aparte (no cuenta para el paso). */
  nota?: string;
  hecho: boolean;
  to: string;
  accion: string;
}

function pasos(e: EstadoPeriodo): Paso[] {
  return [
    {
      titulo: 'Sube los exámenes',
      detalle: `${e.subidos} de ${e.total_examenes} archivos`,
      hecho: e.subidos === e.total_examenes,
      to: '/admin/carga',
      accion: 'Ir a Carga',
    },
    {
      titulo: 'Procesar todo',
      detalle: e.procesado
        ? `Procesado el ${new Date(e.procesado_en ?? '').toLocaleDateString('es-MX')}`
        : e.subidos > 0
          ? 'Hay archivos sin procesar'
          : 'Aún no hay archivos',
      hecho: e.procesado,
      to: '/admin/carga?tab=procesar',
      accion: 'Procesar',
    },
    {
      titulo: 'Revisa alumnos',
      detalle:
        e.por_revisar.posibles_duplicados === 0
          ? 'Sin posibles duplicados'
          : `${e.por_revisar.posibles_duplicados} posibles duplicados por revisar`,
      nota:
        e.por_revisar.sin_cuenta > 0
          ? `${e.por_revisar.sin_cuenta} sin número de cuenta (se completa cuando el alumno se registra)`
          : undefined,
      hecho: e.procesado && e.por_revisar.posibles_duplicados === 0,
      to: '/admin/alumnos?filtro=duplicados',
      accion: 'Revisar',
    },
    {
      titulo: 'Descarga el CREANI',
      detalle: e.creani_descargado ? 'Descargado' : 'Pendiente',
      hecho: e.creani_descargado,
      to: '/admin/reportes',
      accion: 'Ir a Reportes',
    },
  ];
}

/** Guía corta del periodo en Inicio, con ✓ en cada paso ya hecho. */
export default function PasosPeriodo({ periodo }: { periodo: string }) {
  const [estado, setEstado] = useState<EstadoPeriodo | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    setEstado(null);
    setError(false);
    obtenerEstado(periodo)
      .then((e) => {
        if (mounted) setEstado(e);
      })
      .catch(() => {
        if (mounted) setError(true);
      });
    return () => {
      mounted = false;
    };
  }, [periodo]);

  return (
    <Card withBorder radius="lg" padding="lg">
      <Text fw={700} mb="sm">
        Pasos del periodo {periodo}
      </Text>
      {error && (
        <Text size="sm" c="dimmed">
          No se pudo cargar el avance del periodo.
        </Text>
      )}
      {!estado && !error && <Skeleton height={56} radius="md" />}
      {estado && (
        <Stack gap="xs">
          {pasos(estado).map((p, i) => (
            <Group key={p.titulo} justify="space-between" wrap="nowrap">
              <Group gap="sm" wrap="nowrap">
                <ThemeIcon radius="xl" size={28} color={p.hecho ? 'green' : 'gray'} variant={p.hecho ? 'filled' : 'light'}>
                  {p.hecho ? <IconCheck size={16} /> : <Text size="sm" fw={700}>{i + 1}</Text>}
                </ThemeIcon>
                <div>
                  <Text size="sm" fw={600}>
                    {i + 1}) {p.titulo}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {p.detalle}
                  </Text>
                  {p.nota && (
                    <Text size="xs" c="gray.5">
                      {p.nota}
                    </Text>
                  )}
                </div>
              </Group>
              {!p.hecho && (
                <Button component={Link} to={p.to} size="compact-sm" variant="light">
                  {p.accion}
                </Button>
              )}
            </Group>
          ))}
        </Stack>
      )}
    </Card>
  );
}

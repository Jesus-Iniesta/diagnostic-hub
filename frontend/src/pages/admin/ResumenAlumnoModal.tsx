import {
  Alert,
  Badge,
  Group,
  Loader,
  Modal,
  Progress,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import {
  obtenerResumenAlumno,
  type AlumnoAdmin,
  type ResumenAlumnoAdmin,
} from '../../lib/alumnosAdminApi';
import { aPorcentaje } from '../../lib/categorias';

interface ResumenAlumnoModalProps {
  /** Alumno a mostrar; null cierra el modal. */
  alumno: AlumnoAdmin | null;
  /** Periodo de los resultados; sin periodo, el más reciente con resultados. */
  periodo?: string;
  onClose: () => void;
}

function nota(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? '—' : String(Number(valor.toFixed(2)));
}

function Dato({ label, valor }: { label: string; valor: string | null }) {
  return (
    <div>
      <Text size="xs" c="dimmed" fw={600}>
        {label}
      </Text>
      <Text size="sm" style={{ overflowWrap: 'anywhere' }}>
        {valor || '—'}
      </Text>
    </div>
  );
}

function SinExamen({ texto }: { texto: string }) {
  return (
    <Text size="sm" c="dimmed">
      {texto}
    </Text>
  );
}

/** Tabla compacta de calificaciones de un examen. */
function TablaExamen({ columnas, filas }: { columnas: string[]; filas: (string | number)[][] }) {
  return (
    <Table withTableBorder withColumnBorders verticalSpacing={4} fz="sm">
      <Table.Thead>
        <Table.Tr>
          {columnas.map((c) => (
            <Table.Th key={c}>{c}</Table.Th>
          ))}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {filas.map((fila) => (
          <Table.Tr key={String(fila[0])}>
            {fila.map((celda, i) => (
              <Table.Td key={i}>{celda}</Table.Td>
            ))}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

function Resultados({ resumen }: { resumen: ResumenAlumnoAdmin }) {
  const { calificaciones: cal } = resumen;
  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end">
        <div>
          <Text size="xs" c="dimmed" fw={600}>
            Índice FI UAEMex · {resumen.periodo}
          </Text>
          <Text fw={700} fz={26} lh={1.2}>
            {resumen.indice === null ? 'Sin resultados' : aPorcentaje(resumen.indice)}
            {resumen.indice !== null && (
              <Text span c="dimmed" fz="sm" fw={500}>
                {' '}
                / {aPorcentaje(resumen.maximo)}
              </Text>
            )}
          </Text>
        </div>
        {resumen.categoria && (
          <Badge size="lg" variant="light" tt="none">
            {resumen.categoria}
          </Badge>
        )}
      </Group>

      <Stack gap={6}>
        {resumen.componentes.map((c) => (
          <div key={c.nombre}>
            <Group justify="space-between" gap="xs">
              <Text size="sm">
                {c.nombre}
                {!c.presentado && (
                  <Text span size="xs" c="orange.7" ml={6}>
                    no presentado
                  </Text>
                )}
              </Text>
              <Text size="sm" fw={600}>
                {aPorcentaje(c.obtenido)} de {aPorcentaje(c.valor)}
              </Text>
            </Group>
            <Progress value={c.valor ? (c.obtenido / c.valor) * 100 : 0} size="sm" color="indigo" />
          </div>
        ))}
      </Stack>

      <Title order={6}>Examen diagnóstico (aciertos de {cal.diagnostico?.maximo ?? 10})</Title>
      {cal.diagnostico ? (
        <TablaExamen
          columnas={['Materia', 'Cuestionario 1', 'Cuestionario 2']}
          filas={cal.diagnostico.materias.map((m) => [m.materia, nota(m.c1), nota(m.c2)])}
        />
      ) : (
        <SinExamen texto="No presentó el examen diagnóstico en este periodo." />
      )}

      <Title order={6}>
        WebAssign {cal.webassign ? `· ${cal.webassign.carrera}` : ''} (de {cal.webassign?.maximo ?? 10})
      </Title>
      {cal.webassign ? (
        <TablaExamen
          columnas={['Materia', 'Tareas', 'Examen']}
          filas={cal.webassign.materias.map((m) => [m.materia, nota(m.tareas), nota(m.examen)])}
        />
      ) : (
        <SinExamen texto="No tiene resultados de WebAssign en este periodo." />
      )}

      <Title order={6}>
        Examen final (de {cal.final?.maximo ?? 10})
        {cal.final?.promedio != null && ` · promedio ${nota(cal.final.promedio)}`}
      </Title>
      {cal.final ? (
        <TablaExamen
          columnas={['Materia', 'Calificación']}
          filas={cal.final.materias.map((m) => [m.materia, nota(m.calificacion)])}
        />
      ) : (
        <SinExamen texto="No presentó el examen final en este periodo." />
      )}
    </Stack>
  );
}

/** Resumen de un alumno: datos de registro, Índice FI y calificaciones por examen. */
export default function ResumenAlumnoModal({ alumno, periodo, onClose }: ResumenAlumnoModalProps) {
  const [resumen, setResumen] = useState<ResumenAlumnoAdmin | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!alumno) return;
    let vigente = true;
    setResumen(null);
    setError(null);
    obtenerResumenAlumno(alumno.id, periodo)
      .then((r) => {
        if (vigente) setResumen(r);
      })
      .catch((err) => {
        if (vigente) setError(err instanceof Error ? err.message : 'No se pudo cargar el resumen');
      });
    return () => {
      vigente = false;
    };
  }, [alumno, periodo]);

  const datos = resumen?.alumno ?? alumno;

  return (
    <Modal
      opened={alumno !== null}
      onClose={onClose}
      title={<Text fw={700}>{datos?.nombre || 'Alumno sin nombre'}</Text>}
      size="lg"
      centered
    >
      {datos && (
        <Stack gap="lg">
          <div>
            {datos.es_provisional && (
              <Badge color="orange" variant="light" mb="xs">
                Provisional: aún no se registra
              </Badge>
            )}
            <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
              <Dato label="Número de cuenta" valor={datos.numero_cuenta} />
              <Dato label="Folio" valor={datos.numero_folio} />
              <Dato label="Correo personal" valor={datos.correo_personal} />
              <Dato label="Correo institucional" valor={datos.correo_institucional} />
              <Dato label="Ingeniería" valor={datos.ingenieria} />
              <Dato label="Periodo de ingreso" valor={datos.periodo_ingreso} />
            </SimpleGrid>
          </div>

          {error && (
            <Alert color="red" variant="light" icon={<IconInfoCircle size={18} />}>
              {error}
            </Alert>
          )}
          {!resumen && !error && (
            <Group justify="center" py="md">
              <Loader size="sm" />
            </Group>
          )}
          {resumen && <Resultados resumen={resumen} />}
        </Stack>
      )}
    </Modal>
  );
}

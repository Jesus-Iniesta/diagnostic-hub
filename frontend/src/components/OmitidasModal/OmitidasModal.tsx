import { Badge, Modal, ScrollArea, Table, Text } from '@mantine/core';

import type { OmitidaDetalle, RazonOmitida } from '../../types/omitidas';

const RAZON_COLOR: Record<RazonOmitida, string> = {
  'registro del alumno': 'blue',
  'periodo marcado en el formulario': 'grape',
  'rango de fechas': 'yellow',
};

function formatFechaHora(valor: string | null): string {
  if (!valor) return '—';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

interface OmitidasModalProps {
  opened: boolean;
  onClose: () => void;
  omitidas: OmitidaDetalle[];
  periodo: string;
}

/** Lista de solo lectura de las filas omitidas por ser de otro periodo. */
export default function OmitidasModal({ opened, onClose, omitidas, periodo }: OmitidasModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title={`Filas omitidas (no son de ${periodo})`} size="xl" radius="md">
      <Text size="sm" c="dimmed" mb="md">
        Se decide primero por el registro del alumno; si no se encontró, por el periodo que marcó en el
        formulario; si no lo marcó, por el rango de fechas del periodo.
      </Text>
      {omitidas.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">No hay filas omitidas.</Text>
      ) : (
        <ScrollArea.Autosize mah={480}>
          <Table striped highlightOnHover stickyHeader fz="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Fila</Table.Th>
                <Table.Th>Correo</Table.Th>
                <Table.Th>Folio</Table.Th>
                <Table.Th>Fecha</Table.Th>
                <Table.Th>Periodo detectado</Table.Th>
                <Table.Th>Razón</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {omitidas.map((o) => (
                <Table.Tr key={o.indice}>
                  {/* +2: encabezado y numeración desde 1, para que coincida con la fila del Excel */}
                  <Table.Td>{o.indice + 2}</Table.Td>
                  <Table.Td style={{ wordBreak: 'break-all' }}>{o.correo ?? '—'}</Table.Td>
                  <Table.Td>{o.folio ?? '—'}</Table.Td>
                  <Table.Td style={{ whiteSpace: 'nowrap' }}>{formatFechaHora(o.fecha)}</Table.Td>
                  <Table.Td>{o.periodo_detectado ?? '—'}</Table.Td>
                  <Table.Td>
                    <Badge variant="light" color={RAZON_COLOR[o.razon] ?? 'gray'} radius="sm">
                      {o.razon}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea.Autosize>
      )}
    </Modal>
  );
}

import { Badge, Group, Text, Tooltip } from '@mantine/core';

import { fmtIndice } from '../../lib/categorias';

interface IndiceAlumnoProps {
  indice: number | null;
  maximo: number;
  faltantes: string[];
}

/** Índice del alumno; si le falta algún examen, lo dice para que no parezca que reprobó. */
export default function IndiceAlumno({ indice, maximo, faltantes }: IndiceAlumnoProps) {
  return (
    <Group gap={6} wrap="nowrap">
      <Text size="sm" style={{ whiteSpace: 'nowrap' }}>
        {fmtIndice(indice, maximo)}
      </Text>
      {indice != null && faltantes.length > 0 && (
        <Tooltip label={`Le falta: ${faltantes.join(', ')}`} withArrow multiline maw={260}>
          <Badge variant="light" color="gray" tt="none" size="sm" style={{ cursor: 'help' }}>
            Incompleto
          </Badge>
        </Tooltip>
      )}
    </Group>
  );
}

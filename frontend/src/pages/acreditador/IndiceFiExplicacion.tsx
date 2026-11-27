import { Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';

import { aPorcentaje, colorCategoria } from '../../lib/categorias';
import type { ExplicacionIndice } from '../../lib/reportesApi';
import classes from './AcreditadorHome.module.css';

/** Qué es el Índice FI UAEMex y cómo se forma con la configuración del periodo. */
export default function IndiceFiExplicacion({
  indice,
  maximo,
  periodo,
}: {
  indice: ExplicacionIndice;
  maximo: number;
  periodo: string;
}) {
  const nombres = indice.categorias.map((c) => c.nombre);

  return (
    <Card p="lg" radius="lg" className={classes.card}>
      <Group gap="xs" mb={6} wrap="nowrap">
        <IconInfoCircle size={20} color="var(--mantine-color-indigo-6)" aria-hidden="true" />
        <Title order={4}>¿Qué es el Índice FI UAEMex?</Title>
      </Group>
      <Text size="sm" c="dimmed" mb="md">
        Es una calificación de 0% a {aPorcentaje(maximo)} que resume el desempeño de cada alumno
        en el curso de nivelación de matemáticas. Suma lo que aporta cada examen según su peso; un
        examen no presentado aporta 0. Con el índice, cada alumno queda en una categoría. Los pesos
        y las categorías los define el coordinador para el periodo {periodo}.
      </Text>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
        <Stack gap={6}>
          <Text className={classes.label}>Cómo se forma</Text>
          {indice.componentes.map((c) => (
            <Group key={c.nombre} justify="space-between" className={classes.fila}>
              <Text size="sm">{c.nombre}</Text>
              <Text size="sm" fw={700}>hasta {aPorcentaje(c.valor)}</Text>
            </Group>
          ))}
          <Group justify="space-between" className={classes.filaTotal}>
            <Text size="sm" fw={700}>Índice máximo</Text>
            <Text size="sm" fw={700}>{aPorcentaje(maximo)}</Text>
          </Group>
        </Stack>

        <Stack gap={6}>
          <Text className={classes.label}>Categorías</Text>
          {indice.categorias.map((c) => (
            <Group key={c.nombre} justify="space-between" wrap="nowrap" className={classes.fila}>
              <Group gap={8} wrap="nowrap">
                <span
                  className={classes.punto}
                  style={{ background: colorCategoria(c.nombre, nombres) }}
                  aria-hidden="true"
                />
                <Text size="sm">{c.nombre}</Text>
              </Group>
              <Text size="sm" c="dimmed">
                {aPorcentaje(c.minimo)} a {aPorcentaje(c.maximo)}
              </Text>
            </Group>
          ))}
        </Stack>
      </SimpleGrid>
    </Card>
  );
}

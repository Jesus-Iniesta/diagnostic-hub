import { Group, Text, Tooltip } from '@mantine/core';

import { colorCategoria } from '../../lib/categorias';
import type { CategoriaConteo } from '../../lib/reportesApi';
import classes from './CategoriasBarra.module.css';

/** Barra apilada con cuántos alumnos hay en cada categoría, y su leyenda. */
export default function CategoriasBarra({ categorias }: { categorias: CategoriaConteo[] }) {
  const nombres = categorias.map((c) => c.categoria);
  const total = categorias.reduce((a, c) => a + c.cantidad, 0);

  return (
    <div>
      <div className={classes.barra} role="img" aria-label="Alumnos por categoría">
        {total === 0 ? (
          <div className={classes.vacia} />
        ) : (
          categorias
            .filter((c) => c.cantidad > 0)
            .map((c) => (
              <Tooltip key={c.categoria} label={`${c.categoria}: ${c.cantidad}`} withArrow>
                <div
                  className={classes.segmento}
                  style={{
                    flexGrow: c.cantidad,
                    background: colorCategoria(c.categoria, nombres),
                  }}
                />
              </Tooltip>
            ))
        )}
      </div>
      <Group gap="sm" mt={6} wrap="wrap">
        {categorias.map((c) => (
          <Group key={c.categoria} gap={4} wrap="nowrap">
            <span
              className={classes.punto}
              style={{ background: colorCategoria(c.categoria, nombres) }}
            />
            <Text size="xs" c="dimmed">
              {c.categoria} <b className={classes.cantidad}>{c.cantidad}</b>
            </Text>
          </Group>
        ))}
      </Group>
    </div>
  );
}

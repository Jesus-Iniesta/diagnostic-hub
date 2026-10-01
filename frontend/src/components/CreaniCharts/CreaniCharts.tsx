import { Card, Grid, Stack, Text, Title } from '@mantine/core';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { dashboardColors } from '../../theme/theme';
import type { GrupoCreani } from '../../types/profesor';

// Colores por materia del Excel CREANI (reportes_service.CREANI_FILL_*).
const COLOR_ALGEBRA = '#A6CAEC';
const COLOR_TRIG = '#F6C6AD';
const COLOR_GEOMETRIA = '#84E291';
const COLOR_CALCULO = '#D9F2D0';

interface Barra {
  etiqueta: string;
  valor: number | null;
  color: string;
}

interface Bloque {
  titulo: string;
  n: number;
  barras: Barra[];
  span: number;
}

function ValorTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: Barra }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#fff', padding: '8px 12px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
      <Text size="sm" fw={600}>{d.etiqueta}</Text>
      <Text size="xs" c="dimmed">{d.valor != null ? d.valor.toFixed(1) : 'Sin datos'}</Text>
    </div>
  );
}

// Parte la etiqueta en dos renglones para que quepan las 6 barras de WebAssign.
function EtiquetaTick({
  x,
  y,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
}) {
  const palabras = (payload?.value ?? '').split(' ');
  return (
    <text x={x} y={y} textAnchor="middle" fill="#667085" fontSize={11} fontWeight={600}>
      {palabras.map((p, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 12 : 13}>
          {p}
        </tspan>
      ))}
    </text>
  );
}

function GraficaBarras({ data, height }: { data: Barra[]; height: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }} barCategoryGap="15%">
        <CartesianGrid vertical={false} strokeDasharray="5 5" stroke="#E8EAF0" />
        <XAxis
          dataKey="etiqueta"
          axisLine={false}
          tickLine={false}
          interval={0}
          height={36}
          tick={<EtiquetaTick />}
        />
        <YAxis
          domain={[0, 10]}
          ticks={[0, 2, 4, 6, 8, 10]}
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#98A2B3', fontSize: 12 }}
          width={40}
        />
        <Tooltip content={<ValorTooltip />} cursor={{ fill: 'rgba(16,24,40,0.04)' }} />
        <Bar dataKey="valor" radius={[8, 8, 0, 0]} maxBarSize={48}>
          {data.map((b) => (
            <Cell key={b.etiqueta} fill={b.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface CreaniChartsProps {
  creani: GrupoCreani;
  cardClassName?: string;
  titleClassName?: string;
}

export default function CreaniCharts({ creani, cardClassName, titleClassName }: CreaniChartsProps) {
  const { diagnostico, webassign, final } = creani.secciones;

  const bloques: Bloque[] = [
    {
      titulo: 'Diagnóstico',
      n: diagnostico.n,
      span: 4,
      barras: [
        { etiqueta: 'Álgebra', valor: diagnostico.algebra, color: COLOR_ALGEBRA },
        { etiqueta: 'Trig.', valor: diagnostico.trigonometria, color: COLOR_TRIG },
        { etiqueta: 'G. Analítica', valor: diagnostico.geometria, color: COLOR_GEOMETRIA },
        { etiqueta: 'Cálc. Dif', valor: diagnostico.calculo, color: COLOR_CALCULO },
      ],
    },
    {
      titulo: 'WebAssign',
      n: webassign.n,
      span: 6,
      barras: [
        { etiqueta: 'Álg. trabajo', valor: webassign.alg_trabajo, color: COLOR_ALGEBRA },
        { etiqueta: 'Álg. examen', valor: webassign.alg_examen, color: COLOR_ALGEBRA },
        { etiqueta: 'Trig. trabajo', valor: webassign.trig_trabajo, color: COLOR_TRIG },
        { etiqueta: 'Trig. examen', valor: webassign.trig_examen, color: COLOR_TRIG },
        { etiqueta: 'GA trabajo', valor: webassign.ga_trabajo, color: COLOR_GEOMETRIA },
        { etiqueta: 'GA examen', valor: webassign.ga_examen, color: COLOR_GEOMETRIA },
      ],
    },
    {
      titulo: 'Final',
      n: final.n,
      span: 4,
      barras: [
        { etiqueta: 'Álgebra', valor: final.algebra, color: COLOR_ALGEBRA },
        { etiqueta: 'Trig.', valor: final.trigonometria, color: COLOR_TRIG },
        { etiqueta: 'G. Analítica', valor: final.geometria, color: COLOR_GEOMETRIA },
        { etiqueta: 'Cálc. Dif', valor: final.calculo, color: COLOR_CALCULO },
      ],
    },
  ];

  const totales: Barra[] = [
    { etiqueta: 'Diagnóstico', valor: creani.totales.diagnostico, color: dashboardColors.blue },
    { etiqueta: 'Final', valor: creani.totales.final, color: dashboardColors.green },
  ];
  const hayTotales = totales.some((t) => t.valor != null);

  return (
    <Grid gutter="lg" mt="lg" align="stretch">
      <Grid.Col span={{ base: 12, lg: 9 }}>
        <Card className={cardClassName} padding="xl" radius="lg" h="100%">
          <Title order={4} className={titleClassName} mb="md">
            Resultados por sección
          </Title>
          <Grid columns={14} gutter="md">
            {bloques.map((bloque) => (
              <Grid.Col key={bloque.titulo} span={{ base: 14, md: bloque.span }}>
                <Stack gap={4} align="stretch">
                  <Text fw={700} size="sm" ta="center">{bloque.titulo}</Text>
                  {bloque.n > 0 ? (
                    <GraficaBarras data={bloque.barras} height={240} />
                  ) : (
                    <Text c="dimmed" ta="center" py={100}>Sin datos</Text>
                  )}
                  <Text size="xs" c="dimmed" ta="center">n = {bloque.n} alumnos</Text>
                </Stack>
              </Grid.Col>
            ))}
          </Grid>
        </Card>
      </Grid.Col>

      <Grid.Col span={{ base: 12, lg: 3 }}>
        <Card className={cardClassName} padding="xl" radius="lg" h="100%">
          <Title order={4} className={titleClassName} mb="md">
            Promedio total
          </Title>
          {hayTotales ? (
            <GraficaBarras data={totales} height={262} />
          ) : (
            <Text c="dimmed" ta="center" py="xl">Sin datos</Text>
          )}
        </Card>
      </Grid.Col>
    </Grid>
  );
}

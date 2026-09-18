import { Card, Group, Select, Skeleton, Text } from '@mantine/core';
import { IconChartBar } from '@tabler/icons-react';
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

import type { LevelDistribution } from '../../lib/dashboardApi';
import { dashboardColors } from '../../theme/theme';
import classes from './StudentsLevelChart.module.css';

const LEVEL_COLORS: Record<string, string> = {
  Alto: dashboardColors.green,
  Bueno: dashboardColors.blue,
  Medio: dashboardColors.orange,
  Bajo: dashboardColors.red,
  'Muy bajo': '#98A2B3',
};

interface StudentsLevelChartProps {
  data: LevelDistribution[];
  programs: Array<{ value: string; label: string }>;
  program: string | null;
  onProgramChange: (value: string | null) => void;
  loading: boolean;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: LevelDistribution }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const { nivel, cantidad, porcentaje } = payload[0].payload;

  return (
    <div className={classes.tooltip}>
      <Text className={classes.tooltipLevel}>{nivel}</Text>
      <Text className={classes.tooltipValue} style={{ color: LEVEL_COLORS[nivel] }}>
        {cantidad.toLocaleString()} alumnos · {porcentaje}%
      </Text>
    </div>
  );
}

export default function StudentsLevelChart({
  data,
  programs,
  program,
  onProgramChange,
  loading,
}: StudentsLevelChartProps) {
  const maxValue = data.length > 0 ? Math.max(...data.map((d) => d.cantidad)) : 0;
  const yMax = Math.ceil(maxValue / 200) * 200 || 200;

  return (
    <Card className={classes.card} padding="xl" radius="lg">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Group gap="sm" wrap="nowrap">
          <span className={classes.iconBox}>
            <IconChartBar size={22} color={dashboardColors.blue} stroke={2} aria-hidden="true" />
          </span>
          <div>
            <Text className={classes.title}>Distribución de alumnos por nivel</Text>
            <Text className={classes.subtitle}>
              Resultados del examen diagnóstico
            </Text>
          </div>
        </Group>

        <Select
          data={programs}
          value={program ?? '__all__'}
          onChange={(v) => onProgramChange(v === '__all__' ? null : v)}
          w={220}
          size="sm"
          variant="default"
          radius="md"
        />
      </Group>

      {loading ? (
        <Skeleton height={260} mt="lg" radius="md" />
      ) : (
        <div className={classes.chart}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 16, right: 16, bottom: 0, left: -16 }}
              barCategoryGap="28%"
            >
              <CartesianGrid vertical={false} strokeDasharray="5 5" stroke="#E8EAF0" />
              <XAxis
                dataKey="nivel"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#667085', fontSize: 13, fontWeight: 600 }}
                dy={8}
              />
              <YAxis
                domain={[0, yMax]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#98A2B3', fontSize: 12 }}
                width={48}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(16,24,40,0.04)' }} />
              <Bar dataKey="cantidad" radius={[10, 10, 0, 0]} barSize={56}>
                {data.map((entry) => (
                  <Cell key={entry.nivel} fill={LEVEL_COLORS[entry.nivel]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

import { Card, Group, Select, Text } from '@mantine/core';
import { IconChartBar } from '@tabler/icons-react';
import { useState } from 'react';
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

import {
  levelDistribution,
  programOptions,
} from '../../mocks/adminDashboard';
import { dashboardColors } from '../../theme/theme';
import classes from './StudentsLevelChart.module.css';

const LEVEL_COLORS: Record<string, string> = {
  Alto: dashboardColors.green,
  Medio: dashboardColors.orange,
  Bajo: dashboardColors.red,
};

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { level: string; value: number; percent: number } }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const { level, value, percent } = payload[0].payload;

  return (
    <div className={classes.tooltip}>
      <Text className={classes.tooltipLevel}>{level}</Text>
      <Text className={classes.tooltipValue} style={{ color: LEVEL_COLORS[level] }}>
        {value.toLocaleString()} alumnos · {percent}%
      </Text>
    </div>
  );
}

export default function StudentsLevelChart() {
  const [program, setProgram] = useState(programOptions[0]);
  const data = levelDistribution.map(({ level, value, percent }) => ({
    level,
    value,
    percent,
  }));

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
          data={programOptions}
          value={program}
          onChange={(v) => setProgram(v ?? programOptions[0])}
          w={190}
          size="sm"
          variant="default"
          radius="md"
        />
      </Group>

      <div className={classes.chart}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 16, right: 16, bottom: 0, left: -16 }}
            barCategoryGap="28%"
          >
            <CartesianGrid vertical={false} strokeDasharray="5 5" stroke="#E8EAF0" />
            <XAxis
              dataKey="level"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#667085', fontSize: 13, fontWeight: 600 }}
              dy={8}
            />
            <YAxis
              domain={[0, 800]}
              ticks={[0, 200, 400, 600, 800]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#98A2B3', fontSize: 12 }}
              width={48}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(16,24,40,0.04)' }} />
            <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={56}>
              {data.map((entry) => (
                <Cell key={entry.level} fill={LEVEL_COLORS[entry.level]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
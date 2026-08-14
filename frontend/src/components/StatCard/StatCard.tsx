import { Card, Text } from '@mantine/core';
import type { ReactElement } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

import classes from './StatCard.module.css';

export interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  color: string;
  lightColor: string;
  icon: ReactElement;
  chartData: number[];
}

export default function StatCard({
  title,
  value,
  description,
  color,
  lightColor,
  icon,
  chartData,
}: StatCardProps) {
  const gradId = `stat-grad-${title.toLowerCase().replace(/\s+/g, '-')}`;
  const data = chartData.map((v, i) => ({ i, v }));

  return (
    <Card className={classes.card} padding="lg" radius="lg">
      <div className={classes.topRow}>
        <span className={classes.iconBox} style={{ background: lightColor }}>
          {icon}
        </span>
      </div>

      <Text className={classes.title}>{title}</Text>
      <Text className={classes.value}>{value}</Text>
      <Text className={classes.description}>{description}</Text>

      <div className={classes.chart}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradId})`}
              dot={false}
              activeDot={false}
              isAnimationActive
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
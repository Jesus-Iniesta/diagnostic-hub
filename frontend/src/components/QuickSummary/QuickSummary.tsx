import { Card, Divider, Group, Skeleton, Stack, Text } from '@mantine/core';
import {
  IconAlertTriangle,
  IconClock,
  IconUserCheck,
} from '@tabler/icons-react';
import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';

import type { QuickSummary as QuickSummaryData } from '../../lib/dashboardApi';
import { dashboardColors } from '../../theme/theme';
import classes from './QuickSummary.module.css';

interface QuickSummaryProps {
  summary: QuickSummaryData | null;
  /** Posibles duplicados + sin cuenta + no se pudieron registrar. */
  porRevisar: number | null;
  loading: boolean;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Sin datos';
  const date = new Date(iso);
  return date.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface SummaryItem {
  icon: ReactElement;
  title: string;
  text: string;
  status: string;
  color: string;
  lightColor: string;
  statusColor: string;
  to?: string;
}

function buildItems(summary: QuickSummaryData, porRevisar: number): SummaryItem[] {
  return [
    {
      icon: <IconClock size={20} aria-hidden="true" />,
      title: 'Último procesamiento',
      text: formatDate(summary.ultimo_procesamiento),
      status: 'Completado correctamente',
      color: dashboardColors.green,
      lightColor: dashboardColors.greenLight,
      statusColor: dashboardColors.green,
    },
    {
      icon: <IconUserCheck size={20} aria-hidden="true" />,
      title: 'Alumnos procesados',
      text: `${summary.alumnos_procesados.toLocaleString()} alumnos`,
      status: `${summary.porcentaje_procesado}% del total`,
      color: dashboardColors.blue,
      lightColor: dashboardColors.blueLight,
      statusColor: dashboardColors.blue,
    },
    {
      icon: <IconAlertTriangle size={20} aria-hidden="true" />,
      title: `Por revisar: ${porRevisar.toLocaleString()}`,
      text: 'Posibles duplicados, sin cuenta y no registrados',
      status: porRevisar === 0 ? 'Nada por revisar' : 'Ver en Alumnos →',
      color: dashboardColors.orange,
      lightColor: dashboardColors.orangeLight,
      statusColor: porRevisar === 0 ? dashboardColors.green : dashboardColors.orange,
      to: '/admin/alumnos?filtro=por_revisar',
    },
  ];
}

export default function QuickSummary({ summary, porRevisar, loading }: QuickSummaryProps) {
  const items = summary ? buildItems(summary, porRevisar ?? 0) : [];

  return (
    <Card className={classes.card} padding="xl" radius="lg">
      <Text className={classes.title}>Resumen rápido</Text>

      {loading ? (
        <Stack gap="md" mt="lg">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height={60} radius="md" />
          ))}
        </Stack>
      ) : (
        <Stack gap={0} mt="lg">
          {items.map((item, index) => (
            <div key={item.title}>
              {index > 0 && <Divider my="sm" color="#F0F1F5" />}
              <Group gap="sm" wrap="nowrap" align="flex-start">
                <span
                  className={classes.iconBox}
                  style={{ background: item.lightColor, color: item.color }}
                >
                  {item.icon}
                </span>
                <Stack gap={2} style={{ minWidth: 0 }}>
                  <Text className={classes.itemTitle}>{item.title}</Text>
                  <Text className={classes.itemText}>{item.text}</Text>
                  {item.to ? (
                    <Text
                      component={Link}
                      to={item.to}
                      className={classes.itemStatus}
                      style={{ color: item.statusColor, textDecoration: 'none' }}
                    >
                      {item.status}
                    </Text>
                  ) : (
                    <Text className={classes.itemStatus} style={{ color: item.statusColor }}>
                      {item.status}
                    </Text>
                  )}
                </Stack>
              </Group>
            </div>
          ))}
        </Stack>
      )}
    </Card>
  );
}

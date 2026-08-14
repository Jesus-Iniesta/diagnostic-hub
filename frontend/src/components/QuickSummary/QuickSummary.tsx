import { Card, Divider, Group, Stack, Text } from '@mantine/core';
import {
  IconAlertTriangle,
  IconFiles,
  IconRefresh,
  IconUserCheck,
} from '@tabler/icons-react';
import type { ReactElement } from 'react';

import {
  quickSummary,
  type QuickSummaryItemMock,
} from '../../mocks/adminDashboard';
import { dashboardColors } from '../../theme/theme';
import classes from './QuickSummary.module.css';

type ItemConfig = {
  icon: ReactElement;
  color: string;
  lightColor: string;
  statusColor: string;
};

const ITEM_CONFIG: Record<QuickSummaryItemMock['id'], ItemConfig> = {
  procesamiento: {
    icon: <IconRefresh size={20} aria-hidden="true" />,
    color: dashboardColors.green,
    lightColor: dashboardColors.greenLight,
    statusColor: dashboardColors.green,
  },
  archivos: {
    icon: <IconFiles size={20} aria-hidden="true" />,
    color: dashboardColors.purple,
    lightColor: dashboardColors.purpleLight,
    statusColor: dashboardColors.green,
  },
  alumnos: {
    icon: <IconUserCheck size={20} aria-hidden="true" />,
    color: dashboardColors.blue,
    lightColor: dashboardColors.blueLight,
    statusColor: dashboardColors.blue,
  },
  pendientes: {
    icon: <IconAlertTriangle size={20} aria-hidden="true" />,
    color: dashboardColors.orange,
    lightColor: dashboardColors.orangeLight,
    statusColor: dashboardColors.orange,
  },
};

export default function QuickSummary() {
  return (
    <Card className={classes.card} padding="xl" radius="lg">
      <Text className={classes.title}>Resumen rápido</Text>

      <Stack gap={0} mt="lg">
        {quickSummary.map((item, index) => {
          const config = ITEM_CONFIG[item.id];
          return (
            <div key={item.id}>
              {index > 0 && <Divider my="sm" color="#F0F1F5" />}
              <Group gap="sm" wrap="nowrap" align="flex-start">
                <span
                  className={classes.iconBox}
                  style={{ background: config.lightColor, color: config.color }}
                >
                  {config.icon}
                </span>
                <Stack gap={2} style={{ minWidth: 0 }}>
                  <Text className={classes.itemTitle}>{item.title}</Text>
                  <Text className={classes.itemText}>{item.text}</Text>
                  <Text className={classes.itemStatus} style={{ color: config.statusColor }}>
                    {item.status}
                  </Text>
                </Stack>
              </Group>
            </div>
          );
        })}
      </Stack>
    </Card>
  );
}
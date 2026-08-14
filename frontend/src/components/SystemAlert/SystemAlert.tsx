import { ActionIcon, Group, Text } from '@mantine/core';
import { IconInfoCircle, IconX } from '@tabler/icons-react';
import { useState } from 'react';

import { systemAlert } from '../../mocks/adminDashboard';
import { dashboardColors } from '../../theme/theme';
import classes from './SystemAlert.module.css';

export default function SystemAlert() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <Group
      className={classes.alert}
      gap="md"
      align="flex-start"
      wrap="nowrap"
      role="status"
    >
      <span className={classes.iconBox}>
        <IconInfoCircle size={22} color={dashboardColors.blue} aria-hidden="true" />
      </span>
      <div className={classes.textBlock}>
        <Text className={classes.title}>{systemAlert.title}</Text>
        <Text className={classes.description}>{systemAlert.description}</Text>
      </div>
      <ActionIcon
        variant="subtle"
        color="gray"
        radius="xl"
        aria-label="Cerrar alerta"
        onClick={() => setVisible(false)}
        className={classes.close}
      >
        <IconX size={18} aria-hidden="true" />
      </ActionIcon>
    </Group>
  );
}
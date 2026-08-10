import { Group, Paper, Stack, Text } from '@mantine/core';
import { IconShieldCheck } from '@tabler/icons-react';

import classes from './SecurityNotice.module.css';

export default function SecurityNotice() {
  return (
    <Paper className={classes.notice} radius="md">
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <span className={classes.icon} aria-hidden="true">
          <IconShieldCheck size={24} stroke={1.8} />
        </span>
        <Stack gap={2}>
          <Text fw={600}>Información segura</Text>
          <Text size="sm" c="dimmed">
            Tus datos están protegidos. Este sistema es de uso exclusivo para la comunidad de la
            Facultad de Ingeniería.
          </Text>
        </Stack>
      </Group>
    </Paper>
  );
}
import { ActionIcon, Badge, Group, Text } from '@mantine/core';
import { IconMenu2 } from '@tabler/icons-react';

import { useAuth } from '../../contexts/AuthContext';
import classes from './ProfesorHeader.module.css';

interface ProfesorHeaderProps {
  onToggle: () => void;
}

export default function ProfesorHeader({ onToggle }: ProfesorHeaderProps) {
  const { user } = useAuth();

  return (
    <Group
      h="100%"
      wrap="nowrap"
      justify="space-between"
      align="center"
      className={classes.header}
    >
      <ActionIcon
        variant="subtle"
        size="lg"
        radius="md"
        onClick={onToggle}
        aria-label="Alternar menú"
        className={classes.burger}
      >
        <IconMenu2 size={22} aria-hidden="true" />
      </ActionIcon>

      <Group gap={12} wrap="nowrap">
        <Badge variant="light" color="indigo" size="lg">
          Profesor
        </Badge>
        <Text className={classes.userName}>
          {user ? `${user.nombre} ${user.apellido_paterno}` : ''}
        </Text>
      </Group>
    </Group>
  );
}
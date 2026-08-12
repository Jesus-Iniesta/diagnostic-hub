import { Button, Container, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconBuildingCommunity } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

import classes from './Header.module.css';

export default function Header() {
  const navigate = useNavigate();

  return (
    <header className={classes.header}>
      <Container size="lg" className={classes.inner}>
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size={44} radius="md" variant="filled" color="#006B49" aria-hidden="true">
            <Text fw={700} fz="lg">
              FI
            </Text>
          </ThemeIcon>
          <Stack gap={0}>
            <Text fw={700}>Tutoría FI UAEMéx</Text>
            <Text size="xs" c="dimmed">
              Sistema de Análisis y Resultados
            </Text>
          </Stack>
        </Group>

        <Button
          variant="subtle"
          color="gray"
          leftSection={<IconBuildingCommunity size={18} aria-hidden="true" />}
          onClick={() => navigate('/login?modo=institucional')}
        >
          Acceso institucional
        </Button>
      </Container>
    </header>
  );
}
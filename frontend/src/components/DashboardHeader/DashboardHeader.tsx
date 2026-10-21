import {
  ActionIcon,
  Group,
  Menu,
  Stack,
  Text,
  UnstyledButton,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconBell,
  IconCalendar,
  IconChevronDown,
  IconMenu2,
} from '@tabler/icons-react';
import { usePeriodo } from '../../contexts/PeriodoContext';
import classes from './DashboardHeader.module.css';

interface DashboardHeaderProps {
  onToggle: () => void;
}

export default function DashboardHeader({ onToggle }: DashboardHeaderProps) {
  const { periodo: period, setPeriodo: setPeriod, periodos } = usePeriodo();
  const [notificationsOpened, { open: openNotifications, close: closeNotifications }] =
    useDisclosure(false);

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

      <Group gap={24} wrap="nowrap">
        <Menu shadow="md" width={224} position="bottom-end" withinPortal>
          <Menu.Target>
            <UnstyledButton className={classes.period} aria-label="Seleccionar periodo">
              <Group gap={12} wrap="nowrap" w="100%">
                <IconCalendar size={20} className={classes.periodIcon} aria-hidden="true" />
                <Stack gap={2} align="flex-start" className={classes.periodText}>
                  <Text className={classes.periodLabel}>Periodo actual</Text>
                  <Text className={classes.periodValue}>{period}</Text>
                </Stack>
                <IconChevronDown size={16} className={classes.periodChevron} aria-hidden="true" />
              </Group>
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Todas las páginas usan este periodo</Menu.Label>
            {periodos.map((p: string) => (
              <Menu.Item key={p} onClick={() => setPeriod(p)} fw={p === period ? 700 : undefined}>
                {p}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>

        <Menu
          shadow="md"
          width={260}
          position="bottom-end"
          opened={notificationsOpened}
          onOpen={openNotifications}
          onClose={closeNotifications}
        >
          <Menu.Target>
            <Tooltip label="Notificaciones" withArrow>
              <ActionIcon
                variant="subtle"
                size="lg"
                radius="md"
                className={classes.bell}
                aria-label="Notificaciones"
              >
                <IconBell size={24} aria-hidden="true" />
                <span className={classes.dot} aria-hidden="true" />
              </ActionIcon>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Notificaciones</Menu.Label>
            <Menu.Item>Nuevo reporte disponible</Menu.Item>
            <Menu.Item>Carga de archivos completada</Menu.Item>
            <Menu.Item>40 alumnos requieren revisión</Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>
  );
}
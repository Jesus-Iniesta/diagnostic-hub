import {
  ActionIcon,
  Button,
  Group,
  Menu,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useState } from 'react';
import {
  IconBell,
  IconCalendar,
  IconChevronDown,
  IconMenu2,
} from '@tabler/icons-react';
import { usePeriodo } from '../../contexts/PeriodoContext';
import classes from './DashboardHeader.module.css';

/** Para cargar periodos anteriores que no salen en la lista. */
const PERIODO_RE = /^\d{4}[AB]$/;

interface DashboardHeaderProps {
  onToggle: () => void;
}

export default function DashboardHeader({ onToggle }: DashboardHeaderProps) {
  const { periodo: period, setPeriodo: setPeriod, periodos } = usePeriodo();
  const [otro, setOtro] = useState('');
  const [errorOtro, setErrorOtro] = useState<string | null>(null);
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
            <Menu.Divider />
            <Menu.Label>Otro periodo</Menu.Label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const p = otro.trim().toUpperCase();
                if (!PERIODO_RE.test(p)) {
                  setErrorOtro('Escribe año y A o B, p. ej. 2024B');
                  return;
                }
                setPeriod(p);
                setOtro('');
                setErrorOtro(null);
              }}
              style={{ padding: '0 8px 8px' }}
            >
              <Group gap={6} wrap="nowrap" align="flex-start">
                <TextInput
                  size="xs"
                  placeholder="2024B"
                  value={otro}
                  onChange={(e) => {
                    setOtro(e.currentTarget.value);
                    setErrorOtro(null);
                  }}
                  onKeyDown={(e) => e.stopPropagation()}
                  error={errorOtro}
                  maxLength={5}
                  aria-label="Escribir un periodo"
                  style={{ flex: 1 }}
                />
                <Button size="xs" type="submit" variant="light">
                  Ir
                </Button>
              </Group>
            </form>
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
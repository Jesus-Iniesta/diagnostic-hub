import {
  Avatar,
  Button,
  Divider,
  Group,
  NavLink,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  IconCapStraight,
  IconChevronRight,
  IconHome,
  IconLogout,
  IconReport,
  IconUsersGroup,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import classes from './ProfesorSidebar.module.css';

const NAV_ITEMS = [
  { id: 'inicio', label: 'Inicio', icon: IconHome, to: '/profesor' },
  { id: 'grupo', label: 'Mi grupo', icon: IconUsersGroup, to: '/profesor/grupo' },
  { id: 'resultados', label: 'Resultados', icon: IconReport, to: '/profesor/resultados' },
] as const;

export type ProfesorSidebarItemId = (typeof NAV_ITEMS)[number]['id'];

interface ProfesorSidebarProps {
  active: ProfesorSidebarItemId;
  collapsed?: boolean;
  onNavigate?: () => void;
}

function iniciales(nombre: string, apellidoPaterno: string): string {
  return `${nombre.charAt(0)}${apellidoPaterno.charAt(0)}`.toUpperCase();
}

export default function ProfesorSidebar({
  active,
  collapsed = false,
  onNavigate,
}: ProfesorSidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const nombre = user?.nombre ?? 'Profesor';
  const apellidoPaterno = user?.apellido_paterno ?? '';
  const correo = user?.correo_personal ?? '';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <Stack
      className={collapsed ? `${classes.root} ${classes.collapsed}` : classes.root}
      gap={0}
      justify="space-between"
    >
      <div>
        <Group className={classes.brand} gap="sm" wrap="nowrap">
          <div className={classes.brandIcon}>
            <IconCapStraight
              size={22}
              color="#1C1954"
              stroke={2}
              aria-hidden="true"
            />
          </div>
          <div className={classes.brandText}>
            <Text className={classes.brandTitle}>TutoNet</Text>
            <Text className={classes.brandSubtitle}>Profesor</Text>
          </div>
        </Group>

        <nav className={classes.menu}>
          {NAV_ITEMS.map(({ id, label, icon: Icon, to }) => (
            <Tooltip
              key={id}
              label={label}
              position="right"
              disabled={!collapsed}
              withArrow
            >
              <NavLink
                className={classes.link}
                active={active === id}
                label={
                  <span
                    className={classes.linkLabel}
                    onClick={() => {
                      navigate(to);
                      onNavigate?.();
                    }}
                  >
                    {label}
                  </span>
                }
                leftSection={<Icon size={20} className={classes.linkIcon} aria-hidden="true" />}
                onClick={() => {
                  navigate(to);
                  onNavigate?.();
                }}
                variant="filled"
              />
            </Tooltip>
          ))}
        </nav>
      </div>

      <div className={classes.footer}>
        <Divider className={classes.divider} variant="dashed" />
        <Group className={classes.userCard} gap="sm" wrap="nowrap">
          <Avatar
            src={null}
            alt="Perfil del profesor"
            color="#4F46E5"
            radius="xl"
          >
            {iniciales(nombre, apellidoPaterno)}
          </Avatar>
          <div className={classes.userText}>
            <Text className={classes.userName}>
              {nombre} {apellidoPaterno}
            </Text>
            <Text className={classes.userEmail}>{correo}</Text>
          </div>
          <IconChevronRight size={18} className={classes.userChevron} aria-hidden="true" />
        </Group>
        <Tooltip label="Cerrar sesión" position="right" disabled={!collapsed}>
          <Button
            className={classes.logout}
            variant="subtle"
            color="gray"
            fullWidth
            justify={collapsed ? 'center' : 'flex-start'}
            leftSection={<IconLogout size={18} aria-hidden="true" />}
            onClick={handleLogout}
          >
            {!collapsed && 'Cerrar sesión'}
          </Button>
        </Tooltip>
      </div>
    </Stack>
  );
}
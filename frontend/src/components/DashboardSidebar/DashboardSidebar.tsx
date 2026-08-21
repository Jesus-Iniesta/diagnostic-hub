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
  IconSettings,
  IconShield,
  IconUpload,
  IconUserSearch,
  IconUsers,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import classes from './DashboardSidebar.module.css';

const NAV_ITEMS = [
  { id: 'inicio', label: 'Inicio', icon: IconHome, to: '/admin' },
  { id: 'carga', label: 'Carga y procesamiento', icon: IconUpload },
  { id: 'resultados', label: 'Resultados', icon: IconUserSearch },
  { id: 'configuracion', label: 'Configuración', icon: IconSettings, to: '/admin/configuracion' },
  { id: 'reportes', label: 'Reportes', icon: IconReport },
  { id: 'usuarios', label: 'Usuarios', icon: IconUsers },
  { id: 'seguridad', label: 'Seguridad', icon: IconShield },
] as const;

export type SidebarItemId = (typeof NAV_ITEMS)[number]['id'];

interface SidebarNavItem {
  id: SidebarItemId;
  label: string;
  icon: typeof IconHome;
  to?: string;
}

function initialActiveFromPath(pathname: string): SidebarItemId {
  if (pathname.startsWith('/admin/configuracion')) return 'configuracion';
  return 'inicio';
}

interface DashboardSidebarProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

export default function DashboardSidebar({
  collapsed = false,
  onNavigate,
}: DashboardSidebarProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [active, setActive] = useState<SidebarItemId>(() =>
    initialActiveFromPath(location.pathname),
  );

  useEffect(() => {
    setActive(initialActiveFromPath(location.pathname));
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const handleNavigate = (item: SidebarNavItem) => {
    setActive(item.id);
    onNavigate?.();
    if (item.to) {
      navigate(item.to);
    }
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
            <Text className={classes.brandSubtitle}>Administrador</Text>
          </div>
        </Group>

        <nav className={classes.menu}>
          {NAV_ITEMS.map((item) => {
            const { id, label, icon: Icon } = item;
            return (
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
                      onClick={() => handleNavigate(item)}
                    >
                      {label}
                    </span>
                  }
                  leftSection={<Icon size={20} className={classes.linkIcon} aria-hidden="true" />}
                  onClick={() => handleNavigate(item)}
                  variant="filled"
                />
              </Tooltip>
            );
          })}
        </nav>
      </div>

      <div className={classes.footer}>
        <Divider className={classes.divider} variant="dashed" />
        <Group className={classes.userCard} gap="sm" wrap="nowrap">
          <Avatar src={null} alt="Administrador" color="#4F46E5" radius="xl">
            A
          </Avatar>
          <div className={classes.userText}>
            <Text className={classes.userName}>Administrador</Text>
            <Text className={classes.userEmail}>admin@tutonet.mx</Text>
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
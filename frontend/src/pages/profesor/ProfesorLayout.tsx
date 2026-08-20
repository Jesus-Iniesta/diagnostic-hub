import { AppShell, Box } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import ProfesorHeader from '../../components/ProfesorHeader/ProfesorHeader';
import ProfesorSidebar, {
  type ProfesorSidebarItemId,
} from '../../components/ProfesorSidebar/ProfesorSidebar';
import classes from './ProfesorLayout.module.css';

function sidebarItemFromPath(pathname: string): ProfesorSidebarItemId {
  if (pathname.startsWith('/profesor/grupo')) return 'grupo';
  if (pathname.startsWith('/profesor/resultados')) return 'resultados';
  return 'inicio';
}

export default function ProfesorLayout() {
  const { pathname } = useLocation();
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] =
    useDisclosure(false);
  const isMobile = useMediaQuery('(max-width: 62em)');

  const active = sidebarItemFromPath(pathname);

  const handleToggle = () => {
    if (isMobile) {
      toggleMobile();
    } else {
      setDesktopCollapsed((v) => !v);
    }
  };

  return (
    <AppShell
      layout="alt"
      header={{ height: 64 }}
      navbar={{
        width: desktopCollapsed ? 88 : 300,
        breakpoint: 'md',
        collapsed: { mobile: !mobileOpened },
      }}
      padding={0}
    >
      <AppShell.Navbar className={classes.navbar}>
        <ProfesorSidebar
          active={active}
          collapsed={desktopCollapsed}
          onNavigate={closeMobile}
        />
      </AppShell.Navbar>

      <AppShell.Header className={classes.header}>
        <ProfesorHeader onToggle={handleToggle} />
      </AppShell.Header>

      <AppShell.Main className={classes.mainArea}>
        <Box className={classes.main}>
          <Outlet />
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
import { AppShell, Box } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import AcreditadorHeader from '../../components/AcreditadorHeader/AcreditadorHeader';
import AcreditadorSidebar, {
  type AcreditadorSidebarItemId,
} from '../../components/AcreditadorSidebar/AcreditadorSidebar';
import classes from './AcreditadorLayout.module.css';

function sidebarItemFromPath(pathname: string): AcreditadorSidebarItemId {
  if (pathname.startsWith('/acreditador/resultados')) return 'inicio';
  return 'inicio';
}

export default function AcreditadorLayout() {
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
        <AcreditadorSidebar
          active={active}
          collapsed={desktopCollapsed}
          onNavigate={closeMobile}
        />
      </AppShell.Navbar>

      <AppShell.Header className={classes.header}>
        <AcreditadorHeader onToggle={handleToggle} />
      </AppShell.Header>

      <AppShell.Main className={classes.mainArea}>
        <Box className={classes.main}>
          <Outlet />
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
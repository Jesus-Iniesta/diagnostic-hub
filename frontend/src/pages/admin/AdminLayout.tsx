import { AppShell, Box } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import DashboardHeader from '../../components/DashboardHeader/DashboardHeader';
import DashboardSidebar from '../../components/DashboardSidebar/DashboardSidebar';
import classes from './AdminLayout.module.css';

export default function AdminLayout() {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] =
    useDisclosure(false);
  const isMobile = useMediaQuery('(max-width: 62em)');

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
      header={{ height: 88 }}
      navbar={{
        width: desktopCollapsed ? 88 : 326,
        breakpoint: 'md',
        collapsed: { mobile: !mobileOpened },
      }}
      padding={0}
    >
      <AppShell.Navbar className={classes.navbar}>
        <DashboardSidebar
          collapsed={desktopCollapsed}
          onNavigate={closeMobile}
        />
      </AppShell.Navbar>

      <AppShell.Header className={classes.header}>
        <DashboardHeader onToggle={handleToggle} />
      </AppShell.Header>

      <AppShell.Main className={classes.mainArea}>
        <Box className={classes.main}>
          <Outlet />
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
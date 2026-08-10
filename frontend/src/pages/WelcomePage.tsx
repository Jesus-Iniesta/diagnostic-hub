import { Container, Group, Stack, Text, Title } from '@mantine/core';
import { IconLock, IconPresentation, IconSchool, IconUser } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

import Footer from '../components/Footer/Footer';
import Header from '../components/Header/Header';
import RoleCard from '../components/RoleCard/RoleCard';
import SecurityNotice from '../components/SecurityNotice/SecurityNotice';
import classes from './WelcomePage.module.css';

export default function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className={classes.page}>
      <Header />

      <main className={classes.main}>
        <Container size="lg" py="xl">
          <Stack align="center" gap="xl" className={classes.content}>
            <Stack align="center" gap={8}>
              <Title order={1} className={classes.title}>
                Bienvenido
              </Title>
              <Text size="xl" className={classes.subtitle} ta="center">
                Consulta tus resultados de evaluación de forma rápida y segura
              </Text>
            </Stack>

            <Group align="stretch" justify="center" wrap="wrap" gap="xl">
              <RoleCard
                title="SOY ALUMNO"
                description="Consulta tus resultados de evaluaciones"
                buttonText="Ingresar"
                color="#006B49"
                lightColor="#E8F5EF"
                iconColor="#007A4D"
                buttonHover="#00563B"
                icon={<IconSchool size={34} stroke={1.8} aria-hidden="true" />}
                footerText="Ingresa con tu número de cuenta"
                footerIcon={<IconUser size={16} aria-hidden="true" />}
                onClick={() => navigate('/login?modo=alumno')}
              />
              <RoleCard
                title="SOY PROFESOR"
                description="Consulta los resultados de tu grupo"
                buttonText="Ingresar"
                color="#0066A8"
                lightColor="#EAF4FB"
                iconColor="#0066A8"
                buttonHover="#00548A"
                icon={<IconPresentation size={34} stroke={1.8} aria-hidden="true" />}
                footerText="Ingresa con tu correo institucional y contraseña"
                footerIcon={<IconLock size={16} aria-hidden="true" />}
                onClick={() => navigate('/login?modo=profesor')}
              />
            </Group>

            <SecurityNotice />
          </Stack>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
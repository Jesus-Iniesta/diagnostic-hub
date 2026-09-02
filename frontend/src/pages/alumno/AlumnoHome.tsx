import { Grid, Text } from '@mantine/core';

import DatosContactoForm from '../../components/DatosContactoForm/DatosContactoForm';
import ResumenAlumno from '../../components/ResumenAlumno/ResumenAlumno';
import { useAuth } from '../../contexts/AuthContext';
import classes from './AlumnoHome.module.css';

export default function AlumnoHome() {
  const { user } = useAuth();

  const nombre = user?.nombre ?? '';

  return (
    <>
      <div className={classes.welcome}>
        <Text component="h1" className={classes.welcomeTitle}>
          ¡Hola, {nombre}! 👋
        </Text>
        <Text className={classes.welcomeSubtitle}>
          Antes de consultar tus resultados, completa tus datos de contacto.
        </Text>
      </div>

      <Grid gutter="lg" mt="lg" align="stretch">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <DatosContactoForm />
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <ResumenAlumno />
        </Grid.Col>
      </Grid>
    </>
  );
}
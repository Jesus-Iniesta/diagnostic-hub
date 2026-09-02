import { Grid, Text } from '@mantine/core';

import DatosContactoForm from '../../components/DatosContactoForm/DatosContactoForm';
import ResumenAlumno from '../../components/ResumenAlumno/ResumenAlumno';
import classes from './AlumnoContacto.module.css';

export default function AlumnoContacto() {
  return (
    <>
      <div className={classes.welcome}>
        <Text component="h1" className={classes.welcomeTitle}>
          Mis datos de contacto
        </Text>
        <Text className={classes.welcomeSubtitle}>
          Mantén actualizada tu información para relacionar correctamente tus
          evaluaciones.
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
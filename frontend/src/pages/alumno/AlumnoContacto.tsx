import { Button, Grid, Text } from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';

import DatosContactoForm from '../../components/DatosContactoForm/DatosContactoForm';
import ResumenAlumno from '../../components/ResumenAlumno/ResumenAlumno';
import { descargarCorreoPdf } from '../../lib/alumnoApi';
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
        <Button
          mt="sm"
          variant="light"
          leftSection={<IconDownload size={16} />}
          onClick={() => descargarCorreoPdf()}
        >
          Descargar PDF de correo
        </Button>
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
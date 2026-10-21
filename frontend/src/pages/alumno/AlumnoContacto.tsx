import { Stack, Text } from '@mantine/core';
import { useState } from 'react';

import CorreosRegistrados from '../../components/CorreosRegistrados/CorreosRegistrados';
import DatosContactoForm from '../../components/DatosContactoForm/DatosContactoForm';
import ResumenAlumno from '../../components/ResumenAlumno/ResumenAlumno';
import classes from './AlumnoContacto.module.css';

export default function AlumnoContacto() {
  // Al guardar el formulario se vuelven a cargar los correos y el panel.
  const [version, setVersion] = useState(0);

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

      <CorreosRegistrados key={`correos-${version}`} />

      <Stack gap="lg" mt="lg">
        <DatosContactoForm onSaved={() => setVersion((v) => v + 1)} />
        <ResumenAlumno key={`resumen-${version}`} />
      </Stack>
    </>
  );
}

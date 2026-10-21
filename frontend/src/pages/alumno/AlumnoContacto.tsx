import { Alert, Button, Grid, Text } from '@mantine/core';
import { IconArrowRight, IconInfoCircle } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import CorreosRegistrados from '../../components/CorreosRegistrados/CorreosRegistrados';
import DatosContactoForm from '../../components/DatosContactoForm/DatosContactoForm';
import ResumenAlumno from '../../components/ResumenAlumno/ResumenAlumno';
import { fetchMiPerfil } from '../../lib/alumnoApi';
import classes from './AlumnoContacto.module.css';

export default function AlumnoContacto() {
  const navigate = useNavigate();
  // Mientras no complete su registro, el formulario solo se muestra en Inicio.
  const [pendienteRegistro, setPendienteRegistro] = useState(false);

  useEffect(() => {
    let mounted = true;
    void fetchMiPerfil()
      .then((perfil) => {
        if (mounted) setPendienteRegistro(Boolean(perfil.es_provisional));
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

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

      <CorreosRegistrados />

      {pendienteRegistro ? (
        <Alert
          color="orange"
          variant="light"
          radius="md"
          mt="lg"
          maw={720}
          icon={<IconInfoCircle size={18} />}
          title="Te falta completar tus datos"
        >
          <Text size="sm">Completa tus datos obligatorios en Inicio.</Text>
          <Button
            mt="md"
            color="orange"
            rightSection={<IconArrowRight size={16} aria-hidden="true" />}
            onClick={() => navigate('/alumno')}
          >
            Completar mis datos
          </Button>
        </Alert>
      ) : (
        <Grid gutter="lg" mt="lg" align="stretch">
          <Grid.Col span={{ base: 12, lg: 8 }}>
            <DatosContactoForm />
          </Grid.Col>
          <Grid.Col span={{ base: 12, lg: 4 }}>
            <ResumenAlumno />
          </Grid.Col>
        </Grid>
      )}
    </>
  );
}

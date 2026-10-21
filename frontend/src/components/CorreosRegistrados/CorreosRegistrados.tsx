import { Alert, Button, Card, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import { descargarCorreosPdf, fetchMiPerfil } from '../../lib/alumnoApi';
import type { AlumnoPerfil } from '../../types/alumno';
import classes from './CorreosRegistrados.module.css';

export default function CorreosRegistrados() {
  const [perfil, setPerfil] = useState<AlumnoPerfil | null>(null);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void fetchMiPerfil()
      .then((data) => {
        if (mounted) setPerfil(data);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const handleDescargar = async () => {
    setDescargando(true);
    setError(null);
    try {
      await descargarCorreosPdf();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron descargar tus correos');
    } finally {
      setDescargando(false);
    }
  };

  const correos = [
    { label: 'Correo personal', valor: perfil?.usuario.correo_personal },
    { label: 'Correo institucional', valor: perfil?.usuario.correo_institucional },
  ];

  return (
    <Card className={classes.card} padding="lg" radius="lg" mt="lg">
      <Stack gap="md">
        <Text className={classes.aviso}>
          Guarda tus correos registrados y úsalos siempre que contestes un examen.
        </Text>
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg" className={classes.correos}>
            {correos.map((c) => (
              <div key={c.label}>
                <Text className={classes.label}>{c.label}</Text>
                {c.valor ? (
                  <Text className={classes.valor}>{c.valor}</Text>
                ) : (
                  <Text className={classes.pendiente}>Pendiente</Text>
                )}
              </div>
            ))}
          </SimpleGrid>
          <Button
            variant="light"
            color="indigo"
            leftSection={<IconDownload size={16} aria-hidden="true" />}
            onClick={handleDescargar}
            loading={descargando}
          >
            Descargar mis correos registrados
          </Button>
        </Group>
        {error && (
          <Alert color="red" variant="light" radius="md">{error}</Alert>
        )}
      </Stack>
    </Card>
  );
}

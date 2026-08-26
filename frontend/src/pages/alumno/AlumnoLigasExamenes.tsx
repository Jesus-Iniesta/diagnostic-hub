import { Alert, Card, Group, Stack, Text, Title } from '@mantine/core';
import { IconExternalLink, IconInfoCircle, IconLink } from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';

import { fetchLigasVisibles } from '../../lib/ligaApi';
import type { LigaExamenDiagnostico } from '../../types/liga';
import classes from './AlumnoLigasExamenes.module.css';

export default function AlumnoLigasExamenes() {
  const [items, setItems] = useState<LigaExamenDiagnostico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchLigasVisibles();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar ligas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <div className={classes.welcome}>
        <Text component="h1" className={classes.welcomeTitle}>
          Exámenes diagnóstico
        </Text>
        <Text className={classes.welcomeSubtitle}>
          Accede a los enlaces de los exámenes diagnóstico de tu nivel.
        </Text>
      </div>

      <Card className={classes.card} padding="xl" radius="lg" mt="lg">
        <Stack gap="lg">
          <div>
            <Title order={3} className={classes.title}>
              Enlaces disponibles
            </Title>
            <Text className={classes.subtitle}>
              Haz clic en un examen para abrirlo.
            </Text>
          </div>

          {error && (
            <Alert
              color="red"
              variant="light"
              radius="md"
              icon={<IconInfoCircle size={18} />}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {loading ? (
            <Text c="dimmed" ta="center" py="xl">
              Cargando exámenes...
            </Text>
          ) : items.length === 0 ? (
            <div className={classes.emptyState}>
              <IconLink size={40} color="#667085" stroke={1.5} />
              <Text mt="sm">No hay exámenes disponibles en este momento.</Text>
            </div>
          ) : (
            <div className={classes.grid}>
              {items.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none' }}
                >
                  <div className={classes.ligaCard}>
                    <Group justify="space-between" align="flex-start">
                      <Title order={4} className={classes.ligaName}>
                        {item.nombre}
                      </Title>
                      <IconExternalLink size={18} color="#667085" />
                    </Group>
                    {item.descripcion && (
                      <Text className={classes.ligaDescription}>
                        {item.descripcion}
                      </Text>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}
        </Stack>
      </Card>
    </>
  );
}

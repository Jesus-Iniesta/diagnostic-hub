import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconArrowRight,
  IconCircleCheck,
  IconDownload,
  IconExternalLink,
  IconInfoCircle,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import {
  descargarResultadoPdf,
  fetchMiIndiceFi,
  fetchMiPerfil,
  fetchMisExamenes,
} from '../../lib/alumnoApi';
import { fetchLigasVisibles } from '../../lib/ligaApi';
import type { IndiceFiAlumno, MisExamenes } from '../../types/alumno';
import type { LigaExamenDiagnostico } from '../../types/liga';
import classes from './AlumnoHome.module.css';

function Estado({ hecho }: { hecho: boolean }) {
  return hecho ? (
    <Text className={classes.hecho}>
      <IconCircleCheck size={16} aria-hidden="true" /> Listo
    </Text>
  ) : (
    <Text className={classes.pendiente}>Pendiente</Text>
  );
}

export default function AlumnoHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const nombre = user?.nombre ?? '';

  const [cargando, setCargando] = useState(true);
  // Un alumno creado desde los exámenes completa sus datos antes de ver resultados.
  const [pendienteRegistro, setPendienteRegistro] = useState(false);
  const [indice, setIndice] = useState<IndiceFiAlumno | null>(null);
  const [examenes, setExamenes] = useState<MisExamenes | null>(null);
  const [ligas, setLigas] = useState<LigaExamenDiagnostico[]>([]);
  const [descargando, setDescargando] = useState(false);
  const [errorCarta, setErrorCarta] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const perfil = await fetchMiPerfil().catch(() => null);
      const pendiente = Boolean(perfil?.es_provisional);
      const [ind, exa, lig] = await Promise.all([
        pendiente ? Promise.resolve(null) : fetchMiIndiceFi().catch(() => null),
        fetchMisExamenes().catch(() => null),
        fetchLigasVisibles().catch(() => []),
      ]);
      if (!mounted) return;
      setPendienteRegistro(pendiente);
      setIndice(ind);
      setExamenes(exa);
      setLigas(lig);
      setCargando(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleDescargarCarta = async () => {
    setDescargando(true);
    setErrorCarta(null);
    try {
      await descargarResultadoPdf();
    } catch (err) {
      setErrorCarta(err instanceof Error ? err.message : 'No se pudo descargar la carta');
    } finally {
      setDescargando(false);
    }
  };

  const filasExamenes = examenes
    ? [
        { label: 'Cuestionario 1', hecho: examenes.cuestionario_1 },
        { label: 'Cuestionario 2', hecho: examenes.cuestionario_2 },
        ...examenes.examen_final.map((m) => ({
          label: `Examen final · ${m.nombre}`,
          hecho: m.hecho,
        })),
        { label: 'WebAssign', hecho: examenes.webassign },
      ]
    : [];

  return (
    <>
      <div className={classes.welcome}>
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
          <div>
            <Text component="h1" className={classes.welcomeTitle}>
              ¡Hola, {nombre}! 👋
            </Text>
            <Text className={classes.welcomeSubtitle}>
              Este es el resumen de tus exámenes y tu Índice FI UAEMex.
            </Text>
          </div>
          {!cargando && !pendienteRegistro && (
            <Button
              variant="light"
              leftSection={<IconDownload size={18} aria-hidden="true" />}
              onClick={handleDescargarCarta}
              loading={descargando}
            >
              Descargar carta de recomendación
            </Button>
          )}
        </Group>
      </div>

      {errorCarta && (
        <Alert color="red" variant="light" radius="md" mt="md" maw={720}>
          {errorCarta}
        </Alert>
      )}

      {!cargando && pendienteRegistro && (
        <Alert
          color="orange"
          variant="light"
          radius="md"
          mt="lg"
          icon={<IconInfoCircle size={18} aria-hidden="true" />}
          title="Completa tus datos para ver tus resultados"
        >
          <Button
            mt="xs"
            color="orange"
            rightSection={<IconArrowRight size={16} aria-hidden="true" />}
            onClick={() => navigate('/alumno/contacto')}
          >
            Completar mis datos
          </Button>
        </Alert>
      )}

      {cargando ? (
        <Card className={classes.card} padding="xl" radius="lg" mt="lg">
          <Stack align="center" py="xl">
            <Loader size="sm" />
          </Stack>
        </Card>
      ) : (
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg" mt="lg">
          <Card className={classes.card} padding="lg" radius="lg">
            <Title order={4} className={classes.cardTitle}>
              Índice FI UAEMex
            </Title>
            {pendienteRegistro ? (
              <Text className={classes.cardText} mt="sm">
                Disponible cuando completes tus datos.
              </Text>
            ) : indice?.tiene_resultados ? (
              <Stack gap="xs" mt="sm">
                <Text className={classes.indice}>
                  {indice.indice.toFixed(1)}
                  <Text component="span" className={classes.indiceMax}>
                    {' '}/ {Number(indice.maximo.toFixed(2))}
                  </Text>
                </Text>
                {indice.categoria && (
                  <Badge size="lg" variant="light" color="indigo" tt="none" radius="md">
                    {indice.categoria}
                  </Badge>
                )}
                <Text size="xs" c="dimmed">Periodo {indice.periodo}</Text>
              </Stack>
            ) : (
              <Text className={classes.cardText} mt="sm">
                Aún no tienes resultados registrados.
              </Text>
            )}
            <Button
              mt="md"
              color="indigo"
              rightSection={<IconArrowRight size={16} aria-hidden="true" />}
              onClick={() => navigate('/alumno/resultados')}
              disabled={pendienteRegistro}
            >
              Ver mis resultados
            </Button>
          </Card>

          <Card className={classes.card} padding="lg" radius="lg">
            <Title order={4} className={classes.cardTitle}>
              Mis exámenes
            </Title>
            {examenes?.periodo && (
              <Text size="xs" c="dimmed">Periodo {examenes.periodo}</Text>
            )}
            {filasExamenes.length > 0 ? (
              <Stack gap={0} mt="sm">
                {filasExamenes.map((f) => (
                  <Group key={f.label} justify="space-between" wrap="nowrap" className={classes.fila}>
                    <Text size="sm" c="dark">{f.label}</Text>
                    <Estado hecho={f.hecho} />
                  </Group>
                ))}
              </Stack>
            ) : (
              <Text className={classes.cardText} mt="sm">
                No se pudo consultar tus exámenes.
              </Text>
            )}
          </Card>

          <Card className={classes.card} padding="lg" radius="lg">
            <Title order={4} className={classes.cardTitle}>
              Exámenes disponibles
            </Title>
            {ligas.length > 0 ? (
              <Stack gap="xs" mt="sm">
                {ligas.map((liga) => (
                  <a
                    key={liga.id}
                    href={liga.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={classes.liga}
                  >
                    <div style={{ minWidth: 0 }}>
                      <Text fw={600} size="sm" c="dark">{liga.nombre}</Text>
                      {liga.descripcion && (
                        <Text size="xs" c="dimmed" lineClamp={2}>{liga.descripcion}</Text>
                      )}
                    </div>
                    <IconExternalLink size={16} aria-hidden="true" />
                  </a>
                ))}
              </Stack>
            ) : (
              <Text className={classes.cardText} mt="sm">
                No hay exámenes disponibles.
              </Text>
            )}
          </Card>
        </SimpleGrid>
      )}
    </>
  );
}

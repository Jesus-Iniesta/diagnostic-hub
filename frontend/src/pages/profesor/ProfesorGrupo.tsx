import {
  Alert,
  Button,
  Card,
  Group,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCheck,
  IconFile,
  IconUpload,
} from '@tabler/icons-react';
import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { validarArchivoGrupo } from '../../lib/profesorApi';
import type { ValidacionArchivo } from '../../types/profesor';
import classes from './ProfesorGrupo.module.css';

type Etapa = 'sin_archivo' | 'seleccionado' | 'validando' | 'correcto' | 'error';

export default function ProfesorGrupo() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [etapa, setEtapa] = useState<Etapa>('sin_archivo');
  const [dragging, setDragging] = useState(false);
  const [resultado, setResultado] = useState<Extract<ValidacionArchivo, { estado: 'correcto' }> | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const seleccionarArchivo = (file: File | undefined) => {
    if (!file) return;
    setArchivo(file);
    setEtapa('seleccionado');
    setResultado(null);
    setErrorMsg(null);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    seleccionarArchivo(event.dataTransfer.files?.[0]);
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    seleccionarArchivo(event.target.files?.[0]);
  };

  const handleValidar = async () => {
    if (!archivo) return;
    setEtapa('validando');
    setResultado(null);
    setErrorMsg(null);
    try {
      const resultadoValidacion = await validarArchivoGrupo(archivo);
      if (resultadoValidacion.estado === 'correcto') {
        setResultado(resultadoValidacion);
        setEtapa('correcto');
      } else {
        setErrorMsg(resultadoValidacion.mensaje);
        setEtapa('error');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Ocurrió un error al validar el archivo');
      setEtapa('error');
    }
  };

  return (
    <>
      <div className={classes.welcome}>
        <Text component="h1" className={classes.welcomeTitle}>
          Mi grupo
        </Text>
        <Text className={classes.welcomeSubtitle}>
          Carga la lista de alumnos de tu grupo.
        </Text>
      </div>

      <Card className={classes.card} padding="xl" radius="lg" mt="lg">
        <Stack gap="lg">
          <div>
            <Title order={3} className={classes.title}>
              Cargar lista de grupo
            </Title>
            <Text className={classes.subtitle}>
              Sube el archivo de alumnos proporcionado por Control Escolar.
            </Text>
          </div>

          <div
            className={
              dragging
                ? `${classes.dropzone} ${classes.dropzoneActive}`
                : classes.dropzone
            }
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className={classes.hiddenInput}
              onChange={handleFileInput}
            />
            <span className={classes.dropIcon}>
              <IconUpload size={28} aria-hidden="true" />
            </span>
            <Text className={classes.dropText}>
              Arrastra tu archivo aquí o selecciónalo.
            </Text>
            <Text className={classes.dropHint}>Formatos soportados: .xlsx, .xls, .csv</Text>
          </div>

          {archivo && etapa !== 'validando' && etapa !== 'error' && (
            <Group gap="sm" className={classes.fileRow}>
              <span className={classes.fileIcon}>
                <IconFile size={20} aria-hidden="true" />
              </span>
              <Stack gap={0} style={{ minWidth: 0 }}>
                <Text className={classes.fileName} truncate>
                  {archivo.name}
                </Text>
                <Text className={classes.fileMeta}>Archivo seleccionado</Text>
              </Stack>
            </Group>
          )}

          {etapa === 'correcto' && resultado && (
            <Alert
              color="green"
              variant="light"
              radius="md"
              icon={<IconCheck size={18} aria-hidden="true" />}
            >
              El archivo es válido.
              <Group gap="xl" mt="sm">
                <Stack gap={0}>
                  <Text className={classes.resultValue}>{resultado.encontrados}</Text>
                  <Text className={classes.resultLabel}>Alumnos encontrados</Text>
                </Stack>
                <Stack gap={0}>
                  <Text className={classes.resultValue}>{resultado.noEncontrados}</Text>
                  <Text className={classes.resultLabel}>Alumnos no encontrados</Text>
                </Stack>
              </Group>
            </Alert>
          )}

          {etapa === 'error' && (
            <Alert
              color="red"
              variant="light"
              radius="md"
              icon={<IconAlertTriangle size={18} aria-hidden="true" />}
            >
              {errorMsg}
            </Alert>
          )}

          <Group>
            <Button
              size="md"
              color="indigo"
              className={classes.actionButton}
              onClick={handleValidar}
              disabled={!archivo || etapa === 'validando'}
              loading={etapa === 'validando'}
            >
              Validar archivo
            </Button>
            {etapa === 'correcto' && (
              <Button
                size="md"
                variant="light"
                color="indigo"
                className={classes.actionButton}
                rightSection={<IconArrowRight size={18} aria-hidden="true" />}
                onClick={() => navigate('/profesor/resultados')}
              >
                Ver resultados
              </Button>
            )}
          </Group>
        </Stack>
      </Card>
    </>
  );
}
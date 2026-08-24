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
  IconCircleCheck,
  IconInfoCircle,
  IconUpload,
} from '@tabler/icons-react';
import { useCallback, useRef, useState } from 'react';

import { uploadAlumnosExcel } from '../../lib/uploadApi';
import type { FilaResultado, ResultadoCarga } from '../../types/upload';
import classes from './AdminCargaAlumnos.module.css';

type ViewState = 'idle' | 'uploading' | 'result' | 'error';

const BADGE_CONFIG: Record<string, { className: string; label: string }> = {
  exitoso: { className: classes.badgeExitoso, label: 'Exitoso' },
  duplicado: { className: classes.badgeDuplicado, label: 'Duplicado' },
  error: { className: classes.badgeError, label: 'Error' },
};

export default function AdminCargaAlumnos() {
  const [viewState, setViewState] = useState<ViewState>('idle');
  const [resultado, setResultado] = useState<ResultadoCarga | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Solo se permiten archivos .xlsx o .xls');
      setViewState('error');
      return;
    }

    setViewState('uploading');
    setError(null);
    setResultado(null);

    try {
      const result = await uploadAlumnosExcel(file);
      setResultado(result);
      setViewState('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir el archivo');
      setViewState('error');
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragging(false), []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = '';
    },
    [handleFile],
  );

  const handleReset = () => {
    setViewState('idle');
    setResultado(null);
    setError(null);
  };

  return (
    <>
      <div className={classes.welcome}>
        <Text component="h1" className={classes.welcomeTitle}>
          Carga y procesamiento
        </Text>
        <Text className={classes.welcomeSubtitle}>
          Sube un archivo Excel (.xlsx) con los datos de los alumnos nuevos para crear sus cuentas automáticamente.
        </Text>
      </div>

      <Card className={classes.card} padding="xl" radius="lg" mt="lg">
        <Stack gap="lg">
          <div>
            <Title order={3} className={classes.title}>
              Subir archivo de alumnos
            </Title>
            <Text className={classes.subtitle}>
              El archivo debe contener los campos del formulario de registro de nuevo ingreso.
            </Text>
          </div>

          {viewState === 'idle' && (
            <div
              className={`${classes.dropzone} ${dragging ? classes.dropzoneActive : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleInputChange}
                style={{ display: 'none' }}
              />
              <IconUpload size={36} color="#667085" stroke={1.5} />
              <Text className={classes.dropzoneLabel} mt="sm">
                Arrastra un archivo aquí o haz clic para seleccionar
              </Text>
              <Text className={classes.dropzoneHint}>
                Formatos aceptados: .xlsx, .xls
              </Text>
            </div>
          )}

          {viewState === 'uploading' && (
            <Stack align="center" py="xl">
              <Text c="dimmed">Procesando archivo...</Text>
            </Stack>
          )}

          {viewState === 'error' && error && (
            <Alert
              color="red"
              variant="light"
              radius="md"
              icon={<IconInfoCircle size={18} />}
            >
              {error}
              <Group mt="md">
                <Button size="xs" variant="light" onClick={handleReset}>
                  Intentar de nuevo
                </Button>
              </Group>
            </Alert>
          )}

          {viewState === 'result' && resultado && (
            <Stack gap="lg">
              <Alert
                color="green"
                variant="light"
                radius="md"
                icon={<IconCircleCheck size={18} />}
              >
                Archivo procesado correctamente.
              </Alert>

              <div className={classes.statsRow}>
                <div className={`${classes.statBox} ${classes.statBoxGray}`}>
                  <div className={classes.statNumber}>{resultado.total_filas}</div>
                  <div className={classes.statLabel}>Total filas</div>
                </div>
                <div className={`${classes.statBox} ${classes.statBoxGreen}`}>
                  <div className={classes.statNumber}>{resultado.exitosos}</div>
                  <div className={classes.statLabel}>Exitosos</div>
                </div>
                <div className={`${classes.statBox} ${classes.statBoxYellow}`}>
                  <div className={classes.statNumber}>{resultado.duplicados}</div>
                  <div className={classes.statLabel}>Duplicados</div>
                </div>
                <div className={`${classes.statBox} ${classes.statBoxRed}`}>
                  <div className={classes.statNumber}>{resultado.errores}</div>
                  <div className={classes.statLabel}>Errores</div>
                </div>
              </div>

              {resultado.detalle.length > 0 && (
                <div className={classes.scrollTable}>
                  <table className={classes.table}>
                    <thead>
                      <tr>
                        <th>Fila</th>
                        <th>Nombre</th>
                        <th>Nº Cuenta</th>
                        <th>Estado</th>
                        <th>Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.detalle.map((row: FilaResultado) => {
                        const badge = BADGE_CONFIG[row.estado];
                        return (
                          <tr key={`${row.fila}-${row.numero_cuenta ?? row.nombre_completo}`}>
                            <td>{row.fila}</td>
                            <td>{row.nombre_completo}</td>
                            <td>{row.numero_cuenta ?? '—'}</td>
                            <td>
                              <span className={`${classes.badge} ${badge.className}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td>{row.motivo || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <Button
                size="md"
                color="indigo"
                className={classes.submitButton}
                onClick={handleReset}
              >
                Subir otro archivo
              </Button>
            </Stack>
          )}
        </Stack>
      </Card>
    </>
  );
}

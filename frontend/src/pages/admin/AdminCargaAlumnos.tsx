import {
  Alert,
  Button,
  Card,
  Checkbox,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import {
  IconCircleCheck,
  IconInfoCircle,
  IconUpload,
} from '@tabler/icons-react';
import { useCallback, useRef, useState } from 'react';

import { corregirFilas, uploadAlumnosExcel } from '../../lib/uploadApi';
import type { CampoError, FilaCorregida, FilaResultado, ResultadoCarga } from '../../types/upload';
import classes from './AdminCargaAlumnos.module.css';

type ViewState = 'idle' | 'uploading' | 'result' | 'error';

const BADGE_CONFIG: Record<string, { className: string; label: string }> = {
  exitoso: { className: classes.badgeExitoso, label: 'Exitoso' },
  duplicado: { className: classes.badgeDuplicado, label: 'Duplicado' },
  error: { className: classes.badgeError, label: 'Error' },
};

const INGENIERIA_OPTIONS = [
  { value: 'ICO', label: 'ICO - Ingeniería en Computación' },
  { value: 'IEL', label: 'IEL - Ingeniería Electrónica' },
  { value: 'IME', label: 'IME - Ingeniería Mecánica' },
  { value: 'ISES', label: 'ISES - Ingeniería en Sistemas Económicos y de Salud' },
  { value: 'ICI', label: 'ICI - Ingeniería en Ciencias de la Información' },
  { value: 'IIA', label: 'IIA - Ingeniería en Inteligencia Artificial' },
];

const FORM_FIELDS: { key: string; label: string; type?: string; options?: { value: string; label: string }[] }[] = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'apellido_paterno', label: 'Apellido paterno' },
  { key: 'apellido_materno', label: 'Apellido materno' },
  { key: 'correo_personal', label: 'Correo personal', type: 'email' },
  { key: 'correo_institucional', label: 'Correo institucional', type: 'email' },
  { key: 'numero_cuenta', label: 'Nº Cuenta (7 dígitos)' },
  { key: 'numero_folio', label: 'Nº Folio (9 dígitos)' },
  { key: 'ingenieria', label: 'Ingeniería', type: 'select', options: INGENIERIA_OPTIONS },
  { key: 'periodo', label: 'Periodo (ej. 2026B)' },
  { key: 'promedio_bachillerato', label: 'Promedio bachillerato' },
  { key: 'indice_uaem', label: 'Índice UAEM' },
  { key: 'lugar_admision', label: 'Lugar de admisión' },
  { key: 'tiene_internet', label: 'Tiene internet', type: 'select', options: [{ value: 'Sí', label: 'Sí' }, { value: 'No', label: 'No' }] },
  { key: 'tiene_computadora', label: 'Tiene computadora', type: 'select', options: [{ value: 'Sí', label: 'Sí' }, { value: 'No', label: 'No' }] },
  { key: 'es_foraneo', label: 'Es foráneo', type: 'select', options: [{ value: 'Sí', label: 'Sí' }, { value: 'No', label: 'No' }] },
  { key: 'convivencia', label: 'Convivencia' },
  { key: 'vulnerabilidad_economica', label: 'Vulnerabilidad económica', type: 'select', options: [{ value: 'Sí', label: 'Sí' }, { value: 'No', label: 'No' }] },
  { key: 'escuela', label: 'Escuela de procedencia' },
];

function getErrorFields(row: FilaResultado): string[] {
  return row.campos_con_error.map((c: CampoError) => c.campo);
}

export default function AdminCargaAlumnos() {
  const [viewState, setViewState] = useState<ViewState>('idle');
  const [resultado, setResultado] = useState<ResultadoCarga | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [selectedForCorrection, setSelectedForCorrection] = useState<Set<number>>(new Set());
  const [editingRow, setEditingRow] = useState<FilaResultado | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [correctionLoading, setCorrectionLoading] = useState(false);

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
    setExpandedRow(null);
    setSelectedForCorrection(new Set());
  };

  const toggleExpand = (fila: number) => {
    setExpandedRow(expandedRow === fila ? null : fila);
  };

  const toggleSelect = (fila: number) => {
    setSelectedForCorrection((prev) => {
      const next = new Set(prev);
      if (next.has(fila)) {
        next.delete(fila);
      } else {
        next.add(fila);
      }
      return next;
    });
  };

  const selectAllErrors = () => {
    if (!resultado) return;
    const errorFilas = resultado.detalle
      .filter((r) => r.estado === 'error')
      .map((r) => r.fila);
    setSelectedForCorrection(new Set(errorFilas));
  };

  const openEditModal = (row: FilaResultado) => {
    setEditingRow(row);
    setEditForm({ ...row.datos_originales });
  };

  const handleEditChange = (key: string, value: string) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveCorrection = async () => {
    if (!editingRow) return;
    setCorrectionLoading(true);
    try {
      const filas: FilaCorregida[] = [{ fila: editingRow.fila, datos: editForm }];
      const result = await corregirFilas(filas);

      setResultado((prev) => {
        if (!prev) return prev;
        const newDetalle = prev.detalle.filter((d) => d.fila !== editingRow!.fila);
        newDetalle.push(...result.detalle);
        newDetalle.sort((a, b) => a.fila - b.fila);
        return {
          total_filas: prev.total_filas,
          exitosos: prev.exitosos + result.exitosos,
          duplicados: prev.duplicados + result.duplicados,
          errores: prev.errores - (result.exitosos > 0 ? 1 : 0) + result.errores,
          detalle: newDetalle,
        };
      });

      setEditingRow(null);
      setSelectedForCorrection((prev) => {
        const next = new Set(prev);
        next.delete(editingRow!.fila);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al corregir');
    } finally {
      setCorrectionLoading(false);
    }
  };

  const handleCorrectSelected = () => {
    if (!resultado || selectedForCorrection.size === 0) return;
    const firstError = resultado.detalle.find(
      (r) => r.estado === 'error' && selectedForCorrection.has(r.fila)
    );
    if (firstError) openEditModal(firstError);
  };

  const errorRows = resultado?.detalle.filter((r) => r.estado === 'error') ?? [];

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

              {errorRows.length > 0 && (
                <Group gap="sm">
                  <Button
                    size="xs"
                    variant="outline"
                    color="blue"
                    onClick={selectAllErrors}
                  >
                    Seleccionar todos ({errorRows.length})
                  </Button>
                  {selectedForCorrection.size > 0 && (
                    <Button
                      size="xs"
                      variant="filled"
                      color="blue"
                      onClick={handleCorrectSelected}
                    >
                      Corregir seleccionados ({selectedForCorrection.size})
                    </Button>
                  )}
                </Group>
              )}

              {resultado.detalle.length > 0 && (
                <div className={classes.scrollTable}>
                  <table className={classes.table}>
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}></th>
                        <th>Fila</th>
                        <th>Nombre</th>
                        <th>Nº Cuenta</th>
                        <th>Estado</th>
                        <th>Motivo</th>
                        <th style={{ width: 60 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.detalle.map((row: FilaResultado) => {
                        const badge = BADGE_CONFIG[row.estado];
                        const isError = row.estado === 'error';
                        const isSelected = selectedForCorrection.has(row.fila);
                        const isExpanded = expandedRow === row.fila;
                        const errorFields = isError ? getErrorFields(row) : [];

                        return (
                          <tr
                            key={`${row.fila}-${row.numero_cuenta ?? row.nombre_completo}`}
                            className={isError ? classes.clickableRow : undefined}
                          >
                            {isError ? (
                              <td>
                                <Checkbox
                                  size="xs"
                                  checked={isSelected}
                                  onChange={() => toggleSelect(row.fila)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </td>
                            ) : (
                              <td></td>
                            )}
                            <td>{row.fila}</td>
                            <td>{row.nombre_completo}</td>
                            <td>{row.numero_cuenta ?? '—'}</td>
                            <td>
                              <span className={`${classes.badge} ${badge.className}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td>
                              {isError && errorFields.length > 0 ? (
                                <div className={classes.errorFields}>
                                  {errorFields.map((campo) => (
                                    <span key={campo} className={classes.errorFieldBadge}>{campo}</span>
                                  ))}
                                </div>
                              ) : (
                                row.motivo || '—'
                              )}
                            </td>
                            <td>
                              {isError && (
                                <Button
                                  size="compact-xs"
                                  variant="subtle"
                                  color="blue"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpand(row.fila);
                                  }}
                                >
                                  {isExpanded ? '▲' : '▼'}
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {expandedRow && (() => {
                const row = resultado.detalle.find((r) => r.fila === expandedRow);
                if (!row || row.estado !== 'error') return null;
                return (
                  <Card className={classes.expandCard} padding="md" radius="md">
                    <Group justify="space-between" mb="sm">
                      <Text fw={600} size="sm">
                        Detalle de errores — Fila {row.fila}: {row.nombre_completo}
                      </Text>
                      <Button
                        size="xs"
                        variant="filled"
                        color="blue"
                        onClick={() => openEditModal(row)}
                      >
                        Corregir
                      </Button>
                    </Group>
                    <Stack gap={4}>
                      {row.campos_con_error.map((c: CampoError) => (
                        <Text key={c.campo} size="xs" c="red">
                          • <strong>{c.campo}</strong>: {c.motivo}
                        </Text>
                      ))}
                    </Stack>
                  </Card>
                );
              })()}

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

      <Modal
        opened={editingRow !== null}
        onClose={() => setEditingRow(null)}
        title={`Corregir fila ${editingRow?.fila ?? ''} — ${editingRow?.nombre_completo ?? ''}`}
        size="lg"
        centered
      >
        {editingRow && (
          <Stack gap="md">
            {editingRow.campos_con_error.length > 0 && (
              <Alert color="red" variant="light" radius="md" icon={<IconInfoCircle size={18} />}>
                <Text size="sm" fw={600} mb={4}>Campos con error:</Text>
                {editingRow.campos_con_error.map((c: CampoError) => (
                  <Text key={c.campo} size="xs">• <strong>{c.campo}</strong>: {c.motivo}</Text>
                ))}
              </Alert>
            )}

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              {FORM_FIELDS.map((field) => {
                const hasError = editingRow.campos_con_error.some((c: CampoError) => c.campo === field.key);
                if (field.type === 'select' && field.options) {
                  return (
                    <Select
                      key={field.key}
                      label={field.label}
                      data={field.options}
                      value={editForm[field.key] ?? ''}
                      onChange={(v) => handleEditChange(field.key, v ?? '')}
                      error={hasError}
                      size="sm"
                    />
                  );
                }
                return (
                  <TextInput
                    key={field.key}
                    label={field.label}
                    value={editForm[field.key] ?? ''}
                    onChange={(e) => handleEditChange(field.key, e.currentTarget.value)}
                    error={hasError}
                    size="sm"
                  />
                );
              })}
            </SimpleGrid>

            <Group justify="flex-end" gap="sm">
              <Button variant="default" onClick={() => setEditingRow(null)}>
                Cancelar
              </Button>
              <Button
                color="green"
                loading={correctionLoading}
                onClick={handleSaveCorrection}
              >
                Guardar y reintentar
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  );
}

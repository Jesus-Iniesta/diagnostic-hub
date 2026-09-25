import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import {
  IconCircleCheck,
  IconClipboardList,
  IconFileSpreadsheet,
  IconInfoCircle,
  IconUpload,
} from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import CorreccionModal from '../../components/CorreccionModal/CorreccionModal';
import { corregirFilas, uploadAlumnosExcel } from '../../lib/uploadApi';
import {
  uploadDiagnostico,
  corregirMatching,
  exportarResultados,
  getRespuestasCorrectas,
  saveRespuestasCorrectas,
  getRespuestaKeyStatus,
} from '../../lib/diagnosticoApi';
import {
  uploadCuestionario,
  corregirMatchingCuestionario,
} from '../../lib/cuestionarioApi';
import type { CampoError, FilaCorregida, FilaResultado, ResultadoCarga } from '../../types/upload';
import type {
  ResultadoProcesamientoDiagnostico,
  DiagnosticoNoEncontrado,
  RespuestaCorrecta,
} from '../../types/diagnostico';
import type {
  CandidatoCoincidencia,
  CuestionarioNoEncontrado,
  ResultadoProcesamientoCuestionario,
} from '../../types/cuestionario';
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

function getCurrentPeriodo(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return `${year}${month <= 6 ? 'A' : 'B'}`;
}

function DiagnosticoSection() {
  const [periodo, setPeriodo] = useState(getCurrentPeriodo());
  const [step, setStep] = useState(0);
  const [materiasConfig, setMateriasConfig] = useState<Record<string, { configurada: boolean; total_preguntas: number }>>({});
  const [loadingStatus, setLoadingStatus] = useState(true);

  const [uploadingMateria, setUploadingMateria] = useState<string | null>(null);
  const [correccionLoading, setCorreccionLoading] = useState(false);
  const [resultado, setResultado] = useState<ResultadoProcesamientoDiagnostico | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avisoOmitidas, setAvisoOmitidas] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  const [noEncontrados, setNoEncontrados] = useState<DiagnosticoNoEncontrado[]>([]);
  const [correcciones, setCorrecciones] = useState<Map<number, number>>(new Map());

  const [corrigiendoIdx, setCorrigiendoIdx] = useState<number | null>(null);

  const [showRespuestasModal, setShowRespuestasModal] = useState(false);
  const [respuestas, setRespuestas] = useState<RespuestaCorrecta[]>([]);
  const [respuestasLoading, setRespuestasLoading] = useState(false);
  const [editingMateria, setEditingMateria] = useState<string | null>(null);

  const [wizardResults, setWizardResults] = useState<Map<string, ResultadoProcesamientoDiagnostico>>(new Map());

  const MATERIAS_ORDER = ['algebra', 'trigonometria', 'geometria', 'calculo'];
  const MATERIAS_LABELS: Record<string, string> = {
    algebra: 'Álgebra',
    trigonometria: 'Trigonometría',
    geometria: 'Geometría',
    calculo: 'Cálculo Diferencial',
  };

  const currentMateria = step >= 1 && step <= 4 ? MATERIAS_ORDER[step - 1] : null;
  const noEncontradoActual = corrigiendoIdx !== null ? noEncontrados.find((n) => n.indice === corrigiendoIdx) : null;
  const nSugeridos = noEncontrados.filter((n) => n.candidatos.some((c) => c.sugerido)).length;

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const keys = await getRespuestaKeyStatus(periodo);
      setMateriasConfig(keys);
    } catch {
      // silently fail
    } finally {
      setLoadingStatus(false);
    }
  }, [periodo]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const allKeysConfigured = MATERIAS_ORDER.every((m) => materiasConfig[m]?.configurada);
  const allDone = MATERIAS_ORDER.every((m) => wizardResults.has(m));

  const goToStep = (newStep: number) => {
    setStep(newStep);
    setResultado(null);
    setError(null);
    setAvisoOmitidas(null);
    setNoEncontrados([]);
    setCorrecciones(new Map());
    setCurrentFile(null);
    setUploadingMateria(null);
  };

  const handleNext = () => {
    if (step === 0) {
      goToStep(1);
    } else if (step >= 1 && step <= 4) {
      goToStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step >= 1 && step <= 5) {
      goToStep(step - 1);
    }
  };

  const handleFile = useCallback(async (file: File) => {
    if (!currentMateria) return;
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Solo se permiten archivos .xlsx o .xls');
      return;
    }
    setError(null);
    setResultado(null);
    setAvisoOmitidas(null);
    setCurrentFile(file);
    setUploadingMateria(currentMateria);

    try {
      const result = await uploadDiagnostico(currentMateria, periodo, file);
      setResultado(result);
      setNoEncontrados(result.no_encontrados_detalle);
      setWizardResults((prev) => new Map(prev).set(currentMateria, result));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar el archivo');
    } finally {
      setUploadingMateria(null);
    }
  }, [currentMateria, periodo]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragging(false), []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }, [handleFile]);

  const handleExport = async () => {
    try {
      const blob = await exportarResultados(periodo);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diagnostico_${periodo}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al exportar');
    }
  };

  const handleLoadRespuestas = async (materia: string) => {
    setEditingMateria(materia);
    setRespuestasLoading(true);
    try {
      const result = await getRespuestasCorrectas(materia, periodo);
      setRespuestas(result.respuestas || []);
      setShowRespuestasModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar respuestas');
    } finally {
      setRespuestasLoading(false);
    }
  };

  const handleSaveRespuestas = async () => {
    if (!editingMateria) return;
    try {
      await saveRespuestasCorrectas({ materia: editingMateria, periodo, respuestas });
      setShowRespuestasModal(false);
      loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar respuestas');
    }
  };

  const handleCorregirMatching = async () => {
    if (!currentFile || !currentMateria || correcciones.size === 0) return;
    setCorreccionLoading(true);
    setAvisoOmitidas(null);
    const indicesCorregidos = new Set(correcciones.keys());
    try {
      const correccionesArray = Array.from(correcciones.entries()).map(([indice, alumno_id]) => ({ indice, alumno_id }));
      const res = await corregirMatching(currentMateria, periodo, currentFile, correccionesArray);
      const omitidosSet = new Set(res.omitidas_ya_tenian_resultado ?? []);
      if (omitidosSet.size > 0) {
        setAvisoOmitidas(
          `${omitidosSet.size} fila(s) no se aplicaron porque ese alumno ya tenía resultado de un intento anterior.`,
        );
      }

      const nuevosDetalle = noEncontrados.filter(
        (n) => !(indicesCorregidos.has(n.indice) || omitidosSet.has(n.indice)),
      );
      const corregidos = noEncontrados.length - nuevosDetalle.length;
      setNoEncontrados(nuevosDetalle);
      setCorrigiendoIdx(null);
      setResultado((prev) =>
        prev
          ? {
              ...prev,
              encontrados: prev.encontrados + corregidos,
              no_encontrados: Math.max(0, prev.no_encontrados - corregidos),
              no_encontrados_detalle: nuevosDetalle,
            }
          : prev,
      );
      setWizardResults((prev) => {
        const next = new Map(prev);
        const prevRes = next.get(currentMateria);
        if (prevRes) {
          next.set(currentMateria, {
            ...prevRes,
            encontrados: prevRes.encontrados + corregidos,
            no_encontrados: Math.max(0, prevRes.no_encontrados - corregidos),
            no_encontrados_detalle: nuevosDetalle,
          });
        }
        return next;
      });
      setCorrecciones(new Map());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al corregir matching');
    } finally {
      setCorreccionLoading(false);
    }
  };

  const asignarAlumno = (indice: number, alumnoId: number) => {
    setCorrecciones((prev) => {
      const next = new Map(prev);
      next.set(indice, alumnoId);
      return next;
    });
  };

  const openCorreccionModal = (indice: number) => {
    setCorrigiendoIdx(indice);
  };

  const sugeridoDe = (item: { candidatos: CandidatoCoincidencia[] }): CandidatoCoincidencia | undefined =>
    item.candidatos.find((c) => c.sugerido);

  const confirmarSugerido = (item: DiagnosticoNoEncontrado) => {
    const cand = sugeridoDe(item);
    if (cand) asignarAlumno(item.indice, cand.alumno_id);
  };

  const confirmarTodosSugeridos = () => {
    setCorrecciones((prev) => {
      const next = new Map(prev);
      noEncontrados.forEach((item) => {
        const cand = sugeridoDe(item);
        if (cand) next.set(item.indice, cand.alumno_id);
      });
      return next;
    });
  };

  const renderProgressBar = () => (
    <div className={classes.wizardProgress}>
      {['Config', ...MATERIAS_ORDER.map((m) => MATERIAS_LABELS[m]), 'Resumen'].map((label, i) => {
        const isActive = i === step;
        const isDone = i < step || (i > 0 && i <= 4 && wizardResults.has(MATERIAS_ORDER[i - 1]));
        return (
          <div
            key={i}
            className={`${classes.wizardStep} ${isActive ? classes.wizardStepActive : ''} ${isDone ? classes.wizardStepDone : ''}`}
            onClick={() => {
              if (i === 0) goToStep(0);
              else if (i >= 1 && i <= 4 && isDone) goToStep(i);
              else if (i === 5 && allDone) goToStep(5);
            }}
          >
            <div className={classes.wizardStepCircle}>
              {isDone ? '✓' : i + 1}
            </div>
            <span className={classes.wizardStepLabel}>{label}</span>
          </div>
        );
      })}
    </div>
  );

  const renderStep0Config = () => (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Verifica que las respuestas correctas estén configuradas para cada materia antes de subir los exámenes.
      </Text>
      <div className={classes.configGrid}>
        {MATERIAS_ORDER.map((m) => {
          const config = materiasConfig[m];
          const configured = config?.configurada;
          return (
            <div key={m} className={`${classes.configCard} ${configured ? classes.configCardOk : classes.configCardMissing}`}>
              <Group justify="space-between">
                <div>
                  <Text fw={600} size="sm">{MATERIAS_LABELS[m]}</Text>
                  <Text size="xs" c="dimmed">
                    {configured ? `${config.total_preguntas} preguntas configuradas` : 'Sin configurar'}
                  </Text>
                </div>
                <Button
                  size="xs"
                  variant="light"
                  color={configured ? 'green' : 'orange'}
                  loading={respuestasLoading && editingMateria === m}
                  onClick={() => handleLoadRespuestas(m)}
                >
                  {configured ? 'Ver / Editar' : 'Configurar'}
                </Button>
              </Group>
            </div>
          );
        })}
      </div>
      {allKeysConfigured ? (
        <Alert color="green" variant="light" radius="md" icon={<IconCircleCheck size={18} />}>
          Todas las respuestas correctas están configuradas. Puedes continuar.
        </Alert>
      ) : (
        <Alert color="orange" variant="light" radius="md" icon={<IconInfoCircle size={18} />}>
          Hay materias sin respuestas configuradas para este periodo; se usará la clave por defecto.
        </Alert>
      )}
    </Stack>
  );

  const renderStepUpload = () => {
    if (!currentMateria) return null;
    const isUploading = uploadingMateria === currentMateria;
    const res = wizardResults.get(currentMateria);

    return (
      <Stack gap="md">
        {res && !resultado && (
          <Alert color="green" variant="light" radius="md" icon={<IconCircleCheck size={18} />}>
            {MATERIAS_LABELS[currentMateria]} ya fue procesado — {res.encontrados} alumnos, {res.no_encontrados} no encontrados.
            Puedes subir otro archivo para reemplazar.
          </Alert>
        )}

        {isUploading && (
          <Stack align="center" py="xl">
            <Text c="dimmed">Procesando {MATERIAS_LABELS[currentMateria]}...</Text>
          </Stack>
        )}

        {!isUploading && !resultado && (
          <div
            className={`${classes.dropzone} ${dragging ? classes.dropzoneActive : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
          >
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleInputChange} style={{ display: 'none' }} />
            <IconUpload size={36} color="#667085" stroke={1.5} />
            <Text className={classes.dropzoneLabel} mt="sm">
              Arrastra el examen de {MATERIAS_LABELS[currentMateria]} aquí o haz clic
            </Text>
            <Text className={classes.dropzoneHint}>Formatos: .xlsx, .xls</Text>
          </div>
        )}

        {error && (
          <Alert color="red" variant="light" radius="md" icon={<IconInfoCircle size={18} />}>
            {error}
            <Group mt="md">
              <Button size="xs" variant="light" onClick={() => { setError(null); setResultado(null); }}>
                Intentar de nuevo
              </Button>
            </Group>
          </Alert>
        )}

        {resultado && (
          <Stack gap="md">
            <div className={classes.statsRow}>
              <div className={`${classes.statBox} ${classes.statBoxGray}`}>
                <div className={classes.statNumber}>{resultado.total_filas}</div>
                <div className={classes.statLabel}>Total filas</div>
              </div>
              <div className={`${classes.statBox} ${classes.statBoxGreen}`}>
                <div className={classes.statNumber}>{resultado.encontrados}</div>
                <div className={classes.statLabel}>Encontrados</div>
              </div>
              <div className={`${classes.statBox} ${classes.statBoxRed}`}>
                <div className={classes.statNumber}>{resultado.no_encontrados}</div>
                <div className={classes.statLabel}>No encontrados</div>
              </div>
              <div className={`${classes.statBox} ${classes.statBoxYellow}`}>
                <div className={classes.statNumber}>{resultado.omitidas_otro_periodo ?? 0}</div>
                <div className={classes.statLabel}>Omitidas (otro periodo)</div>
              </div>
              <div className={`${classes.statBox} ${classes.statBoxGray}`}>
                <div className={classes.statNumber}>{resultado.intentos_repetidos_ignorados ?? 0}</div>
                <div className={classes.statLabel}>Repetidos (1er intento)</div>
              </div>
            </div>

            {avisoOmitidas && (
              <Alert color="yellow" variant="light" radius="md" icon={<IconInfoCircle size={18} />}>
                {avisoOmitidas}
              </Alert>
            )}

            {resultado.advertencia && (
              <Alert color="yellow" variant="light" radius="md" icon={<IconInfoCircle size={18} />}>
                {resultado.advertencia}
              </Alert>
            )}

            {noEncontrados.length > 0 && (
              <Card padding="md" radius="md" className={classes.expandCard}>
                <Group justify="space-between" mb="sm">
                  <Text fw={600} size="sm">
                    Alumnos no encontrados ({noEncontrados.length})
                  </Text>
                  <Group gap="sm">
                    {nSugeridos > 0 && (
                      <Button size="xs" variant="outline" color="green" onClick={confirmarTodosSugeridos}>
                        Confirmar todos los sugeridos ({nSugeridos})
                      </Button>
                    )}
                    {correcciones.size > 0 && (
                      <Button size="xs" variant="filled" color="blue" loading={correccionLoading} onClick={handleCorregirMatching}>
                        Aplicar correcciones ({correcciones.size})
                      </Button>
                    )}
                  </Group>
                </Group>
                <div className={classes.scrollTable}>
                  <table className={classes.table}>
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Email</th>
                        <th>Cuenta</th>
                        <th>Folio</th>
                        <th>Motivo</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {noEncontrados.map((item, idx) => {
                        const sugerido = sugeridoDe(item);
                        return (
                          <tr key={idx}>
                            <td className={classes.wrapCell}>{item.nombre_original}</td>
                            <td>{item.correo || '—'}</td>
                            <td>{item.cuenta || '—'}</td>
                            <td>{item.folio || '—'}</td>
                            <td className={classes.wrapCell}>{item.motivo || '—'}</td>
                            <td>
                              {correcciones.has(item.indice) ? (
                                <Text size="xs" c="green" fw={600}>Asignado</Text>
                              ) : (
                                <Stack gap={4}>
                                  {sugerido && (
                                    <Group gap="xs" wrap="nowrap">
                                      <Text size="xs" c="dimmed">
                                        Sugerido: <strong>{sugerido.nombre}</strong> · {sugerido.cuenta}
                                      </Text>
                                      <Button size="compact-xs" variant="filled" color="green" onClick={() => confirmarSugerido(item)}>
                                        Confirmar
                                      </Button>
                                    </Group>
                                  )}
                                  <Button size="compact-xs" variant="subtle" color="blue" onClick={() => openCorreccionModal(item.indice)}>
                                    Corregir
                                  </Button>
                                </Stack>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {noEncontrados.length > 0 && (
              <Alert color="yellow" variant="light" radius="md" icon={<IconInfoCircle size={18} />}>
                <Text size="sm" fw={600}>Hay {noEncontrados.length} alumno(s) sin encontrar</Text>
                <Text size="xs" c="dimmed">
                  Puedes corregir uno por uno, o continuar a la siguiente materia. Los errores quedarán marcados para después.
                </Text>
              </Alert>
            )}
          </Stack>
        )}
      </Stack>
    );
  };

  const renderStep5Summary = () => (
    <Stack gap="md">
      <Text size="sm" c="dimmed">Resumen del proceso de diagnóstico para el periodo {periodo}.</Text>
      <div className={classes.configGrid}>
        {MATERIAS_ORDER.map((m) => {
          const res = wizardResults.get(m);
          const config = materiasConfig[m];
          return (
            <div key={m} className={`${classes.configCard} ${res ? classes.configCardOk : ''}`}>
              <Group justify="space-between">
                <div>
                  <Text fw={600} size="sm">{MATERIAS_LABELS[m]}</Text>
                  <Text size="xs" c="dimmed">
                    {res
                      ? `${res.encontrados} alumnos · ${res.no_encontrados} no encontrados`
                      : config?.configurada ? 'No procesado' : 'Sin respuestas'}
                  </Text>
                </div>
                {res && <IconCircleCheck size={20} color="green" />}
              </Group>
            </div>
          );
        })}
      </div>
      <Group justify="flex-end">
        <Button color="green" onClick={handleExport} leftSection={<IconFileSpreadsheet size={18} />}>
          Exportar Excel consolidado
        </Button>
      </Group>
    </Stack>
  );

  return (
    <Stack gap="lg">
      <Group gap="md" wrap="wrap">
        <TextInput
          label="Periodo"
          value={periodo}
          onChange={(e) => setPeriodo(e.currentTarget.value)}
          style={{ width: 140 }}
          size="sm"
        />
      </Group>

      {renderProgressBar()}

      {loadingStatus ? (
        <Stack align="center" py="xl">
          <Text c="dimmed">Cargando estado...</Text>
        </Stack>
      ) : (
        <>
          {step === 0 && renderStep0Config()}
          {step >= 1 && step <= 4 && renderStepUpload()}
          {step === 5 && renderStep5Summary()}
        </>
      )}

      <Group justify="space-between" mt="md">
        <Button variant="default" onClick={handleBack} disabled={step === 0}>
          Atrás
        </Button>
        {step === 0 ? (
          <Button onClick={handleNext}>
            Comenzar carga
          </Button>
        ) : step >= 1 && step <= 4 ? (
          <Button onClick={handleNext}>
            {step === 4 ? 'Ver resumen' : `Siguiente: ${MATERIAS_LABELS[MATERIAS_ORDER[step]]}`}
          </Button>
        ) : null}
      </Group>

      <Modal
        opened={showRespuestasModal}
        onClose={() => setShowRespuestasModal(false)}
        title={`Respuestas correctas — ${editingMateria ? MATERIAS_LABELS[editingMateria] : ''}`}
        size="lg"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Edita las respuestas correctas para esta materia y periodo.
          </Text>
          <div className={classes.scrollTable} style={{ maxHeight: 400 }}>
            <table className={classes.table}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Respuesta correcta</th>
                </tr>
              </thead>
              <tbody>
                {respuestas.map((r, idx) => (
                  <tr key={r.codigo}>
                    <td>{r.codigo}</td>
                    <td>
                      <Select
                        size="xs"
                        data={['a', 'b', 'c', 'd'].map((v) => ({ value: v, label: v.toUpperCase() }))}
                        value={r.respuesta_correcta}
                        onChange={(val) => {
                          setRespuestas((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], respuesta_correcta: val || '' };
                            return next;
                          });
                        }}
                        style={{ width: 80 }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setShowRespuestasModal(false)}>Cancelar</Button>
            <Button color="green" onClick={handleSaveRespuestas}>Guardar</Button>
          </Group>
        </Stack>
      </Modal>

      <CorreccionModal
        opened={corrigiendoIdx !== null}
        onClose={() => setCorrigiendoIdx(null)}
        item={noEncontradoActual ?? null}
        periodo={periodo}
        onAsignar={asignarAlumno}
      />
    </Stack>
  );
}

interface TarjetaCuestionarioProps {
  cuestionario: 1 | 2;
  label: string;
  rango: string;
  resultado: ResultadoProcesamientoCuestionario | null;
  uploading: boolean;
  archivo: File | null;
  onUpload: (cuestionario: 1 | 2, file: File) => void;
  onReemplazar: (cuestionario: 1 | 2) => void;
}

function TarjetaCuestionario({
  cuestionario,
  label,
  rango,
  resultado,
  uploading,
  archivo,
  onUpload,
  onReemplazar,
}: TarjetaCuestionarioProps) {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(cuestionario, file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(cuestionario, file);
    e.target.value = '';
  };

  return (
    <Card className={classes.card} padding="lg" radius="lg">
      <Stack gap="md">
        <div>
          <Title order={4} className={classes.title}>{label}</Title>
          <Text className={classes.subtitle}>{rango}</Text>
        </div>

        {uploading && (
          <Stack align="center" py="xl">
            <Text c="dimmed">Procesando {label}...</Text>
          </Stack>
        )}

        {!uploading && !resultado && (
          <div
            className={`${classes.dropzone} ${dragging ? classes.dropzoneActive : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
          >
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleInputChange} style={{ display: 'none' }} />
            <IconUpload size={36} color="#667085" stroke={1.5} />
            <Text className={classes.dropzoneLabel} mt="sm">
              Arrastra el {label} aquí o haz clic
            </Text>
            <Text className={classes.dropzoneHint}>Formatos: .xlsx, .xls</Text>
          </div>
        )}

        {!uploading && resultado && (
          <Stack gap="md">
            <div className={classes.statsRow}>
              <div className={`${classes.statBox} ${classes.statBoxGreen}`}>
                <div className={classes.statNumber}>{resultado.encontrados}</div>
                <div className={classes.statLabel}>Encontrados</div>
              </div>
              <div className={`${classes.statBox} ${classes.statBoxRed}`}>
                <div className={classes.statNumber}>{resultado.no_encontrados}</div>
                <div className={classes.statLabel}>No encontrados</div>
              </div>
              <div className={`${classes.statBox} ${classes.statBoxYellow}`}>
                <div className={classes.statNumber}>{resultado.omitidas_otro_periodo}</div>
                <div className={classes.statLabel}>Omitidas (otro periodo)</div>
              </div>
              <div className={`${classes.statBox} ${classes.statBoxGray}`}>
                <div className={classes.statNumber}>{resultado.intentos_repetidos_ignorados}</div>
                <div className={classes.statLabel}>Intentos repetidos (se tomó el primero)</div>
              </div>
            </div>
            <Group justify="space-between">
              {archivo && (
                <Text size="xs" c="dimmed" className={classes.wrapCell}>
                  Archivo: {archivo.name}
                </Text>
              )}
              <Button size="xs" variant="subtle" color="gray" onClick={() => onReemplazar(cuestionario)}>
                Reemplazar archivo
              </Button>
            </Group>
          </Stack>
        )}
      </Stack>
    </Card>
  );
}

function CuestionarioSection() {
  const [periodo, setPeriodo] = useState(getCurrentPeriodo());
  const [archivos, setArchivos] = useState<{ 1?: File; 2?: File }>({});
  const [resultadoC1, setResultadoC1] = useState<ResultadoProcesamientoCuestionario | null>(null);
  const [resultadoC2, setResultadoC2] = useState<ResultadoProcesamientoCuestionario | null>(null);
  const [uploading, setUploading] = useState<1 | 2 | null>(null);
  const [aplicando, setAplicando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avisoOmitidas, setAvisoOmitidas] = useState<string | null>(null);
  const [correcciones, setCorrecciones] = useState<Record<1 | 2, Map<number, number>>>({
    1: new Map(),
    2: new Map(),
  });
  const [corrigiendoItem, setCorrigiendoItem] = useState<CuestionarioNoEncontrado | null>(null);

  const noEncontrados: CuestionarioNoEncontrado[] = [
    ...(resultadoC1?.no_encontrados_detalle ?? []),
    ...(resultadoC2?.no_encontrados_detalle ?? []),
  ];
  const totalCorrecciones = correcciones[1].size + correcciones[2].size;
  const nSugeridos = noEncontrados.filter((n) => n.candidatos.some((c) => c.sugerido)).length;

  const handleFile = useCallback(async (cuestionario: 1 | 2, file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Solo se permiten archivos .xlsx o .xls');
      return;
    }
    setError(null);
    setAvisoOmitidas(null);
    setUploading(cuestionario);
    try {
      const result = await uploadCuestionario(cuestionario, periodo, file);
      setArchivos((prev) => ({ ...prev, [cuestionario]: file }));
      if (cuestionario === 1) setResultadoC1(result);
      else setResultadoC2(result);
      setCorrecciones((prev) => ({ ...prev, [cuestionario]: new Map() }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar el cuestionario');
    } finally {
      setUploading(null);
    }
  }, [periodo]);

  const reemplazarArchivo = (cuestionario: 1 | 2) => {
    setArchivos((prev) => ({ ...prev, [cuestionario]: undefined }));
    setCorrecciones((prev) => ({ ...prev, [cuestionario]: new Map() }));
    setAvisoOmitidas(null);
    if (cuestionario === 1) setResultadoC1(null);
    else setResultadoC2(null);
  };

  const sugeridoDe = (item: { candidatos: CandidatoCoincidencia[] }): CandidatoCoincidencia | undefined =>
    item.candidatos.find((c) => c.sugerido);

  const asignarCorreccion = (indice: number, alumnoId: number) => {
    if (!corrigiendoItem) return;
    setCorrecciones((prev) => {
      const next = { ...prev };
      const m = new Map(prev[corrigiendoItem.cuestionario as 1 | 2]);
      m.set(indice, alumnoId);
      next[corrigiendoItem.cuestionario as 1 | 2] = m;
      return next;
    });
  };

  const confirmarSugerido = (item: CuestionarioNoEncontrado) => {
    const cand = sugeridoDe(item);
    if (!cand) return;
    setCorrecciones((prev) => {
      const next = { ...prev };
      const m = new Map(prev[item.cuestionario as 1 | 2]);
      m.set(item.indice, cand.alumno_id);
      next[item.cuestionario as 1 | 2] = m;
      return next;
    });
  };

  const confirmarTodosSugeridos = () => {
    setCorrecciones((prev) => {
      const next = { ...prev, 1: new Map(prev[1]), 2: new Map(prev[2]) };
      noEncontrados.forEach((item) => {
        const cand = sugeridoDe(item);
        if (cand) next[item.cuestionario as 1 | 2].set(item.indice, cand.alumno_id);
      });
      return next;
    });
  };

  const aplicarCorrecciones = async () => {
    const pendientes = ([1, 2] as const).filter((c) => correcciones[c].size > 0 && Boolean(archivos[c]));
    if (pendientes.length === 0) return;
    setAplicando(true);
    setError(null);
    setAvisoOmitidas(null);
    const originales = noEncontrados;
    try {
      let totalOmitidas = 0;
      for (const c of pendientes) {
        const indicesCorregidos = new Set(correcciones[c].keys());
        const correccionesArray = Array.from(correcciones[c].entries()).map(([indice, alumno_id]) => ({ indice, alumno_id }));
        const res = await corregirMatchingCuestionario(c, periodo, archivos[c]!, correccionesArray);
        const omitidosSet = new Set(res.omitidas_ya_tenian_resultado ?? []);
        totalOmitidas += omitidosSet.size;

        const detalleQueda = originales.filter(
          (n) => !(Number(n.cuestionario) === c && (indicesCorregidos.has(n.indice) || omitidosSet.has(n.indice))),
        );
        const detalleC = detalleQueda.filter((n) => Number(n.cuestionario) === c);
        const corregidos = originales.length - detalleQueda.length;
        const merge = (prev: ResultadoProcesamientoCuestionario | null) =>
          prev
            ? {
                ...prev,
                encontrados: prev.encontrados + corregidos,
                no_encontrados: Math.max(0, prev.no_encontrados - corregidos),
                no_encontrados_detalle: detalleC,
              }
            : prev;
        if (c === 1) setResultadoC1(merge);
        else setResultadoC2(merge);
        setCorrecciones((prev) => ({ ...prev, [c]: new Map() }));
      }
      if (totalOmitidas > 0) {
        setAvisoOmitidas(
          `${totalOmitidas} fila(s) no se aplicaron porque ese alumno ya tenía resultado de un intento anterior.`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al corregir matching');
    } finally {
      setAplicando(false);
    }
  };

  return (
    <Stack gap="lg">
      <Group gap="md" wrap="wrap">
        <TextInput
          label="Periodo"
          value={periodo}
          onChange={(e) => setPeriodo(e.currentTarget.value)}
          style={{ width: 140 }}
          size="sm"
        />
      </Group>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <TarjetaCuestionario
          cuestionario={1}
          label="Cuestionario 1"
          rango="preguntas 1–10"
          resultado={resultadoC1}
          uploading={uploading === 1}
          archivo={archivos[1] ?? null}
          onUpload={handleFile}
          onReemplazar={reemplazarArchivo}
        />
        <TarjetaCuestionario
          cuestionario={2}
          label="Cuestionario 2"
          rango="preguntas 11–20"
          resultado={resultadoC2}
          uploading={uploading === 2}
          archivo={archivos[2] ?? null}
          onUpload={handleFile}
          onReemplazar={reemplazarArchivo}
        />
      </SimpleGrid>

      {avisoOmitidas && (
        <Alert color="yellow" variant="light" radius="md" icon={<IconInfoCircle size={18} />}>
          {avisoOmitidas}
        </Alert>
      )}

      {error && (
        <Alert color="red" variant="light" radius="md" icon={<IconInfoCircle size={18} />}>
          {error}
          <Group mt="md">
            <Button size="xs" variant="light" onClick={() => setError(null)}>
              Intentar de nuevo
            </Button>
          </Group>
        </Alert>
      )}

      {noEncontrados.length > 0 && (
        <Card padding="md" radius="md" className={classes.expandCard}>
          <Group justify="space-between" mb="sm">
            <Text fw={600} size="sm">
              Alumnos no encontrados ({noEncontrados.length})
            </Text>
            <Group gap="sm">
              {nSugeridos > 0 && (
                <Button size="xs" variant="outline" color="green" onClick={confirmarTodosSugeridos}>
                  Confirmar todos los sugeridos ({nSugeridos})
                </Button>
              )}
              {totalCorrecciones > 0 && (
                <Button size="xs" variant="filled" color="blue" loading={aplicando} onClick={aplicarCorrecciones}>
                  Aplicar correcciones ({totalCorrecciones})
                </Button>
              )}
            </Group>
          </Group>
          <div className={classes.scrollTable}>
            <table className={classes.table}>
              <thead>
                <tr>
                  <th>Correo</th>
                  <th>Folio</th>
                  <th>Cuenta</th>
                  <th>Usuario</th>
                  <th>Motivo</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {noEncontrados.map((item, idx) => {
                  const sugerido = sugeridoDe(item);
                  const asignado = correcciones[item.cuestionario as 1 | 2].has(item.indice);
                  return (
                    <tr key={`${item.cuestionario}-${idx}`}>
                      <td className={classes.wrapCell}>{item.correo || '—'}</td>
                      <td>{item.folio || '—'}</td>
                      <td>{item.cuenta || '—'}</td>
                      <td>
                        <Group gap={6} wrap="nowrap">
                          <Badge size="xs" variant="light" color="indigo">C{item.cuestionario}</Badge>
                          <Text size="sm">{item.usuario || '—'}</Text>
                        </Group>
                      </td>
                      <td className={classes.wrapCell}>{item.motivo || '—'}</td>
                      <td>
                        {asignado ? (
                          <Text size="xs" c="green" fw={600}>Asignado</Text>
                        ) : (
                          <Stack gap={4}>
                            {sugerido && (
                              <Group gap="xs" wrap="nowrap">
                                <Text size="xs" c="dimmed">
                                  Sugerido: <strong>{sugerido.nombre}</strong> · {sugerido.cuenta}
                                </Text>
                                <Button size="compact-xs" variant="filled" color="green" onClick={() => confirmarSugerido(item)}>
                                  Confirmar
                                </Button>
                              </Group>
                            )}
                            <Button size="compact-xs" variant="subtle" color="blue" onClick={() => setCorrigiendoItem(item)}>
                              Corregir
                            </Button>
                          </Stack>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {noEncontrados.length === 0 && (Boolean(resultadoC1) || Boolean(resultadoC2)) && (
        <Alert color="green" variant="light" radius="md" icon={<IconCircleCheck size={18} />}>
          Todos los alumnos de los cuestionarios cargados fueron encontrados y quedaron guardados para el periodo {periodo}.
        </Alert>
      )}

      <CorreccionModal
        opened={corrigiendoItem !== null}
        onClose={() => setCorrigiendoItem(null)}
        item={corrigiendoItem}
        periodo={periodo}
        onAsignar={asignarCorreccion}
      />
    </Stack>
  );
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
          Sube archivos Excel con datos de alumnos o exámenes diagnóstico para su procesamiento.
        </Text>
      </div>

      <Tabs defaultValue="alumnos" mt="lg">
        <Tabs.List>
          <Tabs.Tab value="alumnos" leftSection={<IconUpload size={16} />}>
            Carga de Alumnos
          </Tabs.Tab>
          <Tabs.Tab value="cuestionario" leftSection={<IconClipboardList size={16} />}>
            Examen diagnóstico
          </Tabs.Tab>
          <Tabs.Tab value="diagnostico" leftSection={<IconFileSpreadsheet size={16} />}>
            Examen final
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="alumnos" pt="md">
          <Card className={classes.card} padding="xl" radius="lg">
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
        </Tabs.Panel>

        <Tabs.Panel value="cuestionario" pt="md">
          <Card className={classes.card} padding="xl" radius="lg">
            <Stack gap="lg">
              <div>
                <Title order={3} className={classes.title}>
                  Procesar exámenes de diagnóstico
                </Title>
                <Text className={classes.subtitle}>
                  Sube los dos cuestionarios de Google Forms (preguntas 1–10 y 11–20) del examen diagnóstico para el periodo indicado.
                </Text>
              </div>

              <CuestionarioSection />
            </Stack>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="diagnostico" pt="md">
          <Card className={classes.card} padding="xl" radius="lg">
            <Stack gap="lg">
              <div>
                <Title order={3} className={classes.title}>
                  Procesar examen final
                </Title>
                <Text className={classes.subtitle}>
                  Sube el archivo Excel de Google Forms con las respuestas de los alumnos.
                </Text>
              </div>

              <DiagnosticoSection />
            </Stack>
          </Card>
        </Tabs.Panel>
      </Tabs>

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

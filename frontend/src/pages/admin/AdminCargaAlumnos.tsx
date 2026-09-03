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
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import {
  IconCircleCheck,
  IconFileSpreadsheet,
  IconInfoCircle,
  IconSearch,
  IconUpload,
} from '@tabler/icons-react';
import { useCallback, useRef, useState } from 'react';

import { corregirFilas, uploadAlumnosExcel } from '../../lib/uploadApi';
import {
  uploadDiagnostico,
  corregirMatching,
  exportarResultados,
  getRespuestasCorrectas,
  saveRespuestasCorrectas,
  buscarAlumno,
  crearAlumnoDiagnostico,
  type BuscarAlumnoResult,
  type CrearAlumnoPayload,
} from '../../lib/diagnosticoApi';
import type { CampoError, FilaCorregida, FilaResultado, ResultadoCarga } from '../../types/upload';
import type {
  ResultadoProcesamientoDiagnostico,
  DiagnosticoNoEncontrado,
  RespuestaCorrecta,
} from '../../types/diagnostico';
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

const MATERIAS_OPTIONS = [
  { value: 'algebra', label: 'Álgebra' },
  { value: 'trigonometria', label: 'Trigonometría' },
  { value: 'geometria', label: 'Geometría' },
  { value: 'calculo', label: 'Cálculo Diferencial' },
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
  const [materia, setMateria] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState(getCurrentPeriodo());
  const [viewState, setViewState] = useState<ViewState>('idle');
  const [resultado, setResultado] = useState<ResultadoProcesamientoDiagnostico | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  const [noEncontrados, setNoEncontrados] = useState<DiagnosticoNoEncontrado[]>([]);
  const [correcciones, setCorrecciones] = useState<Map<number, number>>(new Map());
  const [showRespuestasModal, setShowRespuestasModal] = useState(false);
  const [respuestas, setRespuestas] = useState<RespuestaCorrecta[]>([]);
  const [respuestasLoading, setRespuestasLoading] = useState(false);

  const [corrigiendoIdx, setCorrigiendoIdx] = useState<number | null>(null);
  const [correccionTab, setCorreccionTab] = useState<'buscar' | 'crear'>('buscar');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BuscarAlumnoResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [createForm, setCreateForm] = useState<CrearAlumnoPayload>({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    correo_personal: '',
    numero_cuenta: null,
    numero_folio: null,
    ingenieria_clave: null,
    periodo: '',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [correccionError, setCorreccionError] = useState<string | null>(null);

  const noEncontradoActual = corrigiendoIdx !== null ? noEncontrados.find((n) => n.indice === corrigiendoIdx) : null;

  const handleFile = useCallback(async (file: File) => {
    if (!materia) {
      setError('Selecciona una materia primero');
      setViewState('error');
      return;
    }
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Solo se permiten archivos .xlsx o .xls');
      setViewState('error');
      return;
    }

    setViewState('uploading');
    setError(null);
    setResultado(null);
    setCurrentFile(file);

    try {
      const result = await uploadDiagnostico(materia, periodo, file);
      setResultado(result);
      setNoEncontrados(result.no_encontrados_detalle);
      setViewState('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar el archivo');
      setViewState('error');
    }
  }, [materia, periodo]);

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
    setNoEncontrados([]);
    setCorrecciones(new Map());
    setCurrentFile(null);
  };

  const handleExport = async () => {
    if (!materia) return;
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

  const handleCorregirMatching = async () => {
    if (!currentFile || !materia || correcciones.size === 0) return;
    setSearchLoading(true);
    try {
      const correccionesArray = Array.from(correcciones.entries()).map(([indice, alumno_id]) => ({
        indice,
        alumno_id,
      }));
      const result = await corregirMatching(materia, periodo, currentFile, correccionesArray);
      setResultado(result);
      setNoEncontrados(result.no_encontrados_detalle);
      setCorrecciones(new Map());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al corregir matching');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleLoadRespuestas = async () => {
    if (!materia) return;
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
    if (!materia) return;
    try {
      await saveRespuestasCorrectas({
        materia,
        periodo,
        respuestas,
      });
      setShowRespuestasModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar respuestas');
    }
  };

  const toggleCorreccion = (indice: number, alumnoId: number) => {
    setCorrecciones((prev) => {
      const next = new Map(prev);
      if (next.has(indice)) {
        next.delete(indice);
      } else {
        next.set(indice, alumnoId);
      }
      return next;
    });
  };

  const openCorreccionModal = (indice: number) => {
    setCorrigiendoIdx(indice);
    setCorreccionTab('buscar');
    setSearchQuery('');
    setSearchResults([]);
    setCorreccionError(null);
    const item = noEncontrados.find((n) => n.indice === indice);
    if (item) {
      const nombreCompleto = item.nombre_original || '';
      setSearchQuery(nombreCompleto);
      const parts = nombreCompleto.split(' ');
      setCreateForm({
        nombre: parts[0] || '',
        apellido_paterno: parts.length > 2 ? parts[parts.length - 2] : parts[1] || '',
        apellido_materno: parts.length > 2 ? parts[parts.length - 1] : '',
        correo_personal: item.correo || '',
        numero_cuenta: item.cuenta || null,
        numero_folio: item.folio || null,
        ingenieria_clave: null,
        periodo: periodo,
      });
    }
  };

  const handleSearchAlumno = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const results = await buscarAlumno(searchQuery.trim());
      setSearchResults(results);
    } catch {
      setCorreccionError('Error al buscar alumnos');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectExisting = (alumnoId: number) => {
    if (corrigiendoIdx === null) return;
    toggleCorreccion(corrigiendoIdx, alumnoId);
    setCorrigiendoIdx(null);
  };

  const handleCreateAlumno = async () => {
    if (!createForm.nombre || !createForm.apellido_paterno || !createForm.correo_personal) {
      setCorreccionError('Nombre, apellido paterno y correo son obligatorios');
      return;
    }
    setCreateLoading(true);
    setCorreccionError(null);
    try {
      const nuevo = await crearAlumnoDiagnostico(createForm);
      if (corrigiendoIdx !== null) {
        toggleCorreccion(corrigiendoIdx, nuevo.id);
      }
      setCorrigiendoIdx(null);
    } catch (err) {
      setCorreccionError(err instanceof Error ? err.message : 'Error al crear alumno');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <Stack gap="lg">
      <Group gap="md" wrap="wrap">
        <Select
          label="Materia"
          placeholder="Selecciona materia"
          data={MATERIAS_OPTIONS}
          value={materia}
          onChange={setMateria}
          style={{ minWidth: 220 }}
          size="sm"
        />
        <TextInput
          label="Periodo"
          value={periodo}
          onChange={(e) => setPeriodo(e.currentTarget.value)}
          style={{ width: 140 }}
          size="sm"
        />
        <Button
          variant="outline"
          color="blue"
          size="sm"
          mt="auto"
          loading={respuestasLoading}
          onClick={handleLoadRespuestas}
          disabled={!materia}
        >
          Ver respuestas correctas
        </Button>
      </Group>

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
            Arrastra el examen diagnóstico aquí o haz clic para seleccionar
          </Text>
          <Text className={classes.dropzoneHint}>
            Formatos aceptados: .xlsx, .xls
          </Text>
        </div>
      )}

      {viewState === 'uploading' && (
        <Stack align="center" py="xl">
          <Text c="dimmed">Procesando examen diagnóstico...</Text>
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
            Examen procesado correctamente — {resultado.materia}
          </Alert>

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
          </div>

          {noEncontrados.length > 0 && (
            <Card padding="md" radius="md" className={classes.expandCard}>
              <Group justify="space-between" mb="sm">
                <Text fw={600} size="sm">
                  Alumnos no encontrados ({noEncontrados.length})
                </Text>
                {correcciones.size > 0 && (
                  <Button
                    size="xs"
                    variant="filled"
                    color="blue"
                    loading={searchLoading}
                    onClick={handleCorregirMatching}
                  >
                    Aplicar correcciones ({correcciones.size})
                  </Button>
                )}
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
                    {noEncontrados.map((item, idx) => (
                      <tr key={idx}>
                        <td className={classes.wrapCell}>{item.nombre_original}</td>
                        <td>{item.correo || '—'}</td>
                        <td>{item.cuenta || '—'}</td>
                        <td>{item.folio || '—'}</td>
                        <td className={classes.wrapCell}>{item.motivo}</td>
                        <td>
                          {correcciones.has(item.indice) ? (
                            <Text size="xs" c="green" fw={600}>
                              Asignado (ID: {correcciones.get(item.indice)})
                            </Text>
                          ) : (
                            <Button
                              size="compact-xs"
                              variant="filled"
                              color="blue"
                              onClick={() => openCorreccionModal(item.indice)}
                            >
                              Corregir
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <div className={classes.actionRow}>
            <Button
              size="md"
              color="indigo"
              className={classes.submitButton}
              onClick={handleReset}
            >
              Subir otro examen
            </Button>
            <Button
              size="md"
              color="green"
              className={classes.submitButton}
              onClick={handleExport}
            >
              <IconFileSpreadsheet size={18} style={{ marginRight: 8 }} />
              Exportar Excel consolidado
            </Button>
          </div>
        </Stack>
      )}

      <Modal
        opened={showRespuestasModal}
        onClose={() => setShowRespuestasModal(false)}
        title={`Respuestas correctas — ${materia || ''}`}
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
            <Button variant="default" onClick={() => setShowRespuestasModal(false)}>
              Cancelar
            </Button>
            <Button color="green" onClick={handleSaveRespuestas}>
              Guardar
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={corrigiendoIdx !== null}
        onClose={() => setCorrigiendoIdx(null)}
        title={`Corregir: ${noEncontradoActual?.nombre_original || ''}`}
        size="lg"
        centered
      >
        <Stack gap="md">
          {noEncontradoActual && (
            <div className={classes.correccionForm}>
              <Text size="xs" c="dimmed">
                <strong>Email:</strong> {noEncontradoActual.correo || '—'}
              </Text>
              <Text size="xs" c="dimmed">
                <strong>Cuenta:</strong> {noEncontradoActual.cuenta || '—'}
              </Text>
            </div>
          )}

          <Group gap={0} mb="xs">
            <Button
              size="xs"
              variant={correccionTab === 'buscar' ? 'filled' : 'outline'}
              color="blue"
              radius={0}
              onClick={() => setCorreccionTab('buscar')}
            >
              Buscar existente
            </Button>
            <Button
              size="xs"
              variant={correccionTab === 'crear' ? 'filled' : 'outline'}
              color="blue"
              radius={0}
              onClick={() => setCorreccionTab('crear')}
            >
              Crear nuevo
            </Button>
          </Group>

          {correccionTab === 'buscar' && (
            <Stack gap="sm">
              <Group>
                <TextInput
                  placeholder="Buscar por nombre, email, cuenta..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.currentTarget.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearchAlumno(); }}
                  style={{ flex: 1 }}
                  size="sm"
                />
                <Button
                  size="sm"
                  variant="filled"
                  color="blue"
                  loading={searchLoading}
                  onClick={handleSearchAlumno}
                  leftSection={<IconSearch size={14} />}
                >
                  Buscar
                </Button>
              </Group>
              {searchResults.length > 0 && (
                <div className={classes.scrollTable} style={{ maxHeight: 250 }}>
                  <Stack gap={4}>
                    {searchResults.map((r) => (
                      <div
                        key={r.id}
                        className={classes.searchResult}
                        onClick={() => handleSelectExisting(r.id)}
                      >
                        <div className={classes.searchResultName}>
                          {r.nombre} {r.apellido_paterno} {r.apellido_materno}
                        </div>
                        <div className={classes.searchResultDetail}>
                          {r.numero_cuenta && `Cuenta: ${r.numero_cuenta}`}
                          {r.numero_cuenta && r.numero_folio && ' · '}
                          {r.numero_folio && `Folio: ${r.numero_folio}`}
                          {r.correo && ` · ${r.correo}`}
                          {r.ingenieria && ` · ${r.ingenieria}`}
                        </div>
                      </div>
                    ))}
                  </Stack>
                </div>
              )}
              {searchQuery && !searchLoading && searchResults.length === 0 && (
                <Text size="sm" c="dimmed" ta="center" py="sm">
                  Sin resultados. Prueba con otros términos o crea el alumno.
                </Text>
              )}
            </Stack>
          )}

          {correccionTab === 'crear' && (
            <Stack gap="sm">
              <div className={classes.correccionForm}>
                <TextInput
                  label="Nombre"
                  value={createForm.nombre}
                  onChange={(e) => setCreateForm((p) => ({ ...p, nombre: e.currentTarget.value }))}
                  size="sm"
                  required
                />
                <TextInput
                  label="Apellido paterno"
                  value={createForm.apellido_paterno}
                  onChange={(e) => setCreateForm((p) => ({ ...p, apellido_paterno: e.currentTarget.value }))}
                  size="sm"
                  required
                />
                <TextInput
                  label="Apellido materno"
                  value={createForm.apellido_materno}
                  onChange={(e) => setCreateForm((p) => ({ ...p, apellido_materno: e.currentTarget.value }))}
                  size="sm"
                />
                <TextInput
                  label="Correo personal"
                  value={createForm.correo_personal}
                  onChange={(e) => setCreateForm((p) => ({ ...p, correo_personal: e.currentTarget.value }))}
                  size="sm"
                  required
                />
                <TextInput
                  label="Nº Cuenta (7 dígitos)"
                  value={createForm.numero_cuenta || ''}
                  onChange={(e) => setCreateForm((p) => ({ ...p, numero_cuenta: e.currentTarget.value || null }))}
                  size="sm"
                />
                <TextInput
                  label="Nº Folio (9 dígitos)"
                  value={createForm.numero_folio || ''}
                  onChange={(e) => setCreateForm((p) => ({ ...p, numero_folio: e.currentTarget.value || null }))}
                  size="sm"
                />
                <Select
                  label="Ingeniería"
                  data={INGENIERIA_OPTIONS}
                  value={createForm.ingenieria_clave}
                  onChange={(v) => setCreateForm((p) => ({ ...p, ingenieria_clave: v }))}
                  size="sm"
                  clearable
                />
                <TextInput
                  label="Periodo"
                  value={createForm.periodo}
                  onChange={(e) => setCreateForm((p) => ({ ...p, periodo: e.currentTarget.value }))}
                  size="sm"
                />
              </div>
            </Stack>
          )}

          {correccionError && (
            <Alert color="red" variant="light" radius="md" icon={<IconInfoCircle size={16} />}>
              {correccionError}
            </Alert>
          )}

          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setCorrigiendoIdx(null)}>
              Cancelar
            </Button>
            {correccionTab === 'crear' && (
              <Button
                color="green"
                loading={createLoading}
                onClick={handleCreateAlumno}
              >
                Crear y asignar
              </Button>
            )}
          </Group>
        </Stack>
      </Modal>
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
          <Tabs.Tab value="diagnostico" leftSection={<IconFileSpreadsheet size={16} />}>
            Exámenes Diagnóstico
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

        <Tabs.Panel value="diagnostico" pt="md">
          <Card className={classes.card} padding="xl" radius="lg">
            <Stack gap="lg">
              <div>
                <Title order={3} className={classes.title}>
                  Procesar examen diagnóstico
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

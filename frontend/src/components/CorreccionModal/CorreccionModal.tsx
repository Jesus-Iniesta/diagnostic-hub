import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconInfoCircle, IconSearch } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import {
  buscarAlumno,
  crearAlumnoDiagnostico,
  type BuscarAlumnoResult,
  type CrearAlumnoPayload,
} from '../../lib/diagnosticoApi';
import type { CandidatoCoincidencia } from '../../types/cuestionario';
import classes from './CorreccionModal.module.css';

export interface CorreccionModalItem {
  indice: number;
  nombre_original: string;
  correo: string | null;
  cuenta: string | null;
  folio: string | null;
  candidatos: CandidatoCoincidencia[];
}

interface CorreccionModalProps {
  opened: boolean;
  onClose: () => void;
  item: CorreccionModalItem | null;
  periodo: string;
  onAsignar: (indice: number, alumnoId: number) => void;
}

const INGENIERIA_OPTIONS = [
  { value: 'ICO', label: 'ICO - Ingeniería en Computación' },
  { value: 'IEL', label: 'IEL - Ingeniería Electrónica' },
  { value: 'IME', label: 'IME - Ingeniería Mecánica' },
  { value: 'ISES', label: 'ISES - Ingeniería en Sistemas Económicos y de Salud' },
  { value: 'ICI', label: 'ICI - Ingeniería en Ciencias de la Información' },
  { value: 'IIA', label: 'IIA - Ingeniería en Inteligencia Artificial' },
];

export default function CorreccionModal({
  opened,
  onClose,
  item,
  periodo,
  onAsignar,
}: CorreccionModalProps) {
  const [tab, setTab] = useState<'buscar' | 'crear'>('buscar');
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!opened || !item) return;
    setTab('buscar');
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
    const parts = (item.nombre_original || '').split(' ');
    setCreateForm({
      nombre: parts[0] || '',
      apellido_paterno: parts.length > 2 ? parts[parts.length - 2] : parts[1] || '',
      apellido_materno: parts.length > 2 ? parts[parts.length - 1] : '',
      correo_personal: item.correo || '',
      numero_cuenta: item.cuenta || null,
      numero_folio: item.folio || null,
      ingenieria_clave: null,
      periodo,
    });
  }, [opened, item, periodo]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleAsignar = (alumnoId: number) => {
    if (!item) return;
    onAsignar(item.indice, alumnoId);
    onClose();
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      setSearchResults(await buscarAlumno(searchQuery.trim()));
    } catch {
      setError('Error al buscar alumnos');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.nombre || !createForm.apellido_paterno || !createForm.correo_personal) {
      setError('Nombre, apellido paterno y correo son obligatorios');
      return;
    }
    setCreateLoading(true);
    setError(null);
    try {
      const nuevo = await crearAlumnoDiagnostico(createForm);
      handleAsignar(nuevo.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear alumno');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={`Corregir: ${item?.nombre_original || ''}`}
      size="lg"
      centered
    >
      <Stack gap="md">
        {item && (
          <div className={classes.correccionForm}>
            <Text size="xs" c="dimmed"><strong>Email:</strong> {item.correo || '—'}</Text>
            <Text size="xs" c="dimmed"><strong>Cuenta:</strong> {item.cuenta || '—'}</Text>
          </div>
        )}

        {item && item.candidatos.length > 0 && (
          <Stack gap="xs">
            <Text size="sm" fw={600}>Candidatos</Text>
            <div className={classes.scrollTable} style={{ maxHeight: 250 }}>
              <Stack gap={4} p="xs">
                {item.candidatos.map((c) => (
                  <div
                    key={c.alumno_id}
                    className={classes.searchResult}
                    onClick={() => handleAsignar(c.alumno_id)}
                  >
                    <Group justify="space-between" wrap="nowrap" gap="sm">
                      <div className={classes.searchResultName}>
                        {c.nombre}
                        {c.sugerido && (
                          <Badge color="green" variant="light" size="xs" ml={6}>Sugerido</Badge>
                        )}
                      </div>
                      {typeof c.similitud === 'number' && (
                        <Text size="xs" c="dimmed">{c.similitud}%</Text>
                      )}
                    </Group>
                    <div className={classes.searchResultDetail}>
                      {c.cuenta && `Cuenta: ${c.cuenta}`}
                      {c.cuenta && c.correo && ' · '}
                      {c.correo && c.correo}
                      {c.motivo && ` · ${c.motivo}`}
                    </div>
                  </div>
                ))}
              </Stack>
            </div>
          </Stack>
        )}

        <Group gap={0} mb="xs">
          <Button size="xs" variant={tab === 'buscar' ? 'filled' : 'outline'} color="blue" radius={0} onClick={() => setTab('buscar')}>
            Buscar existente
          </Button>
          <Button size="xs" variant={tab === 'crear' ? 'filled' : 'outline'} color="blue" radius={0} onClick={() => setTab('crear')}>
            Crear nuevo
          </Button>
        </Group>

        {tab === 'buscar' && (
          <Stack gap="sm">
            <Group>
              <TextInput
                placeholder="Buscar por nombre, email, cuenta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                style={{ flex: 1 }}
                size="sm"
              />
              <Button size="sm" variant="filled" color="blue" loading={searchLoading} onClick={handleSearch} leftSection={<IconSearch size={14} />}>
                Buscar
              </Button>
            </Group>
            {searchResults.length > 0 && (
              <div className={classes.scrollTable} style={{ maxHeight: 250 }}>
                <Stack gap={4} p="xs">
                  {searchResults.map((r) => (
                    <div key={r.id} className={classes.searchResult} onClick={() => handleAsignar(r.id)}>
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

        {tab === 'crear' && (
          <Stack gap="sm">
            <div className={classes.correccionForm}>
              <TextInput label="Nombre" value={createForm.nombre} onChange={(e) => setCreateForm((p) => ({ ...p, nombre: e.currentTarget.value }))} size="sm" required />
              <TextInput label="Apellido paterno" value={createForm.apellido_paterno} onChange={(e) => setCreateForm((p) => ({ ...p, apellido_paterno: e.currentTarget.value }))} size="sm" required />
              <TextInput label="Apellido materno" value={createForm.apellido_materno} onChange={(e) => setCreateForm((p) => ({ ...p, apellido_materno: e.currentTarget.value }))} size="sm" />
              <TextInput label="Correo personal" value={createForm.correo_personal} onChange={(e) => setCreateForm((p) => ({ ...p, correo_personal: e.currentTarget.value }))} size="sm" required />
              <TextInput label="Nº Cuenta (7 dígitos)" value={createForm.numero_cuenta || ''} onChange={(e) => setCreateForm((p) => ({ ...p, numero_cuenta: e.currentTarget.value || null }))} size="sm" />
              <TextInput label="Nº Folio (9 dígitos)" value={createForm.numero_folio || ''} onChange={(e) => setCreateForm((p) => ({ ...p, numero_folio: e.currentTarget.value || null }))} size="sm" />
              <Select label="Ingeniería" data={INGENIERIA_OPTIONS} value={createForm.ingenieria_clave} onChange={(v) => setCreateForm((p) => ({ ...p, ingenieria_clave: v }))} size="sm" clearable />
              <TextInput label="Periodo" value={createForm.periodo} onChange={(e) => setCreateForm((p) => ({ ...p, periodo: e.currentTarget.value }))} size="sm" />
            </div>
          </Stack>
        )}

        {error && (
          <Alert color="red" variant="light" radius="md" icon={<IconInfoCircle size={16} />}>
            {error}
          </Alert>
        )}

        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={handleClose}>Cancelar</Button>
          {tab === 'crear' && (
            <Button color="green" loading={createLoading} onClick={handleCreate}>Crear y asignar</Button>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}
import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Stack,
  Switch,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconEdit, IconInfoCircle, IconLink, IconPlus, IconTrash } from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';

import {
  actualizarLiga,
  crearLiga,
  eliminarLiga,
  fetchLigasAdmin,
  toggleVisibilidad,
} from '../../lib/ligaApi';
import type { LigaExamenDiagnostico } from '../../types/liga';
import classes from './AdminLigasExamenes.module.css';

type ModalState = 'create' | 'edit' | null;

export default function AdminLigasExamenes() {
  const [items, setItems] = useState<LigaExamenDiagnostico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>(null);
  const [editingItem, setEditingItem] = useState<LigaExamenDiagnostico | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchLigasAdmin();
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

  const form = useForm({
    initialValues: {
      nombre: '',
      url: '',
      descripcion: '',
      orden: 0,
    },
    validate: {
      nombre: (v) => (!v.trim() ? 'Ingresa un nombre' : null),
      url: (v) => {
        if (!v.trim()) return 'Ingresa una URL';
        try {
          new URL(v.trim());
          return null;
        } catch {
          return 'URL inválida';
        }
      },
    },
  });

  const openCreate = () => {
    form.reset();
    setEditingItem(null);
    setModalState('create');
  };

  const openEdit = (item: LigaExamenDiagnostico) => {
    setEditingItem(item);
    form.setValues({
      nombre: item.nombre,
      url: item.url,
      descripcion: item.descripcion ?? '',
      orden: item.orden,
    });
    setModalState('edit');
  };

  const handleSubmit = async () => {
    const errors = form.validate();
    if (errors.hasErrors) return;

    setSubmitting(true);
    try {
      const payload = {
        nombre: form.values.nombre.trim(),
        url: form.values.url.trim(),
        descripcion: form.values.descripcion.trim() || undefined,
        orden: form.values.orden,
      };

      if (modalState === 'edit' && editingItem) {
        await actualizarLiga(editingItem.id, payload);
      } else {
        await crearLiga(payload);
      }

      setModalState(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await toggleVisibilidad(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar visibilidad');
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await eliminarLiga(deleteId);
      setDeleteId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  return (
    <>
      <div className={classes.welcome}>
        <Text component="h1" className={classes.welcomeTitle}>
          Ligas de exámenes
        </Text>
        <Text className={classes.welcomeSubtitle}>
          Administra los enlaces a exámenes que verán los alumnos.
        </Text>
      </div>

      <Card className={classes.card} padding="xl" radius="lg" mt="lg">
        <Stack gap="lg">
          <Group justify="space-between">
            <div>
              <Title order={3} className={classes.title}>
                Enlaces registrados
              </Title>
              <Text className={classes.subtitle}>
                {items.length} liga{items.length !== 1 ? 's' : ''} en total
              </Text>
            </div>
            <Button leftSection={<IconPlus size={16} />} color="indigo" onClick={openCreate}>
              Nueva liga
            </Button>
          </Group>

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
              Cargando ligas...
            </Text>
          ) : items.length === 0 ? (
            <div className={classes.emptyState}>
              <IconLink size={40} color="#667085" stroke={1.5} />
              <Text mt="sm">No hay ligas registradas.</Text>
            </div>
          ) : (
            <div className={classes.scrollTable}>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Nombre</Table.Th>
                    <Table.Th>URL</Table.Th>
                    <Table.Th>Descripción</Table.Th>
                    <Table.Th>Orden</Table.Th>
                    <Table.Th>Visible</Table.Th>
                    <Table.Th>Acciones</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {items.map((item) => (
                    <Table.Tr key={item.id}>
                      <Table.Td fw={500}>{item.nombre}</Table.Td>
                      <Table.Td>
                        <span className={classes.urlCell} title={item.url}>
                          {item.url}
                        </span>
                      </Table.Td>
                      <Table.Td c="dimmed">{item.descripcion ?? '—'}</Table.Td>
                      <Table.Td>{item.orden}</Table.Td>
                      <Table.Td>
                        <Switch
                          size="xs"
                          checked={item.visible}
                          onChange={() => handleToggle(item.id)}
                        />
                      </Table.Td>
                      <Table.Td>
                        <span className={classes.actionsCell}>
                          <ActionIcon variant="subtle" color="blue" onClick={() => openEdit(item)}>
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => setDeleteId(item.id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </span>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </div>
          )}
        </Stack>
      </Card>

      <Modal
        opened={modalState !== null}
        onClose={() => setModalState(null)}
        title={modalState === 'edit' ? 'Editar liga' : 'Nueva liga'}
        size="md"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Nombre del examen"
            placeholder="Ej. Examen Diagnóstico Algebra"
            withAsterisk
            size="md"
            {...form.getInputProps('nombre')}
          />
          <TextInput
            label="URL"
            placeholder="https://ejemplo.com/examen"
            withAsterisk
            size="md"
            {...form.getInputProps('url')}
          />
          <Textarea
            label="Descripción"
            placeholder="Descripción opcional del examen"
            size="md"
            rows={3}
            {...form.getInputProps('descripcion')}
          />
          <NumberInput
            label="Orden"
            description="Para definir el orden de aparición"
            size="md"
            min={0}
            {...form.getInputProps('orden')}
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setModalState(null)}>
              Cancelar
            </Button>
            <Button
              color="indigo"
              loading={submitting}
              onClick={handleSubmit}
              leftSection={modalState === 'edit' ? <IconEdit size={16} /> : <IconPlus size={16} />}
            >
              {modalState === 'edit' ? 'Guardar cambios' : 'Crear liga'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Eliminar liga"
        size="sm"
        centered
      >
        <Stack gap="md">
          <Alert color="red" variant="light" icon={<IconInfoCircle size={18} />}>
            ¿Estás seguro de que deseas eliminar esta liga? Esta acción no se puede deshacer.
          </Alert>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button color="red" onClick={handleDelete} leftSection={<IconTrash size={16} />}>
              Eliminar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

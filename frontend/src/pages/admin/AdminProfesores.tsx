import { Button, Card, Group, SegmentedControl, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconPlus, IconSearch, IconX } from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';

import { usePeriodo } from '../../contexts/PeriodoContext';
import { editarUsuario, fetchProfesores } from '../../lib/usersApi';
import type { Profesor, User } from '../../types';
import { UsuarioModal } from './AdminUsuarios';
import classes from './AdminUsuarios.module.css';

const ACTIVO_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
];

const PAGE_SIZE = 20;

export default function AdminProfesores() {
  const { periodo } = usePeriodo();
  const [items, setItems] = useState<Profesor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activoFilter, setActivoFilter] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [busquedaInput, setBusquedaInput] = useState('');
  const [editando, setEditando] = useState<User | 'nuevo' | null>(null);
  const [cambiandoEstado, setCambiandoEstado] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchProfesores({
        activo: activoFilter === 'true' ? true : activoFilter === 'false' ? false : undefined,
        busqueda: busqueda || undefined,
        periodo,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar profesores');
    } finally {
      setLoading(false);
    }
  }, [page, activoFilter, busqueda, periodo]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = () => {
    setPage(1);
    setBusqueda(busquedaInput);
  };

  const handleClearFilters = () => {
    setActivoFilter('');
    setBusquedaInput('');
    setBusqueda('');
    setPage(1);
  };

  const cambiarEstado = async (p: Profesor) => {
    setCambiandoEstado(p.id);
    setError(null);
    try {
      await editarUsuario(p.id, { activo: !p.activo });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el estado');
    } finally {
      setCambiandoEstado(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div className={classes.welcome}>
        <Text component="h1" className={classes.welcomeTitle}>
          Profesores
        </Text>
        <Text className={classes.welcomeSubtitle}>
          Da de alta las cuentas de los profesores. Cada profesor inicia sesión con su RFC y la contraseña que le
          asignes, y desde su panel sube sus grupos.
        </Text>
      </div>

      <Card className={classes.card} padding="xl" radius="lg" mt="lg">
        <Stack gap="lg">
          <Group justify="space-between" align="flex-start">
            <div>
              <Title order={3} className={classes.title}>
                Cuentas de profesores
              </Title>
              <Text className={classes.subtitle}>Los grupos que se muestran son los del periodo {periodo}.</Text>
            </div>
            <Button leftSection={<IconPlus size={16} />} onClick={() => setEditando('nuevo')}>
              Nuevo profesor
            </Button>
          </Group>

          <div className={classes.filtersRow}>
            <div className={classes.filterGroup}>
              <Text size="sm" fw={600} mb={4}>Estado</Text>
              <SegmentedControl
                data={ACTIVO_OPTIONS}
                value={activoFilter}
                onChange={(v) => { setActivoFilter(v); setPage(1); }}
                size="sm"
              />
            </div>

            <div className={classes.filterGroup} style={{ flex: 2 }}>
              <Text size="sm" fw={600} mb={4}>Buscar</Text>
              <TextInput
                placeholder="Nombre, correo o RFC..."
                value={busquedaInput}
                onChange={(e) => setBusquedaInput(e.currentTarget.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                leftSection={<IconSearch size={16} />}
                size="sm"
              />
            </div>

            <Group gap="sm" className={classes.filterButtons}>
              <Button size="sm" variant="filled" onClick={handleSearch}>
                Buscar
              </Button>
              <Button
                size="sm"
                variant="subtle"
                color="gray"
                leftSection={<IconX size={14} />}
                onClick={handleClearFilters}
              >
                Limpiar
              </Button>
            </Group>
          </div>

          {error && <Text c="red" size="sm">{error}</Text>}

          {loading ? (
            <Text c="dimmed" ta="center" py="xl">Cargando profesores...</Text>
          ) : items.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">
              {busqueda || activoFilter ? 'No se encontraron profesores.' : 'Aún no hay profesores. Da de alta el primero con «Nuevo profesor».'}
            </Text>
          ) : (
            <>
              <div className={classes.scrollTable}>
                <table className={classes.table}>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>RFC (usuario)</th>
                      <th className={classes.hideOnMobile}>Correo</th>
                      <th>Grupos {periodo}</th>
                      <th>Estado</th>
                      <th className={classes.hideOnMobile}>Último acceso</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p) => (
                      <tr key={p.id}>
                        <td>{p.nombre} {p.apellido_paterno} {p.apellido_materno}</td>
                        <td>{p.rfc ?? '—'}</td>
                        <td className={classes.hideOnMobile}>{p.correo_personal ?? '—'}</td>
                        <td>
                          {p.grupos.length === 0 ? (
                            <Text size="sm" c="dimmed">Sin grupos</Text>
                          ) : (
                            p.grupos.map((g) => (
                              <Text key={g.id} size="sm">
                                {g.nombre} · {g.materia} ({g.alumnos} alumnos)
                              </Text>
                            ))
                          )}
                        </td>
                        <td>
                          <span className={`${classes.badge} ${p.activo ? classes.badgeActivo : classes.badgeInactivo}`}>
                            {p.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className={classes.hideOnMobile}>
                          {p.last_login ? new Date(p.last_login).toLocaleDateString('es-MX') : 'Nunca'}
                        </td>
                        <td>
                          <Group gap={4} wrap="nowrap">
                            <Button size="compact-xs" variant="subtle" onClick={() => setEditando(p)}>
                              Editar
                            </Button>
                            <Button
                              size="compact-xs"
                              variant="subtle"
                              color={p.activo ? 'red' : 'green'}
                              loading={cambiandoEstado === p.id}
                              onClick={() => cambiarEstado(p)}
                            >
                              {p.activo ? 'Desactivar' : 'Activar'}
                            </Button>
                          </Group>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={classes.paginationBar}>
                <Text size="sm" c="dimmed">
                  Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} de {total} profesores
                </Text>
                <Group gap="xs">
                  <Button size="xs" variant="default" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>
                    Anterior
                  </Button>
                  <Text size="sm" fw={500}>
                    {page} / {totalPages}
                  </Text>
                  <Button size="xs" variant="default" disabled={page >= totalPages} onClick={() => setPage((n) => n + 1)}>
                    Siguiente
                  </Button>
                </Group>
              </div>
            </>
          )}
        </Stack>
      </Card>

      <UsuarioModal
        usuario={editando}
        rolFijo="profesor"
        onClose={() => setEditando(null)}
        onGuardado={() => {
          setEditando(null);
          load();
        }}
      />
    </>
  );
}

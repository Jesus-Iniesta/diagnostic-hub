import {
  Button,
  Card,
  Group,
  Select,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';

import { fetchUsers } from '../../lib/usersApi';
import type { User } from '../../types';
import classes from './AdminUsuarios.module.css';

const ROLE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'administrador', label: 'Administrador' },
  { value: 'profesor', label: 'Profesor' },
  { value: 'acreditador', label: 'Acreditador' },
  { value: 'alumno', label: 'Alumno' },
];

const ACTIVO_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
];

const ROLE_BADGE: Record<string, string> = {
  administrador: classes.badgeAdmin,
  profesor: classes.badgeProfesor,
  acreditador: classes.badgeAcreditador,
  alumno: classes.badgeAlumno,
};

const PAGE_SIZE = 20;

export default function AdminUsuarios() {
  const [items, setItems] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [roleFilter, setRoleFilter] = useState('');
  const [activoFilter, setActivoFilter] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [busquedaInput, setBusquedaInput] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * PAGE_SIZE;
      const result = await fetchUsers({
        role_name: roleFilter || undefined,
        activo: activoFilter === 'true' ? true : activoFilter === 'false' ? false : undefined,
        busqueda: busqueda || undefined,
        limit: PAGE_SIZE,
        offset,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, activoFilter, busqueda]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = () => {
    setPage(1);
    setBusqueda(busquedaInput);
  };

  const handleClearFilters = () => {
    setRoleFilter('');
    setActivoFilter('');
    setBusquedaInput('');
    setBusqueda('');
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div className={classes.welcome}>
        <Text component="h1" className={classes.welcomeTitle}>
          Usuarios
        </Text>
        <Text className={classes.welcomeSubtitle}>
          Consulta y gestiona los usuarios del sistema.
        </Text>
      </div>

      <Card className={classes.card} padding="xl" radius="lg" mt="lg">
        <Stack gap="lg">
          <div>
            <Title order={3} className={classes.title}>
              Filtros de búsqueda
            </Title>
            <Text className={classes.subtitle}>
              Filtra por rol, estado o texto libre.
            </Text>
          </div>

          <div className={classes.filtersRow}>
            <div className={classes.filterGroup}>
              <Text size="sm" fw={600} mb={4}>Rol</Text>
              <Select
                data={ROLE_OPTIONS}
                value={roleFilter}
                onChange={(v) => { setRoleFilter(v ?? ''); setPage(1); }}
                searchable={false}
                size="sm"
              />
            </div>

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
                placeholder="Nombre, apellido o correo..."
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

          {error && (
            <Text c="red" size="sm">{error}</Text>
          )}

          {loading ? (
            <Text c="dimmed" ta="center" py="xl">Cargando usuarios...</Text>
          ) : items.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">No se encontraron usuarios.</Text>
          ) : (
            <>
              <div className={classes.scrollTable}>
                <table className={classes.table}>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Correo personal</th>
                      <th className={classes.hideOnMobile}>Correo institucional</th>
                      <th>Rol</th>
                      <th className={classes.hideOnMobile}>Auth</th>
                      <th>Estado</th>
                      <th className={classes.hideOnMobile}>Creado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((u) => (
                      <tr key={u.id}>
                        <td>{u.nombre} {u.apellido_paterno} {u.apellido_materno}</td>
                        <td>{u.correo_personal}</td>
                        <td className={classes.hideOnMobile}>{u.correo_institucional ?? '—'}</td>
                        <td>
                          <span className={`${classes.badge} ${ROLE_BADGE[u.role.name] ?? ''}`}>
                            {u.role.name}
                          </span>
                        </td>
                        <td className={classes.hideOnMobile}>{u.auth_method === 'password' ? 'Correo' : 'Nº Cuenta'}</td>
                        <td>
                          <span className={`${classes.badge} ${u.activo ? classes.badgeActivo : classes.badgeInactivo}`}>
                            {u.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className={classes.hideOnMobile}>{new Date(u.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={classes.paginationBar}>
                <Text size="sm" c="dimmed">
                  Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} de {total} usuarios
                </Text>
                <Group gap="xs">
                  <Button
                    size="xs"
                    variant="default"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Anterior
                  </Button>
                  <Text size="sm" fw={500}>
                    {page} / {totalPages}
                  </Text>
                  <Button
                    size="xs"
                    variant="default"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Siguiente
                  </Button>
                </Group>
              </div>
            </>
          )}
        </Stack>
      </Card>
    </>
  );
}

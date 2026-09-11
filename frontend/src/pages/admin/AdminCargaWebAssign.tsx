import {
  Badge,
  Button,
  Card,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconCheck, IconUpload, IconX } from '@tabler/icons-react';
import { useState } from 'react';

import {
  uploadWebAssign,
  type WebAssignUploadResult,
} from '../../lib/webassignApi';
import classes from './AdminCargaAlumnos.module.css';

const CARRERAS = [
  { value: 'ICI', label: 'Ing. Civil (ICI)' },
  { value: 'ICO', label: 'Ing. en Computación (ICO)' },
  { value: 'IEL', label: 'Ing. Electrónica (IEL)' },
  { value: 'IIA', label: 'Ing. en Inteligencia Artificial (IIA)' },
  { value: 'IME', label: 'Ing. Mecánica (IME)' },
  { value: 'ISES', label: 'Ing. Sistemas Energéticos (ISES)' },
];

export default function AdminCargaWebAssign() {
  const [carrera, setCarrera] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState('2026B');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<WebAssignUploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!carrera || !file) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const res = await uploadWebAssign(carrera, periodo, file);
      setResult(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Stack gap="xl">
      <Title order={2}>Carga de Resultados WebAssign</Title>
      <Text c="dimmed">
        Sube los archivos Excel de WebAssign por carrera. Los resultados se guardan en escala de 0 a 10.
      </Text>

      <Card withBorder p="xl">
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <Select
              label="Carrera"
              placeholder="Selecciona carrera"
              data={CARRERAS}
              value={carrera}
              onChange={setCarrera}
              searchable
            />
            <Text size="sm" fw={500}>Periodo</Text>
            <input
              type="text"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className={classes.fileInput}
              style={{ padding: '8px 12px', border: '1px solid #dee2e9', borderRadius: '6px' }}
            />
            <div>
              <Text size="sm" fw={500} mb={4}>Archivo Excel</Text>
              <input
                type="file"
                accept=".xls,.xlsx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className={classes.fileInput}
              />
            </div>
          </SimpleGrid>

          <Group>
            <Button
              leftSection={<IconUpload size={18} />}
              onClick={handleUpload}
              loading={uploading}
              disabled={!carrera || !file}
            >
              Procesar archivo
            </Button>
          </Group>
        </Stack>
      </Card>

      {error && (
        <Card withBorder p="md" style={{ borderColor: 'var(--mantine-color-red-5)' }}>
          <Group>
            <IconX size={20} color="var(--mantine-color-red-6)" />
            <Text c="red">{error}</Text>
          </Group>
        </Card>
      )}

      {result && (
        <Card withBorder p="xl">
          <Stack gap="md">
            <Group>
              <IconCheck size={20} color="var(--mantine-color-green-6)" />
              <Title order={4}>Resultado del procesamiento</Title>
            </Group>

            <SimpleGrid cols={{ base: 2, sm: 4 }}>
              <div>
                <Text size="xs" c="dimmed">Carrera</Text>
                <Text fw={500}>{result.carrera}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">Periodo</Text>
                <Text fw={500}>{result.periodo}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">Total filas</Text>
                <Text fw={500}>{result.total_filas}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">Encontrados</Text>
                <Text fw={500} c="green">{result.encontrados}</Text>
              </div>
            </SimpleGrid>

            {result.no_encontrados > 0 && (
              <Text size="sm" c="orange">
                {result.no_encontrados} alumnos no pudieron ser matcheados
              </Text>
            )}

            {result.resultados.length > 0 && (
              <>
                <Title order={5}>Primeros 10 resultados</Title>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #dee2e9' }}>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Nombre</th>
                        <th style={{ textAlign: 'center', padding: '8px' }}>Carrera</th>
                        <th style={{ textAlign: 'center', padding: '8px' }}>Ál. Trabajo</th>
                        <th style={{ textAlign: 'center', padding: '8px' }}>Ál. Examen</th>
                        <th style={{ textAlign: 'center', padding: '8px' }}>Tr. Trabajo</th>
                        <th style={{ textAlign: 'center', padding: '8px' }}>Tr. Examen</th>
                        <th style={{ textAlign: 'center', padding: '8px' }}>Geo. Trabajo</th>
                        <th style={{ textAlign: 'center', padding: '8px' }}>Geo. Examen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.resultados.slice(0, 10).map((r) => (
                        <tr key={r.alumno_id} style={{ borderBottom: '1px solid #f1f3f5' }}>
                          <td style={{ padding: '6px 8px' }}>{r.nombre_completo}</td>
                          <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                            <Badge size="sm" variant="light">{r.carrera}</Badge>
                          </td>
                          <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                            {r.algebra_trabajo?.toFixed(1) ?? '—'}
                          </td>
                          <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                            {r.algebra_examen?.toFixed(1) ?? '—'}
                          </td>
                          <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                            {r.trigonometria_trabajo?.toFixed(1) ?? '—'}
                          </td>
                          <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                            {r.trigonometria_examen?.toFixed(1) ?? '—'}
                          </td>
                          <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                            {r.geometria_trabajo?.toFixed(1) ?? '—'}
                          </td>
                          <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                            {r.geometria_examen?.toFixed(1) ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Stack>
        </Card>
      )}
    </Stack>
  );
}

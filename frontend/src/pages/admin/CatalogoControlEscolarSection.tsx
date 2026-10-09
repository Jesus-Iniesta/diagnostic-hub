import { Alert, Button, Card, Group, Stack, Text, Title } from '@mantine/core';
import { IconCircleCheck, IconInfoCircle, IconUpload } from '@tabler/icons-react';
import { useState } from 'react';

import { uploadCatalogoControlEscolar } from '../../lib/uploadApi';
import type { ResultadoCatalogo } from '../../types/upload';
import classes from './AdminCargaAlumnos.module.css';

const CAMBIOS: Record<string, string> = {
  nombre: 'Nombre',
  cuenta: 'Cuenta',
  identificadores: 'Correo/cuenta nuevos',
};

export default function CatalogoControlEscolarSection() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ResultadoCatalogo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await uploadCatalogoControlEscolar(file));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al subir el archivo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className={classes.card} padding="xl" radius="lg" mt="lg">
      <Stack gap="lg">
        <div>
          <Title order={3} className={classes.title}>
            Catálogo de Control Escolar
          </Title>
          <Text className={classes.subtitle}>
            Sube el CREANI con la hoja &quot;Datos catalogo&quot;. Completa la cuenta, el
            nombre y los correos de los alumnos que ya existen; los busca solo por correo o
            número de cuenta y no crea alumnos nuevos.
          </Text>
        </div>

        <Group align="flex-end">
          <div>
            <Text size="sm" fw={500} mb={4}>Archivo Excel</Text>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className={classes.fileInput}
            />
          </div>
          <Button
            leftSection={<IconUpload size={18} />}
            onClick={handleUpload}
            loading={uploading}
            disabled={!file}
          >
            Procesar catálogo
          </Button>
        </Group>

        {error && (
          <Alert color="red" variant="light" radius="md" icon={<IconInfoCircle size={18} />}>
            {error}
          </Alert>
        )}

        {result && (
          <Stack gap="lg">
            <Alert color="green" variant="light" radius="md" icon={<IconCircleCheck size={18} />}>
              Catálogo procesado: {result.total_filas} filas.
            </Alert>

            <div className={classes.statsRow}>
              <div className={`${classes.statBox} ${classes.statBoxGreen}`}>
                <div className={classes.statNumber}>{result.actualizados}</div>
                <div className={classes.statLabel}>Actualizados</div>
              </div>
              <div className={`${classes.statBox} ${classes.statBoxGray}`}>
                <div className={classes.statNumber}>{result.sin_cambios}</div>
                <div className={classes.statLabel}>Sin cambios</div>
              </div>
              <div className={`${classes.statBox} ${classes.statBoxYellow}`}>
                <div className={classes.statNumber}>{result.no_encontrados}</div>
                <div className={classes.statLabel}>No encontrados</div>
              </div>
              <div className={`${classes.statBox} ${classes.statBoxRed}`}>
                <div className={classes.statNumber}>{result.conflictos.length}</div>
                <div className={classes.statLabel}>Conflictos</div>
              </div>
            </div>

            {result.conflictos.length > 0 && (
              <>
                <Title order={5}>Conflictos (no se cambió nada)</Title>
                <div className={classes.scrollTable}>
                  <table className={classes.table}>
                    <thead>
                      <tr>
                        <th>Fila</th>
                        <th>Nombre en el catálogo</th>
                        <th>Dato → alumno registrado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.conflictos.map((c) => (
                        <tr key={c.fila}>
                          <td>{c.fila}</td>
                          <td>{c.nombre}</td>
                          <td className={classes.wrapCell}>
                            {c.alumnos.map((a) => (
                              <div key={a.dato}>
                                {a.dato} → {a.nombre || `alumno ${a.alumno_id}`}
                              </div>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {result.conflictos_identificadores.length > 0 && (
              <Text size="sm" c="orange">
                {result.conflictos_identificadores.length} correos o cuentas no se guardaron
                porque ya son de otro alumno o el alumno ya tiene otra cuenta.
              </Text>
            )}

            {result.actualizados_detalle.length > 0 && (
              <>
                <Title order={5}>Actualizados</Title>
                <div className={classes.scrollTable}>
                  <table className={classes.table}>
                    <thead>
                      <tr>
                        <th>Fila</th>
                        <th>Alumno</th>
                        <th>Cambios</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.actualizados_detalle.map((a) => (
                        <tr key={a.fila}>
                          <td>{a.fila}</td>
                          <td>
                            {a.nombre}
                            {a.provisional && ' (provisional)'}
                          </td>
                          <td>{a.cambios.map((c) => CAMBIOS[c] ?? c).join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {result.no_encontrados_detalle.length > 0 && (
              <>
                <Title order={5}>No encontrados (no se crearon)</Title>
                <div className={classes.scrollTable}>
                  <table className={classes.table}>
                    <thead>
                      <tr>
                        <th>Fila</th>
                        <th>Nombre</th>
                        <th>Correo</th>
                        <th>Nº Cuenta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.no_encontrados_detalle.map((n) => (
                        <tr key={n.fila}>
                          <td>{n.fila}</td>
                          <td>{n.nombre}</td>
                          <td className={classes.wrapCell}>{n.correos.join(', ')}</td>
                          <td>{n.cuenta ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}

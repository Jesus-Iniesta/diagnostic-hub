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
  TextInput,
  Textarea,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { IconAlertTriangle, IconCircleCheck, IconPlus, IconTrash } from '@tabler/icons-react';
import { Fragment, useEffect, useMemo, useState } from 'react';

import { usePeriodo } from '../../contexts/PeriodoContext';
import { fetchIndiceFi, guardarIndiceFi } from '../../lib/configuracionApi';
import type { CategoriaIndice, ComponenteIndice, ConfigIndiceFi } from '../../lib/configuracionApi';
import classes from './AdminConfiguracion.module.css';

type Numero = number | '';

interface CategoriaForm {
  /** Solo para la key de React. */
  id: number;
  nombre: string;
  minimo: Numero;
  maximo: Numero;
  comentario: string;
}

const COMPONENTES: { key: ComponenteIndice; label: string }[] = [
  { key: 'asistencia', label: 'Asistencia' },
  { key: 'diagnostico', label: 'Examen diagnóstico' },
  { key: 'webassign', label: 'WebAssign' },
  { key: 'final', label: 'Examen final' },
];

// Tolerancia para comparar decimales (igual que en el backend).
const EPS = 1e-6;

let siguienteId = 1;

function aForm(c: CategoriaIndice): CategoriaForm {
  return { id: siguienteId++, ...c };
}

/** 9 -> '9.0', 8.9 -> '8.9', 2.25 -> '2.25' (igual que fmt_num del backend). */
function fmt(valor: number): string {
  const texto = valor.toFixed(2);
  return texto.endsWith('0') ? texto.slice(0, -1) : texto;
}

/** 10 -> '10', 2.5 -> '2.5'. */
function fmtValor(valor: number): string {
  return String(Number(valor.toFixed(2)));
}

/** Componentes que cuentan para el índice (la asistencia solo si se usa). */
function activos(usarAsistencia: boolean) {
  return COMPONENTES.filter(({ key }) => usarAsistencia || key !== 'asistencia');
}

/** Mismas reglas que indice_fi_service.validar_config. */
function validar(
  valores: Record<ComponenteIndice, Numero>,
  categorias: CategoriaForm[],
  usarAsistencia: boolean,
): { generales: string[]; porCategoria: Map<number, string[]> } {
  const generales: string[] = [];
  const porCategoria = new Map<number, string[]>();
  const agregar = (i: number, msg: string) => {
    porCategoria.set(i, [...(porCategoria.get(i) ?? []), msg]);
  };

  const nums = activos(usarAsistencia).map(({ key }) => valores[key]);
  if (nums.some((v) => v === '')) {
    generales.push('Escribe el valor de cada componente.');
  } else if (nums.some((v) => (v as number) < 0)) {
    generales.push('Los valores de los componentes no pueden ser negativos.');
  }
  const maximo = generales.length ? 0 : nums.reduce<number>((a, v) => a + (v as number), 0);
  if (!generales.length && maximo <= 0) {
    generales.push('La suma de los valores de los componentes debe ser mayor que 0.');
  }

  if (!categorias.length) {
    generales.push('Agrega al menos una categoría.');
    return { generales, porCategoria };
  }

  categorias.forEach((c, i) => {
    if (!c.nombre.trim()) agregar(i, 'Escribe el nombre de la categoría.');
    if (c.minimo === '' || c.maximo === '') {
      agregar(i, 'Escribe el valor mínimo y el máximo.');
    } else if (c.minimo > c.maximo + EPS) {
      agregar(i, 'El valor mínimo es mayor que el máximo.');
    }
  });

  // Las incompletas o con mínimo > máximo ya llevan su alerta; fuera de la cadena.
  const orden = categorias
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.minimo !== '' && c.maximo !== '' && c.minimo <= c.maximo + EPS)
    .sort((a, b) => (a.c.minimo as number) - (b.c.minimo as number) || a.i - b.i);
  if (!orden.length) return { generales, porCategoria };

  for (let k = 1; k < orden.length; k++) {
    const prev = orden[k - 1].c;
    const { c, i } = orden[k];
    const prevMin = prev.minimo as number;
    const prevMax = prev.maximo as number;
    const esperado = Math.round((prevMax + 0.1) * 10000) / 10000;
    const nombrePrev = prev.nombre.trim() || 'la categoría anterior';
    if ((c.minimo as number) <= prevMax + EPS) {
      agregar(
        i,
        `Se encima con «${nombrePrev}» (${fmt(prevMin)}–${fmt(prevMax)}): el mínimo debe ser ${fmt(esperado)}.`,
      );
    } else if (Math.abs((c.minimo as number) - esperado) > EPS) {
      agregar(
        i,
        `Hay un hueco después de «${nombrePrev}» (termina en ${fmt(prevMax)}): el mínimo debe ser ${fmt(esperado)}.`,
      );
    }
  }

  const primera = orden[0];
  if (Math.abs(primera.c.minimo as number) > EPS) {
    agregar(primera.i, 'La categoría más baja debe empezar en 0.');
  }
  const ultima = orden.reduce((a, b) => ((b.c.maximo as number) >= (a.c.maximo as number) ? b : a));
  if (maximo > 0 && Math.abs((ultima.c.maximo as number) - maximo) > EPS) {
    agregar(ultima.i, `La categoría más alta debe terminar en ${fmt(maximo)} (el máximo del índice).`);
  }

  return { generales, porCategoria };
}

export default function IndiceFiSection() {
  const { periodo } = usePeriodo();
  const [config, setConfig] = useState<ConfigIndiceFi | null>(null);
  const [valores, setValores] = useState<Record<ComponenteIndice, Numero>>({
    asistencia: '',
    diagnostico: '',
    webassign: '',
    final: '',
  });
  const [categorias, setCategorias] = useState<CategoriaForm[]>([]);
  const [usarAsistencia, setUsarAsistencia] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Categoría cuyo comentario se está editando en el modal.
  const [comentarioId, setComentarioId] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    setCargando(true);
    setGuardado(false);
    setError(null);
    fetchIndiceFi(periodo)
      .then((data) => {
        if (!mounted) return;
        setConfig(data);
        setValores(data.valores);
        setCategorias(data.categorias.map(aForm));
        setUsarAsistencia(data.usar_asistencia);
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : 'No se pudo consultar el índice.');
      })
      .finally(() => {
        if (mounted) setCargando(false);
      });
    return () => {
      mounted = false;
    };
  }, [periodo]);

  const { generales, porCategoria } = useMemo(
    () => validar(valores, categorias, usarAsistencia),
    [valores, categorias, usarAsistencia],
  );
  const hayErrores = generales.length > 0 || porCategoria.size > 0;

  const maximo = activos(usarAsistencia).reduce(
    (a, { key }) => a + (valores[key] === '' ? 0 : (valores[key] as number)),
    0,
  );

  const cambiar = () => setGuardado(false);

  const setValor = (key: ComponenteIndice, v: string | number) => {
    cambiar();
    setValores((prev) => ({ ...prev, [key]: v === '' ? '' : Number(v) }));
  };

  const setCategoria = (id: number, cambios: Partial<CategoriaForm>) => {
    cambiar();
    setCategorias((prev) => prev.map((c) => (c.id === id ? { ...c, ...cambios } : c)));
  };

  const agregarCategoria = () => {
    cambiar();
    setCategorias((prev) => [
      ...prev,
      { id: siguienteId++, nombre: '', minimo: '', maximo: '', comentario: '' },
    ]);
  };

  const quitarCategoria = (id: number) => {
    cambiar();
    setCategorias((prev) => prev.filter((c) => c.id !== id));
  };

  const handleGuardar = async () => {
    if (hayErrores) return;
    setError(null);
    setGuardado(false);
    setGuardando(true);
    try {
      const data = await guardarIndiceFi({
        periodo,
        valores: valores as Record<ComponenteIndice, number>,
        categorias: categorias.map(({ nombre, minimo, maximo: max, comentario }) => ({
          nombre: nombre.trim(),
          minimo: minimo as number,
          maximo: max as number,
          comentario,
        })),
        usar_asistencia: usarAsistencia,
      });
      setConfig(data);
      setGuardado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los cambios');
    } finally {
      setGuardando(false);
    }
  };

  const editando = categorias.find((c) => c.id === comentarioId) ?? null;

  return (
    <>
      <Card className={classes.card} padding="lg" radius="lg">
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="xs">
          <div>
            <Title order={4} className={classes.title}>
              Índice FI UAEMex · periodo {periodo}
            </Title>
            <Text className={classes.fieldHelp}>
              Se usa en el CREANI y en la carta de recomendación del alumno.
            </Text>
          </div>
          {(config?.heredado_de || config?.es_default) && (
            <Text className={classes.aviso}>
              {config.heredado_de
                ? `Sin valores propios: se muestran los de ${config.heredado_de}.`
                : 'Se muestran los valores por defecto.'}{' '}
              Al guardar quedan para {periodo}.
            </Text>
          )}
        </Group>

        <Group align="flex-end" gap="sm" mt="md" wrap="wrap">
          <Switch
            label="Usar asistencia"
            checked={usarAsistencia}
            onChange={(e) => {
              cambiar();
              setUsarAsistencia(e.currentTarget.checked);
            }}
            disabled={cargando}
            className={classes.switchAsistencia}
            title="Apagado: la asistencia vale 0 y no cuenta para el máximo. En el CREANI la columna sale vacía."
          />
          {COMPONENTES.map(({ key, label }) => (
            <NumberInput
              key={key}
              label={label}
              // Sin asistencia se ve 0; el valor guardado no cambia.
              value={key === 'asistencia' && !usarAsistencia ? 0 : valores[key]}
              onChange={(v) => setValor(key, v)}
              min={0}
              step={0.5}
              decimalScale={2}
              size="sm"
              w={130}
              disabled={cargando || (key === 'asistencia' && !usarAsistencia)}
            />
          ))}
          <Text className={classes.indiceMaximo}>Índice sobre {fmtValor(maximo)}</Text>
        </Group>

        <Text className={classes.fieldLabel} mt="lg">
          Categorías
        </Text>
        <Text className={classes.fieldHelp}>
          Cada una empieza 0.1 arriba del máximo de la anterior y entre todas cubren de 0 a{' '}
          {fmtValor(maximo)}. El comentario aparece en la carta del alumno; da clic para editarlo.
        </Text>

        <Table.ScrollContainer minWidth={720} mt="xs">
          <Table verticalSpacing={6} className={classes.tablaCategorias}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={190}>Nombre</Table.Th>
                <Table.Th w={120}>Mínimo</Table.Th>
                <Table.Th w={120}>Máximo</Table.Th>
                <Table.Th>Comentario</Table.Th>
                <Table.Th w={44} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {categorias.map((c, i) => {
                const errores = porCategoria.get(i);
                return (
                  <Fragment key={c.id}>
                    <Table.Tr className={errores ? classes.filaError : undefined}>
                      <Table.Td>
                        <TextInput
                          size="xs"
                          value={c.nombre}
                          onChange={(e) => setCategoria(c.id, { nombre: e.currentTarget.value })}
                          disabled={cargando}
                          aria-label="Nombre de la categoría"
                        />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          size="xs"
                          value={c.minimo}
                          onChange={(v) => setCategoria(c.id, { minimo: v === '' ? '' : Number(v) })}
                          min={0}
                          step={0.1}
                          decimalScale={2}
                          disabled={cargando}
                          aria-label={`Mínimo de ${c.nombre || 'la categoría'}`}
                        />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          size="xs"
                          value={c.maximo}
                          onChange={(v) => setCategoria(c.id, { maximo: v === '' ? '' : Number(v) })}
                          min={0}
                          step={0.1}
                          decimalScale={2}
                          disabled={cargando}
                          aria-label={`Máximo de ${c.nombre || 'la categoría'}`}
                        />
                      </Table.Td>
                      <Table.Td>
                        <UnstyledButton
                          className={classes.comentario}
                          onClick={() => setComentarioId(c.id)}
                          disabled={cargando}
                          title="Editar comentario"
                        >
                          {c.comentario.trim() ? (
                            c.comentario
                          ) : (
                            <span className={classes.sinComentario}>Sin comentario</span>
                          )}
                        </UnstyledButton>
                      </Table.Td>
                      <Table.Td>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          aria-label={`Quitar la categoría ${c.nombre || i + 1}`}
                          onClick={() => quitarCategoria(c.id)}
                          disabled={cargando}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                    {errores && (
                      <Table.Tr className={classes.filaAlerta}>
                        <Table.Td colSpan={5}>
                          <Alert
                            color="red"
                            variant="light"
                            radius="md"
                            py={6}
                            icon={<IconAlertTriangle size={16} aria-hidden="true" />}
                          >
                            {errores.map((msg) => (
                              <div key={msg}>{msg}</div>
                            ))}
                          </Alert>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Fragment>
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        <Button
          variant="light"
          size="xs"
          leftSection={<IconPlus size={16} />}
          onClick={agregarCategoria}
          disabled={cargando}
          mt="sm"
        >
          Agregar categoría
        </Button>

        {generales.length > 0 && (
          <Alert color="red" variant="light" radius="md" mt="sm" py="xs">
            {generales.map((msg) => (
              <div key={msg}>{msg}</div>
            ))}
          </Alert>
        )}

        {error && (
          <Alert color="red" variant="light" radius="md" mt="sm" py="xs">
            {error}
          </Alert>
        )}
      </Card>

      {/* Fijo abajo a la derecha para no tener que bajar hasta el final. */}
      <Group gap="sm" className={classes.barraGuardar} wrap="nowrap">
        {guardado && (
          <Text className={classes.guardado}>
            <IconCircleCheck size={14} aria-hidden="true" /> Guardado
          </Text>
        )}
        {hayErrores && !cargando && (
          <Text size="xs" c="red">
            Corrige las alertas para guardar
          </Text>
        )}
        <Button
          color="indigo"
          loading={guardando}
          disabled={cargando || hayErrores}
          onClick={handleGuardar}
        >
          Guardar índice
        </Button>
      </Group>

      <Modal
        opened={editando !== null}
        onClose={() => setComentarioId(null)}
        title={`Comentario de «${editando?.nombre.trim() || 'la categoría'}»`}
        centered
        size="lg"
      >
        {editando && (
          <Stack gap="md">
            <Textarea
              value={editando.comentario}
              onChange={(e) => setCategoria(editando.id, { comentario: e.currentTarget.value })}
              autosize
              minRows={4}
              maxRows={12}
              data-autofocus
              description="Aparece en la carta de recomendación de los alumnos de esta categoría."
            />
            <Group justify="flex-end">
              <Button color="indigo" onClick={() => setComentarioId(null)}>
                Listo
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  );
}

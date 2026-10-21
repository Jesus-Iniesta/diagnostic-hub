import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Group,
  NumberInput,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { IconAlertTriangle, IconCircleCheck, IconPlus, IconTrash } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';

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

  return (
    <Card className={`${classes.card} ${classes.cardAncha}`} padding="xl" radius="lg" mt="lg">
      <Stack gap="lg">
        <div>
          <Title order={3} className={classes.title}>
            Índice FI UAEMex
          </Title>
          <Text className={classes.subtitle}>
            Valor de cada componente y categorías del índice para el periodo {periodo}. Se usan en
            el CREANI y en la carta de recomendación del alumno.
          </Text>
        </div>

        {config?.heredado_de && (
          <Alert color="blue" variant="light" radius="md">
            El periodo {periodo} aún no tiene valores propios: se muestran los de {config.heredado_de}.
            Al guardar quedan registrados para {periodo}.
          </Alert>
        )}
        {config?.es_default && (
          <Alert color="blue" variant="light" radius="md">
            Se muestran los valores por defecto. Al guardar quedan registrados para {periodo}.
          </Alert>
        )}

        <div>
          <Text className={classes.fieldLabel} mb="xs">
            Valor de cada componente
          </Text>
          <Switch
            label="Usar asistencia"
            description="Apagado: la asistencia vale 0 y no cuenta para el máximo del índice. La columna sigue saliendo vacía en el CREANI."
            checked={usarAsistencia}
            onChange={(e) => {
              cambiar();
              setUsarAsistencia(e.currentTarget.checked);
            }}
            disabled={cargando}
            mb="md"
          />
          <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="md">
            {COMPONENTES.map(({ key, label }) => (
              <NumberInput
                key={key}
                label={label}
                value={valores[key]}
                onChange={(v) => setValor(key, v)}
                min={0}
                step={0.5}
                decimalScale={2}
                disabled={cargando || (key === 'asistencia' && !usarAsistencia)}
              />
            ))}
          </SimpleGrid>
          <Text className={classes.indiceMaximo} mt="sm">
            Índice sobre {fmtValor(maximo)}
          </Text>
        </div>

        <div>
          <Text className={classes.fieldLabel}>Categorías</Text>
          <Text className={classes.fieldHelp}>
            Cada categoría debe empezar 0.1 arriba del máximo de la anterior, y entre todas deben
            cubrir de 0 a {fmtValor(maximo)}. El comentario aparece en la carta del alumno.
          </Text>
        </div>

        <Stack gap="md">
          {categorias.map((c, i) => {
            const errores = porCategoria.get(i);
            return (
              <div
                key={c.id}
                className={`${classes.categoria} ${errores ? classes.categoriaError : ''}`}
              >
                <Group align="flex-end" gap="sm" wrap="wrap">
                  <TextInput
                    label="Nombre"
                    value={c.nombre}
                    onChange={(e) => setCategoria(c.id, { nombre: e.currentTarget.value })}
                    style={{ flex: '1 1 180px' }}
                    disabled={cargando}
                  />
                  <NumberInput
                    label="Mínimo"
                    value={c.minimo}
                    onChange={(v) => setCategoria(c.id, { minimo: v === '' ? '' : Number(v) })}
                    min={0}
                    step={0.1}
                    decimalScale={2}
                    style={{ width: 110 }}
                    disabled={cargando}
                  />
                  <NumberInput
                    label="Máximo"
                    value={c.maximo}
                    onChange={(v) => setCategoria(c.id, { maximo: v === '' ? '' : Number(v) })}
                    min={0}
                    step={0.1}
                    decimalScale={2}
                    style={{ width: 110 }}
                    disabled={cargando}
                  />
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="lg"
                    mb={2}
                    aria-label={`Quitar la categoría ${c.nombre || i + 1}`}
                    onClick={() => quitarCategoria(c.id)}
                    disabled={cargando}
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Group>
                <Textarea
                  label="Comentario para la carta del alumno"
                  value={c.comentario}
                  onChange={(e) => setCategoria(c.id, { comentario: e.currentTarget.value })}
                  autosize
                  minRows={2}
                  maxRows={8}
                  mt="sm"
                  disabled={cargando}
                />
                {errores && (
                  <Alert
                    color="red"
                    variant="light"
                    radius="md"
                    mt="sm"
                    icon={<IconAlertTriangle size={18} aria-hidden="true" />}
                  >
                    {errores.map((msg) => (
                      <div key={msg}>{msg}</div>
                    ))}
                  </Alert>
                )}
              </div>
            );
          })}
        </Stack>

        <Button
          variant="light"
          leftSection={<IconPlus size={18} />}
          onClick={agregarCategoria}
          disabled={cargando}
          className={classes.addButton}
        >
          Agregar categoría
        </Button>

        {generales.length > 0 && (
          <Alert color="red" variant="light" radius="md">
            {generales.map((msg) => (
              <div key={msg}>{msg}</div>
            ))}
          </Alert>
        )}

        {guardado && (
          <Alert
            color="green"
            variant="light"
            radius="md"
            icon={<IconCircleCheck size={18} aria-hidden="true" />}
          >
            Los cambios se guardaron correctamente.
          </Alert>
        )}

        {error && (
          <Alert color="red" variant="light" radius="md">
            {error}
          </Alert>
        )}

        {hayErrores && !cargando && (
          <Text className={classes.fieldHelp}>Corrige las alertas para poder guardar.</Text>
        )}

        <Button
          size="md"
          color="indigo"
          className={classes.submitButton}
          loading={guardando}
          disabled={cargando || hayErrores}
          onClick={handleGuardar}
        >
          Guardar índice
        </Button>
      </Stack>
    </Card>
  );
}

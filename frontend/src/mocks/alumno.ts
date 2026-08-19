import type { AlumnoPerfil, DatosContacto, ResultadoAlumno } from '../types/alumno';

/**
 * Datos simulados del módulo de alumno.
 *
 * Separación mock/real:
 * - `alumnoPerfilMock`: información que en producción proviene de `GET /alumnos/me`
 *   (se identifica al alumno por número de cuenta).
 * - `contactoInicialMock`: datos de contacto precargados. En producción se leen de
 *   `User.correo_personal` (WebAssign) y `User.correo_institucional` vía `/auth/me`.
 * - `resultadoMock`: puntaje y retroalimentación que en producción provienen de
 *   `IntentoPresentacion` + `FeedbackResultado`.
 */

export const alumnoPerfilMock: AlumnoPerfil = {
  numero_cuenta: '1724300',
  nombre_completo: 'Alumno Demo Integrativa',
  licenciatura: 'Ingeniería en Computación',
  grupo: null,
};

export const contactoInicialMock: DatosContacto = {
  correo_webassign: '',
  correo_institucional: null,
};

export const resultadoMock: ResultadoAlumno = {
  puntaje: 7.8,
  nivel: 'Medio',
  retroalimentacion:
    'Buen desempeño general. Se recomienda reforzar los temas de álgebra para mejorar ' +
    'tu rendimiento en los siguientes módulos.',
};
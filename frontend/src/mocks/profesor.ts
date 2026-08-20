import type { AlumnoGrupo } from '../types/profesor';

/**
 * Datos simulados del módulo de profesor.
 *
 * Separación mock/real:
 * - `alumnosGrupoMock`: alumnos que en producción provienen del cruce entre el
 *   Excel de Control Escolar y TutoNet (endpoint pendiente por grupo).
 * - El resumen del grupo se calcula a partir de esta lista en `profesorApi`.
 */

export const alumnosGrupoMock: AlumnoGrupo[] = [
  {
    id: '1',
    nombre: 'María Fernanda López García',
    numero_cuenta: '1724300',
    licenciatura: 'Ingeniería en Computación',
    grupo: 'ICO-1',
    puntaje: 7.8,
    nivel: 'Medio',
    retroalimentacion:
      'Buen desempeño general. Se recomienda reforzar los temas de álgebra para mejorar tu rendimiento en los siguientes módulos.',
  },
  {
    id: '2',
    nombre: 'José Antonio Ramírez Torres',
    numero_cuenta: '1724301',
    licenciatura: 'Ingeniería en Computación',
    grupo: 'ICO-1',
    puntaje: 9.2,
    nivel: 'Alto',
    retroalimentacion:
      'Excelente desempeño. Mantén tu ritmo de estudio y apoya a tus compañeros en los temas de trigonometría.',
  },
  {
    id: '3',
    nombre: 'Ana Sofía Martínez Cruz',
    numero_cuenta: '1724302',
    licenciatura: 'Ingeniería en Computación',
    grupo: 'ICO-1',
    puntaje: 6.1,
    nivel: 'Bajo',
    retroalimentacion:
      'Se recomienda un repaso general de los fundamentos de álgebra y geometría antes de continuar.',
  },
  {
    id: '4',
    nombre: 'Carlos Daniel Hernández Ruiz',
    numero_cuenta: '1724303',
    licenciatura: 'Ingeniería en Computación',
    grupo: 'ICO-1',
    puntaje: 8.5,
    nivel: 'Alto',
    retroalimentacion:
      'Muy buen desempeño. Refuerza tus habilidades de cálculo para consolidar tu nivel.',
  },
  {
    id: '5',
    nombre: 'Valeria Guadalupe Sánchez Díaz',
    numero_cuenta: '1724304',
    licenciatura: 'Ingeniería en Computación',
    grupo: 'ICO-1',
    puntaje: 7.1,
    nivel: 'Medio',
    retroalimentacion:
      'Desempeño adecuado. Se sugiere practicar ejercicios de geometría analítica.',
  },
  {
    id: '6',
    nombre: 'Diego Alejandro Gómez Pérez',
    numero_cuenta: '1724305',
    licenciatura: 'Ingeniería en Computación',
    grupo: 'ICO-1',
    puntaje: 5.9,
    nivel: 'Bajo',
    retroalimentacion:
      'Se recomienda atención personalizada en los módulos de álgebra y cálculo.',
  },
];
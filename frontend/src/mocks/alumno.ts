import type { AlumnoPerfil, ResultadoAlumno } from '../types/alumno';

export const alumnoPerfilMock: AlumnoPerfil = {
  id: 1,
  numero_cuenta: '1724300',
  numero_folio: null,
  periodo_ingreso: '2025A',
  promedio_bachillerato: 8.5,
  indice_uaem: null,
  lugar_admision: null,
  escuela_procedencia: null,
  tiene_internet: true,
  tiene_computadora: true,
  vulnerabilidad_economica: null,
  es_foraneo: false,
  convivencia: null,
  created_at: '2025-08-01T00:00:00',
  usuario: {
    id: 1,
    nombre: 'Alumno',
    apellido_paterno: 'Demo',
    apellido_materno: 'Integrativa',
    correo_personal: 'alumno@demo.com',
    correo_institucional: null,
    rfc: null,
    auth_method: 'numero_cuenta',
    activo: true,
    role: { id: 4, name: 'alumno' },
  },
  ingenieria: { id: 1, nombre: 'Ingeniería en Computación', clave: 'ICO' },
};

export const resultadoMock: ResultadoAlumno = {
  puntaje: 7.8,
  nivel: 'Medio',
  retroalimentacion:
    'Buen desempeño general. Se recomienda reforzar los temas de álgebra para mejorar ' +
    'tu rendimiento en los siguientes módulos.',
};

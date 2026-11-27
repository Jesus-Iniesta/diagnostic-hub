export const ROLE_HOME: Record<string, string> = {
  administrador: '/admin',
  profesor: '/profesor',
  acreditador: '/acreditador',
  alumno: '/alumno',
};

/** Pantalla de inicio de sesión; el backend solo deja entrar a los roles de cada una. */
export type Portal = 'alumno' | 'profesor' | 'institucional';

export function roleHome(roleName?: string | null): string {
  return (roleName && ROLE_HOME[roleName]) || '/';
}
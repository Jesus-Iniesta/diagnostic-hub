export const ROLE_HOME: Record<string, string> = {
  administrador: '/admin',
  profesor: '/profesor',
  acreditador: '/acreditador',
  alumno: '/alumno',
};

export function roleHome(roleName?: string | null): string {
  return (roleName && ROLE_HOME[roleName]) || '/';
}
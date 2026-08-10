export interface Permission {
  id: number;
  name: string;
  description: string | null;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  permissions: Permission[];
}

export interface User {
  id: number;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  correo_personal: string;
  correo_institucional: string | null;
  rfc: string | null;
  auth_method: 'password' | 'numero_cuenta';
  activo: boolean;
  role_id: number;
  role: Role;
}

export interface Token {
  access_token: string;
  token_type: string;
}
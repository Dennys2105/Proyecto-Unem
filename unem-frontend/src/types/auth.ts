export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface ApiError {
  detail: string | { msg: string; loc: string[]; type: string }[];
  status_code?: number;
}

export interface AuthBlockState {
  isBlocked: boolean;
  unblockTime: number | null;
}

export interface Usuario {
  id_usu: number;
  username: string;
  id_rol: number;
  estatus: string;
  creado: string;
  actualizar: string;
}

export interface Credenciales {
  id_cre: number;
  id_usu: number;
  ultimo_acceso: string | null;
  intentos_fallidos: number | null;
  bloqueado_hasta: string | null;
}
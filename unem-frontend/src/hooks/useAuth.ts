import { useMemo } from 'react';

interface TokenPayload {
  sub?: string;
  username?: string;
  id?: number;
  id_usu?: number;
  rol?: number;
  id_rol?: number;
  email?: string | null;
  scopes?: Record<string, any>;
  exp?: number;
}

const ORDEN_ALCANCE: Record<string, number> = { NAD: 0, SP: 1, LIM: 2, TODO: 3 };

const getRawToken = (): string | null => {
  return (
    sessionStorage.getItem('unem_token') ||
    sessionStorage.getItem('token') ||
    sessionStorage.getItem('access_token') ||
    localStorage.getItem('unem_token') ||
    localStorage.getItem('token') ||
    null
  );
};

const decodeJwt = (token: string): TokenPayload | null => {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

export const useAuth = () => {
  const payload = useMemo<TokenPayload | null>(() => {
    const token = getRawToken();
    if (!token) return null;
    return decodeJwt(token);
  }, []);

  // ⚠️ CLAVE: El backend envía 'rol' (no 'id_rol') e 'id' (no 'id_usu')
  const idRol = payload?.rol ?? payload?.id_rol ?? null;
  const idUsuario = payload?.id ?? payload?.id_usu ?? null;
  const username = payload?.sub || payload?.username || null;

  // Si no podemos leer el rol, mostrar todo (fallback seguro)
  const rolDesconocido = idRol === null;
  const esAdmin = rolDesconocido ? true : idRol === 1;
  const scopes = payload?.scopes ?? {};

  /** ¿Tiene al menos el alcance mínimo sobre (modulo, accion)? ADMIN siempre sí. */
  const puede = (modulo: string, accion: string = 'LEC', minimo: string = 'SP'): boolean => {
    if (esAdmin) return true;
    const alcance = String(scopes[`${modulo}:${accion}`] ?? 'NAD');
    return (ORDEN_ALCANCE[alcance] ?? 0) >= (ORDEN_ALCANCE[minimo] ?? 1);
  };

  return {
    payload,
    idRol,
    idUsuario,
    username,
    email: payload?.email ?? null,
    scopes,
    rolDesconocido,
    esAdmin,
    esVicerrector: idRol === 2,
    esCoordinador: idRol === 3,
    esDocente: idRol === 4,
    esEstudiante: idRol === 5,
    puede,
  };
};
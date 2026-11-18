import api from '../lib/axios';

/* ===== Tipos espejo del backend (audit_report_service.py v5.4) ===== */
export interface TotalesDiario {
  total_movimientos: number; inserciones: number; actualizaciones: number;
  eliminaciones: number; sin_autor: number; usuarios_activos: number; ips_distintas: number;
}
export interface AccesosDiario { logins_exitosos: number; intentos_fallidos: number; cuentas_bloqueadas: number }
export interface ReporteDiario {
  fecha: string;
  totales: TotalesDiario;
  por_tabla: { tabla: string; movimientos: number }[];
  por_usuario: { usuario: string; movimientos: number }[];
  por_hora: { hora: number; movimientos: number }[];
  accesos: AccesosDiario;
}

export type Severidad = 'alta' | 'media' | 'baja';
export interface Anomalia {
  tipo: string; severidad: Severidad; descripcion: string;
  evidencia: Record<string, unknown>;
}

export interface ResumenNotas {
  total_cambios: number; notas_subieron: number; notas_bajaron: number;
  anuladas: number; restauradas: number; usuarios_involucrados: number;
}
export interface DetalleNota {
  id_aud: number; fec_hor: string; accion: string; dir_ip: string | null;
  usuario: string; id_nota: number | null;
  nota_antes: number | null; nota_despues: number | null;
  estatus_antes: string | null; estatus_despues: string | null;
  tipo_evaluacion: string | null; cedula: string | null; estudiante: string | null;
  cod_materia: string | null; materia: string | null; periodo: string | null;
}
export interface CambiosNotas { resumen: ResumenNotas; detalle: DetalleNota[] }

export interface CambioPrivilegio {
  id_aud: number; fec_hor: string; accion: string; tabla_mod: string;
  dir_ip: string | null; ejecutado_por: string;
  rol_afectado: string | null; modulo: string | null; permiso: string | null;
  alcance_antes: string | null; alcance_despues: string | null;
  estatus_antes: string | null; estatus_despues: string | null;
}

export type EventoAcceso = 'LOGIN_EXITOSO' | 'INTENTO_FALLIDO' | 'BLOQUEO_CUENTA' | 'CAMBIO_PASSWORD' | 'OTRO';
export interface AccesoEvento {
  id_aud: number; fec_hor: string; dir_ip: string | null; usuario: string;
  evento: EventoAcceso; intentos_antes: number | null; intentos_despues: number | null;
}
export interface EventosAcceso {
  resumen: { logins: number; fallidos: number; bloqueos: number; cambios_password: number };
  eventos: AccesoEvento[];
}

export interface ReporteEjecutivo {
  generado_el: string; fecha_analizada: string;
  nivel_de_riesgo: 'CRÍTICO' | 'MODERADO' | 'BAJO';
  diario: ReporteDiario;
  anomalias: Anomalia[];
  conteo_anomalias_por_severidad: Record<Severidad, number>;
  accesos: EventosAcceso;
  notas: CambiosNotas;
}

export interface ParamsRango { desde?: string; hasta?: string }
export interface ParamsAnomalias {
  fecha?: string; ventana_min?: number; umbral_rafaga?: number;
  umbral_borrados?: number; hora_min?: number; hora_max?: number;
}

export const reportesSeguridadService = {
  getDiario: async (fecha?: string): Promise<ReporteDiario> =>
    (await api.get('/reportes-seguridad/diario', { params: fecha ? { fecha } : {} })).data,

  getAnomalias: async (p: ParamsAnomalias = {}): Promise<Anomalia[]> =>
    (await api.get('/reportes-seguridad/anomalias', { params: p })).data,

  getNotas: async (p: ParamsRango & { limite?: number } = {}): Promise<CambiosNotas> =>
    (await api.get('/reportes-seguridad/notas', { params: p })).data,

  getPermisos: async (p: ParamsRango = {}): Promise<CambioPrivilegio[]> =>
    (await api.get('/reportes-seguridad/permisos', { params: p })).data,

  getAccesos: async (p: ParamsRango = {}): Promise<EventosAcceso> =>
    (await api.get('/reportes-seguridad/accesos', { params: p })).data,

  getEjecutivo: async (fecha?: string): Promise<ReporteEjecutivo> =>
    (await api.get('/reportes-seguridad/ejecutivo', { params: fecha ? { fecha } : {} })).data,
};
import api from '../lib/axios';

/* ============================================================
   MÉTRICAS OPERATIVAS
   ============================================================ */
export interface ResumenEstadistico {
  total_docentes_activos: number;
  total_estudiantes_activos: number;
  total_asignaciones_activas: number;
  total_horas_asignadas: number;
  total_horas_disponibles: number;
  total_programas_activos: number;
  aulas_disponibles: number;
}

export interface CargaPorDia {
  id_dia: number;
  dia: string;
  orden: number;
  horas: number;
  asignaciones: number;
}

export interface DocentesPorContrato {
  tipo_contrato: string;
  total_docentes: number;
  total_horas_maximas: number;
  total_horas_asignadas: number;
  total_horas_disponibles: number;
  promedio_horas_asignadas: number;
}

export interface OcupacionEspacio {
  id_esp: number;
  ubicacion: string;
  nombre_centro: string;
  tipo_espacio: string;
  capacidad: number;
  total_asignaciones: number;
  horas_ocupadas: number;
}

export interface EstudiantesPorPrograma {
  id_pro: number;
  codigo: string;
  nombre: string;
  tipo_sistema: string;
  total_estudiantes: number;
}

export interface PeriodoVigente {
  id_per: number;
  nombre: string;
  anio: number;
  numero_periodo: number;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
}

export interface CoberturaNotas {
  notas_registradas: number;
  estudiantes_activos: number;
  estudiantes_evaluados: number;
  materias_en_malla: number;
  porcentaje_cobertura: number;
}

/* ============================================================
   RENDIMIENTO ACADÉMICO
   ============================================================ */
export interface ResumenAcademico {
  total_evaluaciones: number;
  estudiantes_evaluados: number;
  promedio_general: number;
  desviacion_estandar: number;
  nota_minima: number;
  nota_maxima: number;
  aprobados: number;
  reprobados: number;
  porcentaje_aprobacion: number;
}

export interface RangoNota {
  rango: string;
  cantidad: number;
  color: string;
}

export interface CoberturaAcademica {
  estudiantes_activos: number;
  estudiantes_evaluados: number;
  notas_registradas: number;
  porcentaje_cobertura: number;
}

export interface DesempenoPrograma {
  codigo: string;
  nombre: string;
  evaluaciones: number;
  estudiantes: number;
  promedio: number;
  aprobados: number;
  porcentaje_aprobacion: number;
}

export interface MateriaRiesgo {
  cod_programa: string;
  materia: string;
  trayecto: number;
  periodo: number;
  periodo_academico: string;
  evaluados: number;
  promedio: number;
  aprobados: number;
  reprobados: number;
  porcentaje_aprobacion: number;
}

export interface RendimientoAcademicoData {
  resumen: ResumenAcademico;
  distribucion: RangoNota[];
  cobertura: CoberturaAcademica;
  por_programa: DesempenoPrograma[];
  materias_riesgo: MateriaRiesgo[];
}

/* ===== ANALYTICS AVANZADO (Opción 2) ===== */
export interface PuntoTendencia {
  id_per: number;
  periodo: string;
  anio: number;
  numero_periodo: number;
  tipo: string;
  fecha_inicio: string;
  evaluaciones: number;
  estudiantes: number;
  promedio: number;
  aprobados: number;
  pct_aprobacion: number;
}

export interface FilaTrayecto {
  cod_programa: string;
  programa: string;
  trayecto: number;
  evaluaciones: number;
  estudiantes: number;
  promedio: number;
  aprobados: number;
  pct_aprobacion: number;
}

export interface FilaEje {
  cod_eje: string;
  eje: string;
  materias: number;
  evaluaciones: number;
  promedio: number;
  aprobados: number;
  pct_aprobacion: number;
}

export interface FilaSabado {
  aula: string;
  nombre_centro: string;
  total_asignaciones_sabado: number;
  horas_ocupadas: number;
}

export interface FilaGeografia {
  id_mun: number;
  municipio: string;
  estudiantes: number;
  docentes: number;
  espacios: number;
}

export interface BinHistograma {
  bin: number;
  cantidad: number;
}

/* ===== METADATOS DEL SISTEMA (StatusBar) ===== */
export interface EsquemaInfo { esquema: string; tablas: number; vistas: number }
export interface TriggerDuplicado { esquema: string; tabla: string; cantidad: number }
export interface PruebaSalud { prueba: string; fallas: number; ok: boolean }

export interface InfoSistema {
  motor: { base_datos: string; version: string; tamano: string; conexiones: number };
  estructura: { esquemas: number; tablas: number; vistas: number; desglose: EsquemaInfo[] };
  catalogo: {
    triggers: number; indices: number; foraneas: number;
    checks: number; unicos: number; triggers_duplicados: TriggerDuplicado[];
  };
  volumen: Record<string, number>;
  salud: PruebaSalud[];
  salud_ok: boolean;
}

export const analyticsService = {
  getResumen: async (): Promise<ResumenEstadistico> => {
    const response = await api.get('/analytics/resumen');
    return response.data;
  },

  getCargaPorDia: async (): Promise<CargaPorDia[]> => {
    const response = await api.get('/analytics/carga-por-dia');
    return response.data;
  },

  getDocentesPorContrato: async (): Promise<DocentesPorContrato[]> => {
    const response = await api.get('/analytics/docentes-por-contrato');
    return response.data;
  },

  getOcupacionEspacios: async (limite = 8): Promise<OcupacionEspacio[]> => {
    const response = await api.get('/analytics/ocupacion-espacios', { params: { limite } });
    return response.data;
  },

  getEstudiantesPorPrograma: async (): Promise<EstudiantesPorPrograma[]> => {
    const response = await api.get('/analytics/estudiantes-por-programa');
    return response.data;
  },

  getPeriodoVigente: async (): Promise<PeriodoVigente | null> => {
    const response = await api.get('/analytics/periodo-vigente');
    return response.data;
  },

  getCoberturaNotas: async (): Promise<CoberturaNotas> => {
    const response = await api.get('/analytics/cobertura-notas');
    return response.data;
  },

  getInfoSistema: async (): Promise<InfoSistema> => {
    const response = await api.get('/analytics/sistema');
    return response.data;
  },

  getRendimientoAcademico: async (idPer?: number): Promise<RendimientoAcademicoData> => {
    const response = await api.get('/analytics/rendimiento-academico', {
      params: idPer ? { id_per: idPer } : {},
    });
    return response.data;
  },

  getTendencia: async (): Promise<PuntoTendencia[]> =>
    (await api.get('/analytics/tendencia-academica')).data,

  getTrayectos: async (idPro?: number): Promise<FilaTrayecto[]> =>
    (await api.get('/analytics/desempeno-por-trayecto', {
      params: idPro ? { id_pro: idPro } : {},
    })).data,

  getEjes: async (): Promise<FilaEje[]> =>
    (await api.get('/analytics/desempeno-por-eje')).data,

  getSabado: async (): Promise<FilaSabado[]> =>
    (await api.get('/analytics/ocupacion-sabado')).data,

  getGeografia: async (): Promise<FilaGeografia[]> =>
    (await api.get('/analytics/distribucion-geografica')).data,

  getHistograma: async (): Promise<BinHistograma[]> =>
    (await api.get('/analytics/histograma-notas')).data,
};

/* ===== METADATOS DEL SISTEMA (StatusBar) ===== */
export interface EsquemaInfo { esquema: string; tablas: number; vistas: number }
export interface TriggerDuplicado { esquema: string; tabla: string; cantidad: number }
export interface PruebaSalud { prueba: string; fallas: number; ok: boolean }

export interface InfoSistema {
  motor: { base_datos: string; version: string; tamano: string; conexiones: number };
  estructura: { esquemas: number; tablas: number; vistas: number; desglose: EsquemaInfo[] };
  catalogo: {
    triggers: number; indices: number; foraneas: number;
    checks: number; unicos: number; triggers_duplicados: TriggerDuplicado[];
  };
  volumen: Record<string, number>;
  salud: PruebaSalud[];
  salud_ok: boolean;
}
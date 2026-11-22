import api from '../lib/axios';

/* ===== MÉTRICAS OPERATIVAS ===== */
export interface ResumenEstadistico {
  total_docentes_activos: number; total_estudiantes_activos: number;
  total_asignaciones_activas: number; total_horas_asignadas: number;
  total_horas_disponibles: number; total_programas_activos: number; aulas_disponibles: number;
}
export interface CargaPorDia { id_dia: number; dia: string; orden: number; horas: number; asignaciones: number }
export interface DocentesPorContrato {
  tipo_contrato: string; total_docentes: number; total_horas_maximas: number;
  total_horas_asignadas: number; total_horas_disponibles: number; promedio_horas_asignadas: number;
}
export interface OcupacionEspacio {
  id_esp: number; ubicacion: string; nombre_centro: string; tipo_espacio: string;
  capacidad: number; total_asignaciones: number; horas_ocupadas: number;
}
export interface EstudiantesPorPrograma { id_pro: number; codigo: string; nombre: string; tipo_sistema: string; total_estudiantes: number }
export interface PeriodoVigente { id_per: number; nombre: string; anio: number; numero_periodo: number; tipo: string; fecha_inicio: string; fecha_fin: string }
export interface CoberturaNotas { notas_registradas: number; estudiantes_activos: number; estudiantes_evaluados: number; materias_en_malla: number; porcentaje_cobertura: number }

/* ===== RENDIMIENTO ACADÉMICO ===== */
export interface ResumenAcademico {
  total_evaluaciones: number; estudiantes_evaluados: number; promedio_general: number;
  desviacion_estandar: number; nota_minima: number; nota_maxima: number;
  aprobados: number; reprobados: number; porcentaje_aprobacion: number;
}
export interface RangoNota { rango: string; cantidad: number; color: string }
export interface CoberturaAcademica { estudiantes_activos: number; estudiantes_evaluados: number; notas_registradas: number; porcentaje_cobertura: number }
export interface DesempenoPrograma { codigo: string; nombre: string; evaluaciones: number; estudiantes: number; promedio: number; aprobados: number; porcentaje_aprobacion: number }
export interface MateriaRiesgo {
  cod_programa: string; materia: string; trayecto: number; periodo: number; periodo_academico: string;
  evaluados: number; promedio: number; aprobados: number; reprobados: number; porcentaje_aprobacion: number;
}
export interface RendimientoAcademicoData {
  resumen: ResumenAcademico; distribucion: RangoNota[]; cobertura: CoberturaAcademica;
  por_programa: DesempenoPrograma[]; materias_riesgo: MateriaRiesgo[];
}

/* ===== METADATOS DEL SISTEMA (StatusBar) — UNA sola vez ===== */
export interface EsquemaInfo { esquema: string; tablas: number; vistas: number }
export interface TriggerDuplicado { esquema: string; tabla: string; cantidad: number }
export interface PruebaSalud { prueba: string; fallas: number; ok: boolean }
export interface InfoSistema {
  motor: { base_datos: string; version: string; tamano: string; conexiones: number };
  estructura: { esquemas: number; tablas: number; vistas: number; desglose: EsquemaInfo[] };
  catalogo: { triggers: number; indices: number; foraneas: number; checks: number; unicos: number; triggers_duplicados: TriggerDuplicado[] };
  volumen: Record<string, number>;
  salud: PruebaSalud[];
  salud_ok: boolean;
}

/* ===== ANALÍTICA ACADÉMICA (Opción 2) ===== */
export interface PuntoTendencia {
  id_per: number; periodo: string; anio: number; numero_periodo: number; tipo: string;
  fecha_inicio: string; evaluaciones: number; estudiantes: number; promedio: number;
  aprobados: number; pct_aprobacion: number;
}
export interface FilaTrayecto { cod_programa: string; programa: string; trayecto: number; evaluaciones: number; estudiantes: number; promedio: number; aprobados: number; pct_aprobacion: number }
export interface FilaEje { cod_eje: string; eje: string; materias: number; evaluaciones: number; promedio: number; aprobados: number; pct_aprobacion: number }
export interface FilaOcupacionDia { id_esp: number; aula: string; nombre_centro: string; capacidad: number; total_asignaciones: number; horas_ocupadas: number }
export interface FilaGeografia { id_mun: number; municipio: string; estudiantes: number; docentes: number; espacios: number }
export interface BinHistograma { bin: number; cantidad: number }

/* ===== PREDICCIONES (Lote 5) ===== */
export interface PuntoSerie {
  id_per: number; periodo: string; anio: number; numero_periodo: number; tipo: string;
  fecha_inicio: string; orden: number; evaluaciones: number; promedio: number; pct_aprobacion: number;
}

export interface PuntoProyeccion {
  paso: number; etiqueta: string; promedio_proyectado: number; pct_aprobacion_proyectado: number;
}

export interface MateriaRiesgoPred {
  cod_programa: string; materia: string; trayecto: number; periodo: number;
  evaluados: number; promedio: number; reprobados: number; pct_aprobacion: number; nivel: string;
}

export interface EstudianteRiesgo {
  id_est: number; cedula: string; estudiante: string; cod_programa: string;
  promedio: number; materias_evaluadas: number; materias_reprobadas: number; nivel: string;
}

export interface PrediccionesData {
  metodo: string;
  n_periodos: number;
  confiable: boolean;
  aviso: string | null;
  pendiente_promedio: number | null;
  pendiente_aprobacion: number | null;
  r2_promedio: number | null;
  r2_aprobacion: number | null;
  serie: PuntoSerie[];
  proyeccion: PuntoProyeccion[];
  materias_riesgo: MateriaRiesgoPred[];
  estudiantes_riesgo: EstudianteRiesgo[];
}

export const analyticsService = {
  getResumen: async (): Promise<ResumenEstadistico> => (await api.get('/analytics/resumen')).data,
  getCargaPorDia: async (): Promise<CargaPorDia[]> => (await api.get('/analytics/carga-por-dia')).data,
  getDocentesPorContrato: async (): Promise<DocentesPorContrato[]> => (await api.get('/analytics/docentes-por-contrato')).data,
  getOcupacionEspacios: async (limite = 8): Promise<OcupacionEspacio[]> =>
    (await api.get('/analytics/ocupacion-espacios', { params: { limite } })).data,
  getEstudiantesPorPrograma: async (): Promise<EstudiantesPorPrograma[]> => (await api.get('/analytics/estudiantes-por-programa')).data,
  getPeriodosVigentes: async (): Promise<PeriodoVigente[]> => (await api.get('/analytics/periodos-vigentes')).data,
  getCoberturaNotas: async (): Promise<CoberturaNotas> => (await api.get('/analytics/cobertura-notas')).data,
  getInfoSistema: async (): Promise<InfoSistema> => (await api.get('/analytics/sistema')).data,
  getRendimientoAcademico: async (idPer?: number): Promise<RendimientoAcademicoData> =>
    (await api.get('/analytics/rendimiento-academico', { params: idPer ? { id_per: idPer } : {} })).data,

  getTendencia: async (): Promise<PuntoTendencia[]> => (await api.get('/analitica/tendencia')).data,
  getTrayectos: async (idPro?: number): Promise<FilaTrayecto[]> =>
    (await api.get('/analitica/trayectos', { params: idPro ? { id_pro: idPro } : {} })).data,
  getEjes: async (): Promise<FilaEje[]> => (await api.get('/analitica/ejes')).data,
  getOcupacionPorDia: async (idDia: number): Promise<FilaOcupacionDia[]> =>
    (await api.get('/analitica/ocupacion', { params: { id_dia: idDia } })).data,
  getGeografia: async (): Promise<FilaGeografia[]> => (await api.get('/analitica/geografia')).data,
  getHistograma: async (): Promise<BinHistograma[]> => (await api.get('/analitica/histograma')).data,

  getPredicciones: async (idPro?: number, pasos = 2): Promise<PrediccionesData> =>
    (await api.get('/analitica/predicciones', { params: { ...(idPro ? { id_pro: idPro } : {}), pasos } })).data,
};
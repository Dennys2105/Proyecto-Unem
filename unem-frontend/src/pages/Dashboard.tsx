import { useState, useEffect } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import {
  Users, UserCheck, Calendar, BookOpen, GraduationCap,
  BarChart3, PieChart as PieIcon, Building2, Star, RefreshCw,
  AlertCircle, ClipboardList, } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend
} from 'recharts';
import toast from 'react-hot-toast';
import type { CargaPorDia, OcupacionEspacio } from '../services/analyticsService';
import { RendimientoAcademico } from '../components/RendimientoAcademico';
import { PageHero } from '../components/PageHero';

const COLORES_CONTRATO = ['#2563eb', '#7c3aed', '#059669', '#d97706'];

interface KpiDef {
  titulo: string;
  valor: number | string;
  subtitulo?: string;
  icon: typeof Users;
  color: string;
}

// ✅ Componente aislado: solo este subárbol se re-renderiza cada segundo
const UltimaActualizacion = ({ timestamp }: { timestamp: number }): ReactNode => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!timestamp) return null;

  const segundos = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  let texto: string;
  if (segundos < 5) texto = 'hace un momento';
  else if (segundos < 60) texto = `hace ${segundos}s`;
  else {
    const minutos = Math.floor(segundos / 60);
    texto = `hace ${minutos} min`;
  }

  return <span className="text-xs text-gray-400">Última actualización: {texto}</span>;
};

export const Dashboard = () => {
  const {
    resumen, cargaPorDia, porContrato, ocupacion, porPrograma,
    periodosVigentes, coberturaSecciones, isLoading, isFetching, dataUpdatedAt,
    isError, refetchAll
  } = useAnalytics();

  // ✅ Estado exclusivo del botón manual (para que el auto-refresh no lo active)
  const [isManualRefresh, setIsManualRefresh] = useState(false);

  const handleRefresh = async () => {
    if (isManualRefresh) return;
    setIsManualRefresh(true);
    const toastId = toast.loading('Actualizando métricas...');
    try {
      await refetchAll();
      toast.success('Datos actualizados correctamente', { id: toastId, icon: '✅', duration: 2000 });
    } catch {
      toast.error('No se pudieron actualizar todas las métricas', { id: toastId, duration: 3000 });
    } finally {
      setIsManualRefresh(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="text-gray-500 mt-4">Cargando estadísticas reales...</p>
      </div>
    );
  }

  if (isError || !resumen) {
    return (
      <div className="p-12 text-center">
        <AlertCircle className="mx-auto text-red-400 mb-3" size={48} />
        <p className="text-gray-700 font-medium">No se pudieron cargar las estadísticas</p>
        <p className="text-gray-500 text-sm mt-1">Verifica que el backend esté activo y tu sesión vigente.</p>
        <button
          onClick={handleRefresh}
          disabled={isManualRefresh}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
        >
          <RefreshCw size={16} className={isManualRefresh ? 'animate-spin' : ''} />
          {isManualRefresh ? 'Reintentando...' : 'Reintentar'}
        </button>
      </div>
    );
  }

  // El indicador activo de BD no garantiza vigencia por fechas.
  const ahora = new Date();
  const hoyLocal = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
  const periodosFechaValida = periodosVigentes.filter((p) => p.fecha_inicio <= hoyLocal && hoyLocal <= p.fecha_fin);
  const periodosFueraFecha = periodosVigentes.filter((p) => p.fecha_inicio > hoyLocal || p.fecha_fin < hoyLocal);
  const seccionesConNotas = coberturaSecciones.filter((s) => s.evaluados > 0).length;
  const totalSecciones = coberturaSecciones.length;
  const estudiantesEvaluadosOficial = coberturaSecciones.reduce((total, s) => total + s.evaluados, 0);
  const estudiantesSinNota = Math.max(0, resumen.total_estudiantes_activos - estudiantesEvaluadosOficial);
  const coberturaOficialPct = resumen.total_estudiantes_activos > 0
    ? Math.round(estudiantesEvaluadosOficial * 1000 / resumen.total_estudiantes_activos) / 10
    : 0;
  const seccionesGraficas = coberturaSecciones.map((s) => ({
    ...s, etiqueta: `${s.cod_programa}-${s.codigo.split('.').slice(-1)[0]}`,
  }));
  const totalHoras = resumen.total_horas_asignadas + resumen.total_horas_disponibles;
  const porcentajeOcupacion = totalHoras > 0
    ? Math.round((resumen.total_horas_asignadas / totalHoras) * 100)
    : 0;

  const kpis: KpiDef[] = [
    { titulo: 'Estudiantes activos', valor: resumen.total_estudiantes_activos, subtitulo: 'Matrícula registrada', icon: UserCheck, color: '#0f9d58' },
    { titulo: 'Secciones activas', valor: totalSecciones, subtitulo: 'Grupos en ambos programas', icon: GraduationCap, color: '#2e3192' },
    { titulo: 'Docentes activos', valor: resumen.total_docentes_activos, subtitulo: 'Con ficha docente', icon: Users, color: '#1e88e5' },
    { titulo: 'Asignaciones activas', valor: resumen.total_asignaciones_activas, subtitulo: 'Bloques de horario, no materias únicas', icon: Calendar, color: '#7c7cc9' },
    { titulo: 'Horas asignadas', valor: `${resumen.total_horas_asignadas}h`, subtitulo: `${porcentajeOcupacion}% de capacidad docente`, icon: BookOpen, color: '#e08600' },
    { titulo: 'Cobertura de notas oficiales', valor: `${coberturaOficialPct}%`, subtitulo: `${estudiantesEvaluadosOficial} de ${resumen.total_estudiantes_activos} estudiantes con nota final o recuperación validada`, icon: ClipboardList, color: '#7c3aed' },
  ];

  const datosContrato = porContrato.map((c) => ({
    nombre: c.tipo_contrato,
    docentes: c.total_docentes,
    asignadas: c.total_horas_asignadas,
    disponibles: c.total_horas_disponibles,
  }));

  const maxHorasEspacio = Math.max(...ocupacion.map((e: OcupacionEspacio) => e.horas_ocupadas), 1);
  const totalEstudiantesProgramas = porPrograma.reduce((acc, p) => acc + p.total_estudiantes, 0);

  // ✅ Atenúa el contenido mientras se refresca (feedback visual global)
  const claseAtenuada = isFetching ? 'opacity-60 transition-opacity duration-300' : 'opacity-100 transition-opacity duration-300';

  return (
    <div className="unem-page">
      <PageHero
        icon={BarChart3}
        titulo="Panel de Control UNEM"
        descripcion="Panorama académico, seguimiento de matrícula y cobertura de evaluaciones · datos actualizados cada 60 segundos."
        acciones={
          <button
            className="unem-btn"
            onClick={handleRefresh}
            disabled={isManualRefresh}
            title="Volver a consultar todas las métricas desde la base de datos"
          >
            <RefreshCw size={15} className={isManualRefresh ? 'animate-spin' : ''} />
            {isManualRefresh ? 'Actualizando...' : 'Actualizar'}
          </button>
        }
      />

      <section className="unem-card unem-card-pad">
        <div className="unem-toolbar">
          <span className="unem-chip unem-chip-ins">
            <span className="unem-pulse"><i /><b /></span> En vivo
          </span>
          {periodosFechaValida.map((periodo) => (
            <span key={periodo.id_per} className="unem-chip unem-chip-ins">
              <Star size={13} /> Período en fecha: {periodo.nombre}
            </span>
          ))}
          {periodosFueraFecha.map((periodo) => (
            <span key={periodo.id_per} className="unem-chip unem-chip-del" title={`${periodo.fecha_inicio} a ${periodo.fecha_fin}`}>
              <AlertCircle size={13} /> Marcado activo, pero fuera de fecha: {periodo.nombre}
            </span>
          ))}
          {periodosVigentes.length === 0 && (
            <span className="unem-chip unem-chip-del"><AlertCircle size={13} /> Sin período marcado activo</span>
          )}
          <UltimaActualizacion timestamp={dataUpdatedAt} />
        </div>
      </section>

      {/* ✅ Barra de progreso indeterminada mientras refresca */}
      {isFetching && (
        <div className="w-full h-1 bg-indigo-100 rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-indigo-600 rounded-full animate-pulse"></div>
        </div>
      )}

      {/* KPIs REALES */}
      <div className={`unem-kpis ${claseAtenuada}`}>
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <article key={kpi.titulo} className="unem-kpi" style={{ ['--kpi-c' as never]: kpi.color } as CSSProperties}>
              <div className="unem-kpi-top">
                <span className="unem-kpi-l">{kpi.titulo}</span>
                <span className="unem-kpi-i"><Icon size={16} /></span>
              </div>
              <div className="unem-kpi-v">{kpi.valor}</div>
              {kpi.subtitulo && <div className="unem-kpi-s">{kpi.subtitulo}</div>}
            </article>
          );
        })}

      </div>

      {/* Indicadores accionables: distinguen matrícula, carga y evaluación. */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-4 ${claseAtenuada}`}>
        <div className="unem-card unem-card-pad border-l-4 border-amber-400">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Brecha de evaluación</p>
          <div className="text-2xl font-black text-gray-900 mt-2">{estudiantesSinNota} alumnos</div>
          <p className="text-sm text-gray-500 mt-1">Todavía sin nota final o recuperación validada. No implica reprobación.</p>
        </div>
        <div className="unem-card unem-card-pad border-l-4 border-indigo-400">
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">Avance por sección</p>
          <div className="text-2xl font-black text-gray-900 mt-2">{seccionesConNotas} de {totalSecciones}</div>
          <p className="text-sm text-gray-500 mt-1">Grupos con al menos un estudiante evaluado.</p>
        </div>
        <div className="unem-card unem-card-pad border-l-4 border-sky-400">
          <p className="text-xs font-bold uppercase tracking-wide text-sky-700">Capacidad docente</p>
          <div className="text-2xl font-black text-gray-900 mt-2">{porcentajeOcupacion}%</div>
          <p className="text-sm text-gray-500 mt-1">{resumen.total_horas_asignadas}h asignadas · {resumen.total_horas_disponibles}h disponibles.</p>
        </div>
      </div>

      <div className={`unem-card unem-card-pad ${claseAtenuada}`}>
        <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Matrícula y cobertura académica por sección</h2>
            <p className="text-sm text-gray-500 mt-1">Compara alumnos inscritos con alumnos que tienen al menos una nota oficial validada.</p>
          </div>
          <span className="unem-chip unem-chip-soft">{totalSecciones} secciones</span>
        </div>
        {seccionesGraficas.length === 0 ? <EmptyState texto="No hay secciones activas." /> : (
          <>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seccionesGraficas} margin={{ top: 10, right: 18, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value, name) => [value ?? 0, name === 'estudiantes' ? 'Matriculados' : 'Con nota validada']} />
                  <Legend formatter={(value: string) => value === 'estudiantes' ? 'Matriculados' : 'Con nota validada'} />
                  <Bar dataKey="estudiantes" name="estudiantes" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="evaluados" name="evaluados" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 mt-3">
              {coberturaSecciones.map((s) => (
                <div key={s.id_sec} className="rounded-xl border border-gray-200 bg-slate-50 px-3 py-3">
                  <div className="font-semibold text-sm text-gray-800">{s.cod_programa} · {s.codigo.split('.').slice(-1)[0]}</div>
                  <div className="text-xs text-gray-500 mt-1">Matrícula {s.estudiantes}/{s.capacidad} · {s.ocupacion_pct}%</div>
                  <div className="text-xs text-gray-500">Notas: {s.evaluados}/{s.estudiantes} alumnos · {s.cobertura_pct}%</div>
                  <div className="text-xs text-gray-500">Materias programadas: {s.materias_programadas}</div>
                </div>
              ))}
            </div>
          </>
        )}
        <p className="text-xs text-amber-700 mt-4">Cobertura de alumnos ≠ porcentaje de materias evaluadas. Los resultados por sección no deben confundirse con un promedio institucional.</p>
      </div>

      {/* GRÁFICA 1: CARGA HORARIA REAL POR DÍA */}
      <div className={`unem-card unem-card-pad ${claseAtenuada}`}>
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 size={22} style={{ color: 'var(--info)' }} />
          <h2 className="text-xl font-bold text-gray-900">Carga Horaria Semanal por Día</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Horas reales calculadas desde las asignaciones activas (incluye carga académica, asesorías y preparación).
        </p>
        {cargaPorDia.length === 0 ? (
          <EmptyState texto="No hay días laborales activos configurados." />
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cargaPorDia} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} unit="h" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  formatter={(value, name) => [`${value ?? 0}h`, name === 'horas' ? 'Horas asignadas' : String(name)]}
                />
                <Bar dataKey="horas" radius={[6, 6, 0, 0]}>
                  {cargaPorDia.map((d: CargaPorDia, index: number) => (
                    <Cell key={`dia-${d.id_dia}`} fill={d.horas > 0 ? (index % 2 === 0 ? '#2563eb' : '#3b82f6') : '#e5e7eb'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* FILA: CONTRATOS + PROGRAMAS */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${claseAtenuada}`}>
        <div className="unem-card unem-card-pad">
          <div className="flex items-center gap-2 mb-1">
            <PieIcon size={22} style={{ color: 'var(--indigo-lt)' }} />
            <h2 className="text-lg font-bold text-gray-900">Docentes por Tipo de Contrato</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">Distribución real del personal activo.</p>
          {datosContrato.length === 0 ? (
            <EmptyState texto="No hay docentes activos registrados." />
          ) : (
            <>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={datosContrato}
                      dataKey="docentes"
                      nameKey="nombre"
                      cx="50%" cy="50%"
                      outerRadius={80}
                      label={(entry: any) => `${entry.nombre}: ${entry.docentes}`}
                    >
                      {datosContrato.map((_e, index: number) => (
                        <Cell key={`contrato-${index}`} fill={COLORES_CONTRATO[index % COLORES_CONTRATO.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {porContrato.map((c) => (
                  <div key={c.tipo_contrato} className="flex items-center justify-between text-sm border-t border-gray-100 pt-2">
                    <span className="font-medium text-gray-700">{c.tipo_contrato}</span>
                    <span className="text-gray-500">
                      <b className="text-blue-600">{c.total_horas_asignadas}h</b> asig ·{' '}
                      <b className="text-green-600">{c.total_horas_disponibles}h</b> disp
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="unem-card unem-card-pad">
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap size={22} style={{ color: 'var(--indigo)' }} />
            <h2 className="text-lg font-bold text-gray-900">Estudiantes por Programa</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">Matrícula activa en programas vigentes.</p>
          {porPrograma.length === 0 ? (
            <EmptyState texto="No hay programas activos registrados." />
          ) : (
            <div className="space-y-4">
              {porPrograma.map((p) => {
                const pct = totalEstudiantesProgramas > 0
                  ? Math.round((p.total_estudiantes / totalEstudiantesProgramas) * 100)
                  : 0;
                return (
                  <div key={p.id_pro}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded">
                          {p.codigo}
                        </span>
                        <span className="text-sm text-gray-700 truncate">{p.nombre}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900 shrink-0 ml-2">{p.total_estudiantes}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{pct}% de la matrícula · {p.tipo_sistema}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* OCUPACIÓN DE ESPACIOS */}
      <div className={`unem-card unem-card-pad ${claseAtenuada}`}>
        <div className="flex items-center gap-2 mb-1">
          <Building2 size={22} style={{ color: 'var(--violet)' }} />
          <h2 className="text-xl font-bold text-gray-900">Ranking de Ocupación de Espacios</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Espacios con mayor carga horaria semanal asignada.
        </p>
        {ocupacion.length === 0 ? (
          <EmptyState texto="No hay espacios físicos activos registrados." />
        ) : (
          <div className="space-y-3">
            {ocupacion.map((e: OcupacionEspacio) => {
              const pct = Math.round((e.horas_ocupadas / maxHorasEspacio) * 100);
              return (
                <div key={e.id_esp} className="flex items-center gap-4">
                  <div className="w-40 shrink-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{e.ubicacion}</p>
                    <p className="text-xs text-gray-400 truncate">{e.nombre_centro}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${e.horas_ocupadas > 0 ? 'bg-rose-500' : 'bg-gray-200'}`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-32 shrink-0 text-right">
                    <p className="text-sm font-bold text-gray-900">{e.horas_ocupadas}h</p>
                    <p className="text-xs text-gray-400">{e.total_asignaciones} asig · cap. {e.capacidad}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MÓDULO DE NOTAS: ESTADO HONESTO */}
      <RendimientoAcademico />
    </div>
  );
};

// --- Componentes auxiliares ---
const EmptyState = ({ texto }: { texto: string }): ReactNode => (
  <div className="py-10 text-center">
    <AlertCircle className="mx-auto text-gray-300 mb-2" size={36} />
    <p className="text-gray-500 text-sm">{texto}</p>
  </div>
);

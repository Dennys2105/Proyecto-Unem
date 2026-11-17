import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import {
  Users, UserCheck, Calendar, BookOpen, Clock, GraduationCap, DoorOpen,
  BarChart3, PieChart as PieIcon, Building2, Star, RefreshCw,
  AlertCircle, ClipboardList, } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend
} from 'recharts';
import toast from 'react-hot-toast';
import type { CargaPorDia, OcupacionEspacio } from '../services/analyticsService';
import { RendimientoAcademico } from '../components/RendimientoAcademico';

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
    periodoVigente, coberturaNotas, isLoading, isFetching, dataUpdatedAt,
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

  const totalHoras = resumen.total_horas_asignadas + resumen.total_horas_disponibles;
  const porcentajeOcupacion = totalHoras > 0
    ? Math.round((resumen.total_horas_asignadas / totalHoras) * 100)
    : 0;

  const kpis: KpiDef[] = [
    { titulo: 'Docentes Activos', valor: resumen.total_docentes_activos, icon: Users, color: 'bg-blue-600' },
    { titulo: 'Estudiantes Activos', valor: resumen.total_estudiantes_activos, icon: UserCheck, color: 'bg-green-600' },
    { titulo: 'Asignaciones', valor: resumen.total_asignaciones_activas, subtitulo: 'Carga horaria vigente', icon: Calendar, color: 'bg-purple-600' },
    { titulo: 'Programas Activos', valor: resumen.total_programas_activos, icon: GraduationCap, color: 'bg-indigo-600' },
    { titulo: 'Horas Asignadas', valor: `${resumen.total_horas_asignadas}h`, subtitulo: `${porcentajeOcupacion}% de la capacidad`, icon: BookOpen, color: 'bg-orange-600' },
    { titulo: 'Horas Disponibles', valor: `${resumen.total_horas_disponibles}h`, subtitulo: 'Capacidad sin asignar', icon: Clock, color: 'bg-teal-600' },
    { titulo: 'Aulas Disponibles', valor: resumen.aulas_disponibles, subtitulo: 'Espacios operativos', icon: DoorOpen, color: 'bg-rose-600' },
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
    <div className="space-y-6">
      {/* ENCABEZADO */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <div className="bg-indigo-100 p-3 rounded-xl">
            <BarChart3 className="text-indigo-600" size={32} />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-gray-900">Panel de Control UNEM</h1>
              {/* ✅ Badge "En vivo" con punto pulsante */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-600"></span>
                </span>
                En vivo
              </span>
            </div>
            <p className="text-gray-600 mt-1">
              Métricas operativas en tiempo real · Actualización automática cada 60 segundos
            </p>
            <div className="mt-1">
              <UltimaActualizacion timestamp={dataUpdatedAt} />
            </div>
            {periodoVigente ? (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <Star size={14} fill="currentColor" />
                Período vigente: <strong>{periodoVigente.nombre}</strong>
                <span className="text-amber-600">
                  ({periodoVigente.fecha_inicio} → {periodoVigente.fecha_fin})
                </span>
              </div>
            ) : (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                <AlertCircle size={14} />
                No hay período académico vigente configurado
              </div>
            )}
          </div>
        </div>

        {/* ✅ BOTÓN ACTUALIZAR CON FEEDBACK VISUAL */}
        <button
          onClick={handleRefresh}
          disabled={isManualRefresh}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition text-sm font-medium shadow-sm border ${
            isManualRefresh
              ? 'bg-indigo-50 border-indigo-300 text-indigo-700 cursor-wait'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-indigo-300'
          } disabled:opacity-80`}
          title="Volver a consultar todas las métricas desde la base de datos"
        >
          <RefreshCw size={16} className={isManualRefresh ? 'animate-spin' : ''} />
          {isManualRefresh ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {/* ✅ Barra de progreso indeterminada mientras refresca */}
      {isFetching && (
        <div className="w-full h-1 bg-indigo-100 rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-indigo-600 rounded-full animate-pulse"></div>
        </div>
      )}

      {/* KPIs REALES */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${claseAtenuada}`}>
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.titulo} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{kpi.titulo}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{kpi.valor}</p>
                  {kpi.subtitulo && <p className="text-xs text-gray-400 mt-1">{kpi.subtitulo}</p>}
                </div>
                <div className={`${kpi.color} p-2.5 rounded-lg shrink-0`}>
                  <Icon className="text-white" size={20} />
                </div>
              </div>
            </div>
          );
        })}

        <div className="bg-white rounded-xl shadow-sm border border-dashed border-amber-300 p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Cobertura de Notas</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {coberturaNotas?.porcentaje_cobertura ?? 0}%
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {coberturaNotas?.estudiantes_evaluados ?? 0} de {coberturaNotas?.estudiantes_activos ?? 0} estudiantes
              </p>
            </div>
            <div className="bg-amber-500 p-2.5 rounded-lg shrink-0">
              <ClipboardList className="text-white" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* GRÁFICA 1: CARGA HORARIA REAL POR DÍA */}
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${claseAtenuada}`}>
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="text-blue-600" size={22} />
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-1">
            <PieIcon className="text-purple-600" size={22} />
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

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap className="text-indigo-600" size={22} />
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
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${claseAtenuada}`}>
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="text-rose-600" size={22} />
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

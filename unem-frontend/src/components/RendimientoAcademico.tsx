import { useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analyticsService';
import type {
  RangoNota,
  MateriaRiesgo,
  DesempenoPrograma,
  RendimientoAcademicoData,
} from '../services/analyticsService';
import { usePeriodos } from '../hooks/usePeriodos';
import type { PeriodoAcademico } from '../types/models';
import {
  TrendingUp, Award, Users, AlertTriangle, RefreshCw,
  CheckCircle2, XCircle, Info, GraduationCap, Sigma,
  ArrowDownRight, ArrowUpRight, Sparkles, ShieldCheck,
} from 'lucide-react';

/* ============================================================
   UTILIDADES
   ============================================================ */
const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const aRomano = (n: number): string => ROMANOS[n - 1] ?? String(n);
const fmt = (n: number | null | undefined, dec = 2): string => (n ?? 0).toFixed(dec);
const pct = (parte: number, total: number): number => (total > 0 ? (parte / total) * 100 : 0);

interface Escala {
  etiqueta: string;
  clave: string;
  detalle: string;
  hex: string;
  suave: string;
  texto: string;
}

const ESCALA: Escala[] = [
  { etiqueta: 'Excelencia', clave: 'Excelencia (18-20)', detalle: '18-20', hex: '#0f9d58', suave: '#e6f6ee', texto: '#0b6b3d' },
  { etiqueta: 'Aprobado', clave: 'Aprobado (mínimo según eje)', detalle: 'mínimo según eje, bajo 18', hex: '#7c3aed', suave: '#f0e9fe', texto: '#5b21b6' },
  { etiqueta: 'Reprobado', clave: 'Reprobado (mínimo según eje)', detalle: 'bajo el mínimo del eje', hex: '#e08600', suave: '#fdf1de', texto: '#92590a' },
];

/* ============================================================
   ESTILOS PROPIOS (scrollbar, malla, animaciones)
   ============================================================ */
const ESTILOS = `
.ra-scroll::-webkit-scrollbar{height:9px;width:9px}
.ra-scroll::-webkit-scrollbar-track{background:#eef1f7;border-radius:99px}
.ra-scroll::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#4f46e5,#7c3aed);border-radius:99px;border:2px solid #eef1f7}
.ra-scroll::-webkit-scrollbar-thumb:hover{background:linear-gradient(180deg,#4338ca,#6d28d9)}
.ra-scroll{scrollbar-width:thin;scrollbar-color:#6366f1 #eef1f7}

.ra-mesh{
  background-color:#0b1020;
  background-image:
    radial-gradient(at 12% 18%, rgba(79,70,229,.75) 0px, transparent 55%),
    radial-gradient(at 88% 12%, rgba(14,165,233,.50) 0px, transparent 50%),
    radial-gradient(at 72% 92%, rgba(168,85,247,.55) 0px, transparent 52%),
    radial-gradient(at 28% 88%, rgba(16,185,129,.32) 0px, transparent 48%);
}
.ra-grain::after{
  content:'';position:absolute;inset:0;pointer-events:none;opacity:.16;mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E");
}
.ra-aurora{animation:ra-drift 18s ease-in-out infinite alternate}
@keyframes ra-drift{0%{transform:translate3d(0,0,0) scale(1)}100%{transform:translate3d(-3%,2%,0) scale(1.08)}}

@keyframes ra-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.ra-rise{animation:ra-rise .55s cubic-bezier(.22,1,.36,1) both}

@keyframes ra-grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.ra-grow{transform-origin:left center;animation:ra-grow .9s cubic-bezier(.22,1,.36,1) both}

@keyframes ra-sheen{0%{background-position:-220% 0}100%{background-position:220% 0}}
.ra-sheen{
  background:linear-gradient(90deg,#eef1f7 25%,#e2e7f2 45%,#eef1f7 65%);
  background-size:220% 100%;animation:ra-sheen 1.25s linear infinite;
}
.ra-tnum{font-variant-numeric:tabular-nums}
`;

/* ============================================================
   COMPONENTE PRINCIPAL
   ============================================================ */
export const RendimientoAcademico = () => {
  const [idPer, setIdPer] = useState<string>('');
  const { periodos } = usePeriodos();

  const listaPeriodos: PeriodoAcademico[] = useMemo(
    () => (Array.isArray(periodos) ? (periodos as PeriodoAcademico[]) : []),
    [periodos]
  );

  const { data, isLoading, isFetching, isError, refetch } = useQuery<RendimientoAcademicoData>({
    queryKey: ['analytics', 'rendimiento-academico', idPer],
    queryFn: () => analyticsService.getRendimientoAcademico(idPer ? parseInt(idPer, 10) : undefined),
    refetchInterval: 60_000,
    retry: 1,
  });

  const resumen = data?.resumen;
  const cobertura = data?.cobertura;
  const distribucion: RangoNota[] = data?.distribucion ?? [];
  const porPrograma: DesempenoPrograma[] = data?.por_programa ?? [];
  const riesgo: MateriaRiesgo[] = data?.materias_riesgo ?? [];

  const totalEvaluaciones = resumen?.total_evaluaciones ?? 0;
  const hayDatos = totalEvaluaciones > 0;

  const barras: (Escala & { cantidad: number; porcentaje: number })[] = useMemo(() => {
    return ESCALA.map((e: Escala) => {
      const encontrado = distribucion.find((d: RangoNota) => d.rango === e.clave);
      const cantidad = encontrado?.cantidad ?? 0;
      return { ...e, cantidad, porcentaje: pct(cantidad, totalEvaluaciones) };
    });
  }, [distribucion, totalEvaluaciones]);

  const maxCantidad = Math.max(...barras.map((b) => b.cantidad), 1);
  const aprobacion = resumen?.porcentaje_aprobacion ?? 0;
  const salud: 'alta' | 'media' | 'baja' = aprobacion >= 80 ? 'alta' : aprobacion >= 60 ? 'media' : 'baja';
  const saludHex = salud === 'alta' ? '#0f9d58' : salud === 'media' ? '#e08600' : '#dc2626';

  const periodoActivo = listaPeriodos.find((p: PeriodoAcademico) => String(p.id_per) === idPer);

  /* ---------- anillo de aprobación ---------- */
  const R = 52;
  const CIRC = 2 * Math.PI * R;
  const arco = (aprobacion / 100) * CIRC;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,.06),0_12px_32px_-12px_rgba(16,24,40,.18)]">
      <style>{ESTILOS}</style>

      {/* ══════════ CABECERA OSCURA ══════════ */}
      <header className="ra-mesh ra-grain relative isolate overflow-hidden px-6 py-6 sm:px-8">
        <div className="ra-aurora pointer-events-none absolute -inset-16 -z-10 opacity-70 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, rgba(99,102,241,.55), transparent)' }} />

        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/25 backdrop-blur">
                <TrendingUp className="text-cyan-300" size={20} />
              </span>
              <h2 className="text-2xl font-black tracking-tight text-white sm:text-[26px]">
                Rendimiento Académico
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/35">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-80" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                Datos reales
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-indigo-100/80">
              Indicadores calculados sobre calificaciones <strong className="font-semibold text-white">oficiales</strong> —
              Final o Recuperación, con precedencia de la segunda. Parciales y trabajos son formativos
              y no alteran estas métricas.
            </p>
            {periodoActivo && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-medium text-cyan-200 ring-1 ring-white/15">
                <Sparkles size={12} />
                {periodoActivo.nombre} · {periodoActivo.fecha_inicio} → {periodoActivo.fecha_fin}
              </p>
            )}
          </div>

          <div className="flex items-end gap-2">
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-[.14em] text-indigo-200/70">
                Período académico
              </span>
              <select
                value={idPer}
                onChange={(e) => setIdPer(e.target.value)}
                className="ra-scroll w-56 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-[13px] font-medium text-white shadow-inner backdrop-blur transition hover:border-cyan-300/50 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
              >
                <option value="" className="bg-slate-900 text-white">Todos · histórico</option>
                {listaPeriodos
                  .filter((p: PeriodoAcademico) => (p.estatus ?? 'A') === 'A')
                  .map((p: PeriodoAcademico) => (
                    <option key={p.id_per} value={String(p.id_per)} className="bg-slate-900 text-white">
                      {p.nombre}{p.activo ? '  ★ vigente' : ''}
                    </option>
                  ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => { void refetch(); }}
              disabled={isFetching}
              title="Recalcular métricas desde la base de datos"
              className="grid h-[38px] w-[38px] place-items-center rounded-xl border border-white/20 bg-white/10 text-white backdrop-blur transition hover:border-cyan-300/60 hover:bg-white/20 disabled:cursor-wait disabled:opacity-70"
            >
              <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {isFetching && !isLoading && (
          <div className="absolute inset-x-0 bottom-0 h-[3px] overflow-hidden bg-white/10">
            <div className="ra-sheen h-full w-full opacity-80" />
          </div>
        )}
      </header>

      {/* ══════════ CUERPO ══════════ */}
      <div className="space-y-7 px-6 py-7 sm:px-8">
        {isLoading ? (
          <SkeletonPanel />
        ) : isError ? (
          <EstadoError onRetry={() => { void refetch(); }} />
        ) : !hayDatos ? (
          <EstadoVacio />
        ) : (
          <>
            {/* ---------- KPIs ---------- */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Tarjeta
                delay={0}
                acento="#4f46e5"
                icono={<Award size={18} />}
                etiqueta="Promedio institucional"
                valor={fmt(resumen?.promedio_general)}
                unidad="/ 20"
                pie={
                  <span className="inline-flex items-center gap-2">
                    <Sigma size={11} /> σ {fmt(resumen?.desviacion_estandar)}
                    <span className="text-slate-300">·</span>
                    {fmt(resumen?.nota_minima, 1)} – {fmt(resumen?.nota_maxima, 1)}
                  </span>
                }
              />
              <Tarjeta
                delay={70}
                acento={saludHex}
                icono={salud === 'baja' ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                etiqueta="Tasa de aprobación"
                valor={fmt(aprobacion, 1)}
                unidad="%"
                pie={
                  <span className="inline-flex items-center gap-2">
                    <b className="text-emerald-600">{resumen?.aprobados ?? 0}</b> aprobados
                    <span className="text-slate-300">·</span>
                    <b className="text-rose-600">{resumen?.reprobados ?? 0}</b> reprobados
                  </span>
                }
              />
              <Tarjeta
                delay={140}
                acento="#0ea5e9"
                icono={<Users size={18} />}
                etiqueta="Estudiantes evaluados"
                valor={String(cobertura?.estudiantes_evaluados ?? 0)}
                unidad={`/ ${cobertura?.estudiantes_activos ?? 0}`}
                pie={<>{totalEvaluaciones} calificación(es) oficial(es) registrada(s)</>}
              />
              <Tarjeta
                delay={210}
                acento="#a855f7"
                icono={<GraduationCap size={18} />}
                etiqueta="Cobertura de evaluación"
                valor={fmt(cobertura?.porcentaje_cobertura, 1)}
                unidad="%"
                pie={<>{cobertura?.notas_registradas ?? 0} notas totales en el sistema</>}
                progreso={cobertura?.porcentaje_cobertura ?? 0}
              />
            </div>

            {/* ---------- DISTRIBUCIÓN + ANILLO ---------- */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.55fr_1fr]">
              {/* Distribución por rangos */}
              <div className="ra-rise rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/70 p-5" style={{ animationDelay: '260ms' }}>
                <div className="mb-4 flex items-baseline justify-between gap-3">
                  <h3 className="text-[13px] font-black uppercase tracking-[.12em] text-slate-700">
                    Distribución de calificaciones
                  </h3>
                  <span className="ra-tnum text-[11px] font-semibold text-slate-400">
                    n = {totalEvaluaciones}
                  </span>
                </div>

                <div className="space-y-3.5">
                  {barras.map((b, i) => (
                    <div key={b.clave} className="group">
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-[3px] ring-2 ring-white"
                            style={{ background: b.hex, boxShadow: `0 0 0 1px ${b.hex}33` }} />
                          <span className="truncate text-[13px] font-semibold text-slate-700">{b.etiqueta}</span>
                          <span className="ra-tnum shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                            style={{ background: b.suave, color: b.texto }}>
                            {b.detalle}
                          </span>
                        </div>
                        <div className="ra-tnum flex shrink-0 items-baseline gap-2">
                          <span className="text-[15px] font-black text-slate-900">{b.cantidad}</span>
                          <span className="w-11 text-right text-[11px] font-semibold text-slate-400">
                            {b.porcentaje.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/70">
                        <div
                          className="ra-grow h-full rounded-full transition-all duration-500 group-hover:brightness-110"
                          style={{
                            width: `${Math.max((b.cantidad / maxCantidad) * 100, b.cantidad > 0 ? 4 : 0)}%`,
                            background: `linear-gradient(90deg, ${b.hex}, ${b.hex}b3)`,
                            boxShadow: b.cantidad > 0 ? `0 0 12px -2px ${b.hex}80` : 'none',
                            animationDelay: `${300 + i * 90}ms`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
                  <ShieldCheck size={15} className="mt-0.5 shrink-0 text-indigo-500" />
                  <p className="text-[11.5px] leading-relaxed text-indigo-900/80">
                    Mínimo aprobatorio: <b>12/20</b> en materias regulares y <b>16/20</b> en todas las materias
                    del eje Proyecto. Cada estudiante aporta una única calificación por materia y período.
                  </p>
                </div>
              </div>

              {/* Anillo de aprobación */}
              <div className="ra-rise flex flex-col rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white" style={{ animationDelay: '320ms' }}>
                <h3 className="mb-1 text-[13px] font-black uppercase tracking-[.12em] text-slate-300">
                  Balance de aprobación
                </h3>
                <p className="mb-3 text-[11px] text-slate-400">Proporción sobre notas oficiales</p>

                <div className="relative mx-auto my-1 grid place-items-center">
                  <svg width="150" height="150" viewBox="0 0 130 130" className="-rotate-90">
                    <defs>
                      <linearGradient id="ra-arco" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#34d399" />
                        <stop offset="55%" stopColor="#22d3ee" />
                        <stop offset="100%" stopColor="#818cf8" />
                      </linearGradient>
                    </defs>
                    <circle cx="65" cy="65" r={R} fill="none" stroke="#ffffff1a" strokeWidth="13" />
                    <circle
                      cx="65" cy="65" r={R} fill="none"
                      stroke={aprobacion >= 60 ? 'url(#ra-arco)' : '#f87171'}
                      strokeWidth="13" strokeLinecap="round"
                      strokeDasharray={`${arco} ${CIRC}`}
                      style={{ transition: 'stroke-dasharray .9s cubic-bezier(.22,1,.36,1)' }}
                    />
                  </svg>
                  <div className="absolute inset-0 grid place-content-center text-center">
                    <span className="ra-tnum block text-[30px] font-black leading-none">
                      {fmt(aprobacion, 1)}<span className="text-base font-bold text-slate-400">%</span>
                    </span>
                    <span className="mt-1 block text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">
                      aprobación
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl bg-emerald-400/10 p-3 ring-1 ring-emerald-400/25">
                    <div className="flex items-center gap-1.5 text-emerald-300">
                      <CheckCircle2 size={13} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Aprobados</span>
                    </div>
                    <span className="ra-tnum mt-1 block text-2xl font-black">{resumen?.aprobados ?? 0}</span>
                  </div>
                  <div className="rounded-xl bg-rose-400/10 p-3 ring-1 ring-rose-400/25">
                    <div className="flex items-center gap-1.5 text-rose-300">
                      <XCircle size={13} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Reprobados</span>
                    </div>
                    <span className="ra-tnum mt-1 block text-2xl font-black">{resumen?.reprobados ?? 0}</span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 divide-x divide-white/10 rounded-xl bg-white/5 py-2.5 text-center">
                  <MiniDato etiqueta="Mín" valor={fmt(resumen?.nota_minima, 1)} />
                  <MiniDato etiqueta="σ" valor={fmt(resumen?.desviacion_estandar)} />
                  <MiniDato etiqueta="Máx" valor={fmt(resumen?.nota_maxima, 1)} />
                </div>
              </div>
            </div>

            {/* ---------- DESEMPEÑO POR PROGRAMA ---------- */}
            {porPrograma.length > 0 && (
              <div className="ra-rise" style={{ animationDelay: '380ms' }}>
                <h3 className="mb-3 text-[13px] font-black uppercase tracking-[.12em] text-slate-700">
                  Desempeño por programa
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {porPrograma.map((p: DesempenoPrograma, i: number) => {
                    const ok = p.porcentaje_aprobacion >= 80;
                    const mid = p.porcentaje_aprobacion >= 60 && !ok;
                    const hex = ok ? '#0f9d58' : mid ? '#e08600' : '#dc2626';
                    return (
                      <article
                        key={p.codigo}
                        className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
                        style={{ animationDelay: `${400 + i * 80}ms` }}
                      >
                        <span className="absolute inset-y-0 left-0 w-1" style={{ background: hex }} />
                        <div className="flex items-start justify-between gap-3 pl-2">
                          <div className="min-w-0">
                            <span className="ra-tnum inline-block rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-black tracking-wider text-white">
                              {p.codigo}
                            </span>
                            <p className="mt-1.5 truncate text-[13px] font-semibold text-slate-700" title={p.nombre}>
                              {p.nombre}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="ra-tnum block text-[22px] font-black leading-none" style={{ color: hex }}>
                              {fmt(p.porcentaje_aprobacion, 1)}%
                            </span>
                            <span className="ra-tnum mt-1 block text-[11px] font-semibold text-slate-400">
                              x̄ {fmt(p.promedio)}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 pl-2">
                          <div className="h-2 overflow-hidden rounded-full bg-slate-200/80">
                            <div
                              className="ra-grow h-full rounded-full"
                              style={{
                                width: `${Math.max(p.porcentaje_aprobacion, 1.5)}%`,
                                background: `linear-gradient(90deg,${hex},${hex}99)`,
                                animationDelay: `${460 + i * 80}ms`,
                              }}
                            />
                          </div>
                          <p className="ra-tnum mt-2 text-[11px] text-slate-500">
                            {p.estudiantes} estudiante(s) · {p.evaluaciones} evaluación(es) ·{' '}
                            <b className="text-emerald-600">{p.aprobados}</b> aprobada(s)
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ---------- MATERIAS EN RIESGO ---------- */}
            <div className="ra-rise" style={{ animationDelay: '460ms' }}>
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                <h3 className="text-[13px] font-black uppercase tracking-[.12em] text-slate-700">
                  Materias con reprobación
                </h3>
                {riesgo.length > 0 && (
                  <span className="ra-tnum rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">
                    {riesgo.length}
                  </span>
                )}
              </div>

              {riesgo.length === 0 ? (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50/60 p-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500 text-white shadow-sm">
                    <CheckCircle2 size={18} />
                  </span>
                  <p className="text-[13px] font-medium text-emerald-900">
                    Ninguna materia presenta reprobación en el período consultado.
                  </p>
                </div>
              ) : (
                <div className="ra-scroll overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full min-w-[680px] border-collapse">
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-100 to-slate-50">
                        {['Programa', 'Unidad curricular', 'Ubicación', 'Evaluados', 'Promedio', 'Aprobación'].map((h: string) => (
                          <th key={h} className="border-b border-slate-200 px-3.5 py-2.5 text-left text-[10px] font-black uppercase tracking-[.1em] text-slate-500">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {riesgo.map((m: MateriaRiesgo, i: number) => {
                        const hex = m.porcentaje_aprobacion >= 70 ? '#0f9d58'
                          : m.porcentaje_aprobacion >= 50 ? '#e08600' : '#dc2626';
                        return (
                          <tr key={`${m.cod_programa}-${m.materia}-${i}`}
                            className="border-b border-slate-100 transition last:border-0 hover:bg-amber-50/40">
                            <td className="px-3.5 py-2.5">
                              <span className="ra-tnum rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] font-black tracking-wider text-white">
                                {m.cod_programa}
                              </span>
                            </td>
                            <td className="max-w-[260px] px-3.5 py-2.5">
                              <p className="truncate text-[13px] font-medium text-slate-800" title={m.materia}>{m.materia}</p>
                              <p className="text-[10.5px] text-slate-400">{m.periodo_academico}</p>
                            </td>
                            <td className="ra-tnum px-3.5 py-2.5 text-[11.5px] font-semibold text-slate-500">
                              T{aRomano(m.trayecto)} · P{aRomano(m.periodo)}
                            </td>
                            <td className="ra-tnum px-3.5 py-2.5 text-[13px] text-slate-700">{m.evaluados}</td>
                            <td className="ra-tnum px-3.5 py-2.5 text-[13px] font-black text-slate-900">{fmt(m.promedio)}</td>
                            <td className="px-3.5 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="ra-tnum inline-flex min-w-[52px] justify-center rounded-full px-2 py-0.5 text-[11px] font-black text-white"
                                  style={{ background: hex }}>
                                  {fmt(m.porcentaje_aprobacion, 1)}%
                                </span>
                                <span className="ra-tnum text-[10.5px] font-semibold text-rose-500">
                                  {m.reprobados} rep.
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ---------- NOTA METODOLÓGICA ---------- */}
            <div className="ra-rise flex items-start gap-3 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-indigo-50/50 p-4" style={{ animationDelay: '520ms' }}>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-600 text-white shadow-sm">
                <Info size={15} />
              </span>
              <p className="text-[12px] leading-relaxed text-slate-600">
                Las métricas se calculan en <b className="text-slate-800">PostgreSQL</b> mediante{' '}
                <code className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10.5px] text-cyan-300">DISTINCT ON</code>{' '}
                con orden de precedencia, garantizando <b className="text-slate-800">una sola nota oficial por
                estudiante-materia-período</b>. Si existe Recuperación, esta sustituye a la Final. La desviación
                estándar (σ) expresa la dispersión del grupo: valores bajos indican desempeño homogéneo.
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

/* ============================================================
   SUBCOMPONENTES
   ============================================================ */
const Tarjeta = ({ delay, acento, icono, etiqueta, valor, unidad, pie, progreso }: {
  delay: number; acento: string; icono: ReactNode; etiqueta: string;
  valor: string; unidad?: string; pie: ReactNode; progreso?: number;
}): ReactNode => (
  <article
    className="ra-rise group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-14px_rgba(16,24,40,.28)]"
    style={{ animationDelay: `${delay}ms` }}
  >
    <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-[.09] blur-xl transition-opacity duration-300 group-hover:opacity-20"
      style={{ background: acento }} />
    <div className="relative flex items-start justify-between gap-2">
      <p className="text-[10px] font-black uppercase leading-tight tracking-[.12em] text-slate-500">{etiqueta}</p>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white shadow-sm"
        style={{ background: acento, boxShadow: `0 6px 16px -6px ${acento}` }}>
        {icono}
      </span>
    </div>
    <p className="ra-tnum relative mt-2.5 flex items-baseline gap-1">
      <span className="text-[30px] font-black leading-none text-slate-900">{valor}</span>
      {unidad && <span className="text-[13px] font-bold text-slate-400">{unidad}</span>}
    </p>
    {typeof progreso === 'number' && (
      <div className="relative mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-200/80">
        <div className="ra-grow h-full rounded-full"
          style={{ width: `${Math.max(progreso, 1.5)}%`, background: acento, animationDelay: `${delay + 120}ms` }} />
      </div>
    )}
    <p className="ra-tnum relative mt-2 text-[11px] font-medium leading-snug text-slate-500">{pie}</p>
  </article>
);

const MiniDato = ({ etiqueta, valor }: { etiqueta: string; valor: string }): ReactNode => (
  <div className="px-1">
    <span className="block text-[9.5px] font-bold uppercase tracking-[.14em] text-slate-400">{etiqueta}</span>
    <span className="ra-tnum mt-0.5 block text-[15px] font-black text-white">{valor}</span>
  </div>
);

const SkeletonPanel = (): ReactNode => (
  <div className="space-y-5">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map((i: number) => (
        <div key={i} className="rounded-2xl border border-slate-200 p-4">
          <div className="ra-sheen h-2.5 w-24 rounded-full" />
          <div className="ra-sheen mt-3 h-8 w-20 rounded-lg" />
          <div className="ra-sheen mt-3 h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.55fr_1fr]">
      <div className="rounded-2xl border border-slate-200 p-5">
        {[0, 1, 2, 3, 4].map((i: number) => (
          <div key={i} className="mb-4">
            <div className="ra-sheen mb-2 h-2.5 w-32 rounded-full" />
            <div className="ra-sheen h-2.5 w-full rounded-full" />
          </div>
        ))}
      </div>
      <div className="grid place-items-center rounded-2xl border border-slate-200 p-5">
        <div className="h-[150px] w-[150px] animate-pulse rounded-full border-[13px] border-slate-200" />
      </div>
    </div>
    <p className="text-center text-[12px] font-medium text-slate-400">
      Calculando métricas académicas en el motor de base de datos…
    </p>
  </div>
);

const EstadoVacio = (): ReactNode => (
  <div className="grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-gradient-to-b from-slate-50 to-white px-6 py-14 text-center">
    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg">
      <GraduationCap size={26} />
    </span>
    <p className="mt-4 text-[15px] font-bold text-slate-800">Sin calificaciones oficiales registradas</p>
    <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-slate-500">
      Carga un acta de tipo <b className="text-slate-700">Final</b> en el módulo de Notas para habilitar
      los indicadores de promedio, aprobación y dispersión.
    </p>
    <a href="/notas"
      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-indigo-700">
      <Sparkles size={15} /> Ir al acta de calificaciones
    </a>
  </div>
);

const EstadoError = ({ onRetry }: { onRetry: () => void }): ReactNode => (
  <div className="grid place-items-center rounded-2xl border border-rose-200 bg-gradient-to-b from-rose-50 to-white px-6 py-12 text-center">
    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-500 text-white shadow-lg">
      <AlertTriangle size={22} />
    </span>
    <p className="mt-3.5 text-[15px] font-bold text-slate-800">No se pudieron calcular las métricas</p>
    <p className="mt-1.5 max-w-sm text-[12.5px] text-slate-500">
      Verifica que el backend esté activo y que tu sesión siga vigente.
    </p>
    <button type="button" onClick={onRetry}
      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-rose-600">
      <RefreshCw size={15} /> Reintentar
    </button>
  </div>
);
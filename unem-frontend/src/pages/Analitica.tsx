import { useState, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analyticsService';
import type {
  PuntoTendencia, FilaTrayecto, FilaEje, FilaOcupacionDia, FilaGeografia, BinHistograma,
  PrediccionesData, PuntoSerie, PuntoProyeccion, MateriaRiesgoPred, EstudianteRiesgo, CargaPorDia, CoberturaSeccion,
} from '../services/analyticsService';
import {
  BarChart3, TrendingUp, Layers, CalendarRange, MapPin, RefreshCw, Info, Sparkles,
} from 'lucide-react';
import {
  ComposedChart, Area, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';

type Tab = 'secciones' | 'tendencia' | 'trayectos' | 'ejes' | 'ocupacion' | 'geografia' | 'predicciones';

const AZUL = '#1E88E5';
const INDIGO = '#2E3192';
const CIAN = '#00B8D4';
const LILA = '#7C7CC9';
const VERDE = '#0f9d58';
const AMBAR = '#e08600';

const etiquetaBin = (b: number): string => `${(b - 1) * 2}–${b * 2}`;

export const Analitica = (): ReactNode => {
  const [tab, setTab] = useState<Tab>('secciones');
  const [idDia, setIdDia] = useState<number>(6); // 6 = Sábado por defecto
  const [idProPred, setIdProPred] = useState<number | undefined>(undefined);
  const [tamanoEscenario, setTamanoEscenario] = useState(20);
  // Analítica utiliza el resumen de ocupación (solo lectura) y ya no
  // depende del CRUD de Días Laborales, restringido al Coordinador.
  const qDias = useQuery<CargaPorDia[]>({
    queryKey: ['ana', 'dias-resumen'],
    queryFn: analyticsService.getCargaPorDia,
  });
  const diasActivos = qDias.data ?? [];
  const diaNombre = diasActivos.find((d) => d.id_dia === idDia)?.dia ?? 'Día';

  useEffect(() => {
    if (diasActivos.length && !diasActivos.some((d) => d.id_dia === idDia)) {
      setIdDia(diasActivos[0].id_dia);
    }
  }, [qDias.data, idDia]);

  const qSec = useQuery<CoberturaSeccion[]>({ queryKey: ['ana', 'cobertura-secciones'], queryFn: analyticsService.getCoberturaSecciones, enabled: tab === 'secciones' });
  const qTen = useQuery<PuntoTendencia[]>({ queryKey: ['ana', 'ten'], queryFn: analyticsService.getTendencia, enabled: tab === 'tendencia' });
  const qHis = useQuery<BinHistograma[]>({ queryKey: ['ana', 'his'], queryFn: analyticsService.getHistograma, enabled: tab === 'tendencia' });
  const qTra = useQuery<FilaTrayecto[]>({ queryKey: ['ana', 'tra'], queryFn: () => analyticsService.getTrayectos(), enabled: tab === 'trayectos' });
  const qEje = useQuery<FilaEje[]>({ queryKey: ['ana', 'eje'], queryFn: analyticsService.getEjes, enabled: tab === 'ejes' });
  const qOcu = useQuery<FilaOcupacionDia[]>({ queryKey: ['ana', 'ocu', idDia], queryFn: () => analyticsService.getOcupacionPorDia(idDia), enabled: tab === 'ocupacion' });
  const qGeo = useQuery<FilaGeografia[]>({ queryKey: ['ana', 'geo'], queryFn: analyticsService.getGeografia, enabled: tab === 'geografia' });

  const qPre = useQuery<PrediccionesData>({
    queryKey: ['ana', 'pre', idProPred, tamanoEscenario],
    queryFn: () => analyticsService.getPredicciones(idProPred, 2, tamanoEscenario),
    enabled: tab === 'predicciones',
  });

  const activa = tab === 'secciones' ? qSec : tab === 'tendencia' ? qTen : tab === 'trayectos' ? qTra : tab === 'ejes' ? qEje
    : tab === 'ocupacion' ? qOcu : tab === 'geografia' ? qGeo : qPre;

  const seriePred = useMemo(() => {
    const d = qPre.data;
    if (!d) return [];
    const hist = d.serie.map((p: PuntoSerie) => ({
      etiqueta: p.periodo, promedio: p.promedio, proyectado: null as number | null,
    }));
    const fut = d.proyeccion.map((p: PuntoProyeccion) => ({
      etiqueta: p.etiqueta, promedio: null as number | null, proyectado: p.promedio_proyectado,
    }));
    if (hist.length > 0 && fut.length > 0) {
      fut[0] = { ...fut[0], promedio: hist[hist.length - 1].promedio };
    }
    return [...hist, ...fut];
  }, [qPre.data]);

  const bins = (qHis.data ?? []).map((b: BinHistograma) => ({ label: etiquetaBin(b.bin), cantidad: b.cantidad }));
  const trayectos = (qTra.data ?? []).map((t: FilaTrayecto) => ({ ...t, label: `${t.cod_programa} · T${t.trayecto}` }));
  const geoTop = (qGeo.data ?? []).slice(0, 8);

  return (
    <div className="unem-page">
      <section className="unem-hero">
        <div className="unem-hero-row">
          <div style={{ display: 'flex', gap: 15, minWidth: 0 }}>
            <span className="unem-hero-ico"><BarChart3 size={22} /></span>
            <div style={{ minWidth: 0 }}>
              <h1>Analítica Académica</h1>
              <p>
                Cobertura de evaluaciones por sección, rendimiento académico validado,
                ocupación de espacios y comparativas por carrera. Datos agregados desde PostgreSQL.
              </p>
            </div>
          </div>
          <button className="unem-btn" onClick={() => { void activa.refetch(); }} disabled={activa.isFetching}>
            <RefreshCw size={15} className={activa.isFetching ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>
      </section>

      <div className="unem-seg" style={{ alignSelf: 'flex-start' }}>
        <button data-on={tab === 'secciones'} onClick={() => setTab('secciones')}><Layers size={13} style={{ marginRight: 5, verticalAlign: '-2px' }} />Secciones</button>
        <button data-on={tab === 'tendencia'} onClick={() => setTab('tendencia')}><TrendingUp size={13} style={{ marginRight: 5, verticalAlign: '-2px' }} />Rendimiento</button>
        <button data-on={tab === 'trayectos'} onClick={() => setTab('trayectos')}><Layers size={13} style={{ marginRight: 5, verticalAlign: '-2px' }} />Trayectos</button>
        <button data-on={tab === 'ejes'} onClick={() => setTab('ejes')}><BarChart3 size={13} style={{ marginRight: 5, verticalAlign: '-2px' }} />Ejes</button>
        <button data-on={tab === 'ocupacion'} onClick={() => setTab('ocupacion')}><CalendarRange size={13} style={{ marginRight: 5, verticalAlign: '-2px' }} />Ocupación</button>
        <button data-on={tab === 'geografia'} onClick={() => setTab('geografia')}><MapPin size={13} style={{ marginRight: 5, verticalAlign: '-2px' }} />Geografía</button>
        <button data-on={tab === 'predicciones'} onClick={() => setTab('predicciones')}><Sparkles size={13} style={{ marginRight: 5, verticalAlign: '-2px' }} />Predicciones</button>
      </div>

      {activa.isLoading ? (
        <section className="unem-card unem-card-pad">
          {[0, 1, 2].map((i: number) => <div key={i} className="unem-skel" style={{ height: 60, marginBottom: 10 }} />)}
        </section>
      ) : activa.isError ? (
        <div className="unem-note" style={{ borderColor: '#fecaca', background: '#fef2f2', color: '#991b1b' }}>
          <Info size={16} /><span>No se pudo cargar el análisis. Verifica sesión y backend.</span>
        </div>
      ) : (
        <>
          {tab === 'secciones' && (
            <div className="unem-card unem-card-pad">
              <h2 className="text-xl font-bold text-gray-900">Cobertura de evaluación por sección</h2>
              <p className="text-sm text-gray-500 mt-1 mb-5">
                Alumnos con al menos una calificación final o de recuperación validada. Esta medida no equivale al porcentaje de materias completadas.
              </p>
              {(qSec.data ?? []).length === 0 ? (
                <div className="unem-note"><Info size={16} /><span>No se encontraron secciones activas.</span></div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                      <p className="text-xs font-bold text-indigo-700">Matrícula</p>
                      <p className="text-2xl font-bold text-indigo-900">{(qSec.data ?? []).reduce((n, s) => n + s.estudiantes, 0)}</p>
                      <p className="text-xs text-indigo-700">Estudiantes en las secciones activas</p>
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                      <p className="text-xs font-bold text-emerald-700">Alumnos evaluados</p>
                      <p className="text-2xl font-bold text-emerald-900">{(qSec.data ?? []).reduce((n, s) => n + s.evaluados, 0)}</p>
                      <p className="text-xs text-emerald-700">Con nota oficial validada</p>
                    </div>
                    <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                      <p className="text-xs font-bold text-amber-700">Secciones sin evaluación</p>
                      <p className="text-2xl font-bold text-amber-900">{(qSec.data ?? []).filter((s) => s.evaluados === 0).length}</p>
                      <p className="text-xs text-amber-700">Pendientes de registrar notas</p>
                    </div>
                  </div>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={(qSec.data ?? []).map((s) => ({ ...s, label: `${s.cod_programa}-${s.codigo.split('.').slice(-1)[0]}` }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="estudiantes" name="Matriculados" fill={AZUL} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="evaluados" name="Evaluados" fill={VERDE} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="unem-table-wrap unem-scroll" style={{ marginTop: 18 }}>
                    <table className="unem-table">
                      <thead><tr><th>Programa</th><th>Sección</th><th>Matriculados/capacidad</th><th>Materias programadas</th><th>Alumnos evaluados</th><th>Cobertura</th></tr></thead>
                      <tbody>
                        {(qSec.data ?? []).map((s) => (
                          <tr key={s.id_sec}>
                            <td className="unem-strong">{s.cod_programa}</td>
                            <td>{s.codigo}</td>
                            <td>{s.estudiantes}/{s.capacidad} ({s.ocupacion_pct}%)</td>
                            <td>{s.materias_programadas}</td>
                            <td>{s.evaluados}/{s.estudiantes}</td>
                            <td className="unem-strong">{s.cobertura_pct}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="unem-note" style={{ marginTop: 14 }}>
                    <Info size={16} />
                    <span>La analítica se basa exclusivamente en notas validadas. Una sección sin notas no implica bajo rendimiento, sino información aún no disponible.</span>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'tendencia' && (
            <div className="unem-card unem-card-pad">
              <b style={{ fontSize: 12, color: 'var(--tx-2)' }}>Promedio y % de aprobación por período</b>
              {(qTen.data?.length ?? 0) < 2 && (
                <div className="unem-note" style={{ marginTop: 12, marginBottom: 8 }}>
                  <Info size={16} /><span>Solo existe {qTen.data?.length ?? 0} período(s) con notas oficiales: se muestra un corte descriptivo, no una tendencia histórica.</span>
                </div>
              )}
              <div style={{ height: 300, marginTop: 12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={qTen.data ?? []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" domain={[0, 20]} tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area yAxisId="left" dataKey="promedio" name="Promedio" stroke={INDIGO} fill={INDIGO} fillOpacity={0.15} />
                    <Line yAxisId="right" dataKey="pct_aprobacion" name="% Aprobación" stroke={VERDE} strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <b style={{ fontSize: 12, color: 'var(--tx-2)', display: 'block', marginTop: 18 }}>Histograma de notas (bins de 2 puntos)</b>
              <div style={{ height: 220, marginTop: 12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bins}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="cantidad" name="Estudiantes" radius={[4, 4, 0, 0]}>
                      {bins.map((b, i: number) => (
                        <Cell key={b.label} fill={i >= 5 ? VERDE : i >= 3 ? AMBAR : '#dc2626'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {tab === 'trayectos' && (
            <div className="unem-card unem-card-pad">
              <b style={{ fontSize: 12, color: 'var(--tx-2)' }}>Promedio por trayecto y programa</b>
              <div style={{ height: 300, marginTop: 12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trayectos}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 20]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="promedio" name="Promedio" radius={[4, 4, 0, 0]}>
                      {trayectos.map((t) => (
                        <Cell key={t.label} fill={t.cod_programa === 'LPRI' ? AZUL : CIAN} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <TablaTrayectos filas={qTra.data ?? []} />
            </div>
          )}

          {tab === 'ejes' && (
            <div className="unem-card unem-card-pad">
              <b style={{ fontSize: 12, color: 'var(--tx-2)' }}>Promedio por eje formativo</b>
              <div style={{ height: 300, marginTop: 12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={qEje.data ?? []} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                    <XAxis type="number" domain={[0, 20]} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="eje" width={150} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="promedio" name="Promedio" fill={LILA} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <TablaEjes filas={qEje.data ?? []} />
            </div>
          )}

          {tab === 'ocupacion' && (
            <div className="unem-card unem-card-pad">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                <b style={{ fontSize: 12, color: 'var(--tx-2)' }}>Horas ocupadas por aula — {diaNombre}</b>
                <select className="unem-select" value={idDia} onChange={(e) => setIdDia(Number(e.target.value))}>
                  {diasActivos.map((d) => (
                    <option key={d.id_dia} value={d.id_dia}>{d.dia}</option>
                  ))}
                </select>
              </div>
              <div style={{ height: 300, marginTop: 12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={qOcu.data ?? []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="aula" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="horas_ocupadas" name="Horas" fill={AMBAR} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <TablaOcupacion filas={qOcu.data ?? []} />
            </div>
          )}

          {tab === 'geografia' && (
            <div className="unem-card unem-card-pad">
              <b style={{ fontSize: 12, color: 'var(--tx-2)' }}>Estudiantes activos por municipio (top 8)</b>
              <div style={{ height: 300, marginTop: 12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={geoTop}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="municipio" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="estudiantes" name="Estudiantes" fill={AZUL} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <TablaGeo filas={qGeo.data ?? []} />
            </div>
          )}

          {tab === 'predicciones' && qPre.data && (
            <div className="unem-card unem-card-pad">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                <b style={{ fontSize: 12, color: 'var(--tx-2)' }}>Proyección de promedio y aprobación</b>
                <select
                  className="unem-select"
                  value={idProPred ?? ''}
                  onChange={(e) => setIdProPred(e.target.value ? Number(e.target.value) : undefined)}
                >
                  <option value="">Todos los programas</option>
                  <option value="1">LPRI — Educación Primaria</option>
                  <option value="2">LESP — Educación Especial</option>
                </select>
                <span className={`unem-chip ${qPre.data.confiable ? 'unem-chip-ins' : 'unem-chip-soft'}`}>
                  {qPre.data.confiable ? 'Tendencia histórica' : 'Sin tendencia histórica'}
                </span>
                <span className="unem-chip unem-chip-mut">{qPre.data.n_periodos} período(s)</span>
                {qPre.data.r2_promedio !== null && (
                  <span className="unem-chip unem-chip-mut">R² = {qPre.data.r2_promedio.toFixed(3)}</span>
                )}
              </div>

              {qPre.data.aviso && (
                <div className="unem-note" style={{ marginBottom: 12 }}>
                  <Info size={16} /><span>{qPre.data.aviso}</span>
                </div>
              )}

              {/* Proyección condicional calculada a partir de notas reales, sin inventar períodos. */}
              <div style={{ border: '1px solid #c7d2fe', borderRadius: 14, padding: 18, background: '#f8faff', marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <b style={{ color: '#312e81', fontSize: 15 }}>Escenario de continuidad académica</b>
                    <p style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                      ¿Qué ocurriría si las siguientes evaluaciones mantuvieran el porcentaje de aprobación observado?
                    </p>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#334155' }}>
                    Evaluaciones hipotéticas
                    <select className="unem-select" value={tamanoEscenario}
                      onChange={(e) => setTamanoEscenario(Number(e.target.value))}>
                      {[10, 20, 30, 40, 60, 80, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                </div>
                {qPre.data.escenario ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ marginTop: 15 }}>
                      <div className="rounded-xl border border-indigo-100 bg-white p-4">
                        <p className="text-xs font-semibold text-indigo-700">Aprobatorias estimadas</p>
                        <p className="text-3xl font-bold text-indigo-900">{qPre.data.escenario.estimadas_aprobatorias} <span className="text-sm font-normal">de {tamanoEscenario}</span></p>
                        <p className="text-xs text-slate-600">Solo bajo el supuesto de continuidad</p>
                      </div>
                      <div className="rounded-xl border border-sky-100 bg-white p-4">
                        <p className="text-xs font-semibold text-sky-700">Tasa observada</p>
                        <p className="text-3xl font-bold text-sky-900">{qPre.data.escenario.tasa_aprobacion_observada.toFixed(1)}%</p>
                        <p className="text-xs text-slate-600">Base: {qPre.data.escenario.n_calificaciones_base} notas finales validadas</p>
                      </div>
                      <div className="rounded-xl border border-amber-100 bg-white p-4">
                        <p className="text-xs font-semibold text-amber-700">Promedio de referencia</p>
                        <p className="text-3xl font-bold text-amber-900">{qPre.data.escenario.promedio_referencia.toFixed(2)} <span className="text-sm font-normal">/20</span></p>
                        <p className="text-xs text-slate-600">No es promedio predicho por regresión</p>
                      </div>
                    </div>
                    <div style={{ height: 190, marginTop: 15 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { tipo: 'Aprobatorias', cantidad: qPre.data.escenario.estimadas_aprobatorias },
                          { tipo: 'No aprobatorias', cantidad: qPre.data.escenario.estimadas_no_aprobatorias },
                        ]} layout="vertical" margin={{ left: 20, right: 24 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                          <XAxis type="number" allowDecimals={false} domain={[0, tamanoEscenario]} />
                          <YAxis type="category" dataKey="tipo" width={108} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="cantidad" name="Evaluaciones estimadas" radius={[0, 6, 6, 0]}>
                            <Cell fill={VERDE} /><Cell fill={AMBAR} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p style={{ fontSize: 12, marginTop: 8, color: '#475569' }}>
                      Referencia: <b>{qPre.data.escenario.periodo_base}</b> · {qPre.data.escenario.n_estudiantes_base} estudiantes con notas.
                      Intervalo de Wilson al 95% para la <b>tasa observada</b>: <b>
                      {qPre.data.escenario.limite_inferior_tasa_wilson_95.toFixed(1)}%–{qPre.data.escenario.limite_superior_tasa_wilson_95.toFixed(1)}%</b>.
                    </p>
                    {qPre.data.escenario.n_calificaciones_demo > 0 && (
                      <div className="unem-note" style={{ marginTop: 12, background: '#fffbeb', borderColor: '#fcd34d' }}>
                        <Info size={16} /><span>El cálculo incluye <b>{qPre.data.escenario.n_calificaciones_demo}</b> calificaciones etiquetadas como datos sintéticos de demostración. No equivale a un estudio de rendimiento institucional real.</span>
                      </div>
                    )}
                    <div className="unem-note" style={{ marginTop: 12 }}>
                      <Info size={16} /><span>{qPre.data.escenario.advertencia}</span>
                    </div>
                  </>
                ) : (
                  <div className="unem-note" style={{ marginTop: 12 }}>
                    <Info size={16} /><span>No hay notas definitivas validadas para calcular un escenario en el programa seleccionado.</span>
                  </div>
                )}
              </div>

              {!qPre.data.confiable && (
                <div className="unem-note" style={{ marginTop: 12 }}>
                  <Info size={16} /><span>No hay pronóstico de tendencia histórica: se requieren al menos tres períodos comparables. El escenario mostrado arriba es condicional, no sustituye una predicción temporal validada.</span>
                </div>
              )}
              {qPre.data.confiable && <div style={{ height: 300, marginTop: 12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={seriePred}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 20]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <ReferenceLine y={12} stroke="#dc2626" strokeDasharray="4 4" />
                    <Line dataKey="promedio" name="Promedio histórico" stroke={INDIGO} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                    <Line dataKey="proyectado" name="Promedio proyectado" stroke={CIAN} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>}

              <p style={{ fontSize: 11.5, color: 'var(--tx-3)', marginTop: 10 }}>
                {qPre.data.metodo}
                {qPre.data.pendiente_promedio !== null && (
                  <> · Pendiente del promedio: <b>{qPre.data.pendiente_promedio.toFixed(3)}</b> pts/período
                    {qPre.data.pendiente_promedio >= 0 ? ' (tendencia al alza)' : ' (tendencia a la baja)'}</>
                )}
              </p>

              {qPre.data.confiable && qPre.data.proyeccion.length > 0 && (
                <div className="unem-table-wrap unem-scroll" style={{ marginTop: 14 }}>
                  <table className="unem-table">
                    <thead><tr><th>Escenario</th><th>Promedio proyectado</th><th>% Aprobación proyectado</th></tr></thead>
                    <tbody>
                      {qPre.data.proyeccion.map((p: PuntoProyeccion) => (
                        <tr key={p.paso}>
                          <td className="unem-strong">{p.etiqueta}</td>
                          <td className="unem-mono unem-strong">{p.promedio_proyectado.toFixed(2)}</td>
                          <td className="unem-mono">{p.pct_aprobacion_proyectado.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <b style={{ fontSize: 12, color: 'var(--tx-2)', display: 'block', marginTop: 20 }}>Materias en riesgo académico</b>
              <TablaRiesgoMaterias filas={qPre.data.materias_riesgo} />

              <b style={{ fontSize: 12, color: 'var(--tx-2)', display: 'block', marginTop: 20 }}>Estudiantes en riesgo académico</b>
              <TablaRiesgoEstudiantes filas={qPre.data.estudiantes_riesgo} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

const TablaTrayectos = ({ filas }: { filas: FilaTrayecto[] }): ReactNode => (
  <div className="unem-table-wrap unem-scroll" style={{ marginTop: 16 }}>
    <table className="unem-table">
      <thead><tr><th>Programa</th><th>Trayecto</th><th>Evaluados</th><th>Promedio</th><th>% Aprob.</th></tr></thead>
      <tbody>
        {filas.map((f: FilaTrayecto) => (
          <tr key={`${f.cod_programa}-${f.trayecto}`}>
            <td className="unem-strong">{f.cod_programa}</td><td>T{f.trayecto}</td>
            <td>{f.estudiantes}</td><td className="unem-mono unem-strong">{f.promedio.toFixed(2)}</td>
            <td>{f.pct_aprobacion.toFixed(1)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const TablaEjes = ({ filas }: { filas: FilaEje[] }): ReactNode => (
  <div className="unem-table-wrap unem-scroll" style={{ marginTop: 16 }}>
    <table className="unem-table">
      <thead><tr><th>Eje</th><th>Materias</th><th>Evaluaciones</th><th>Promedio</th><th>% Aprob.</th></tr></thead>
      <tbody>
        {filas.map((f: FilaEje) => (
          <tr key={f.cod_eje}>
            <td className="unem-strong">{f.eje}</td><td>{f.materias}</td><td>{f.evaluaciones}</td>
            <td className="unem-mono unem-strong">{f.promedio.toFixed(2)}</td><td>{f.pct_aprobacion.toFixed(1)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const TablaOcupacion = ({ filas }: { filas: FilaOcupacionDia[] }): ReactNode => (
  <div className="unem-table-wrap unem-scroll" style={{ marginTop: 16 }}>
    <table className="unem-table">
      <thead><tr><th>Aula</th><th>Centro</th><th>Capacidad</th><th>Asignaciones</th><th>Horas</th></tr></thead>
      <tbody>
        {filas.map((f: FilaOcupacionDia) => (
          <tr key={f.id_esp}>
            <td className="unem-strong">{f.aula}</td><td>{f.nombre_centro}</td><td>{f.capacidad}</td>
            <td>{f.total_asignaciones}</td><td className="unem-mono unem-strong">{f.horas_ocupadas.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const TablaGeo = ({ filas }: { filas: FilaGeografia[] }): ReactNode => (
  <div className="unem-table-wrap unem-scroll" style={{ marginTop: 16 }}>
    <table className="unem-table">
      <thead><tr><th>Municipio</th><th>Estudiantes</th><th>Docentes</th><th>Espacios</th></tr></thead>
      <tbody>
        {filas.map((f: FilaGeografia) => (
          <tr key={f.id_mun}>
            <td className="unem-strong">{f.municipio}</td><td>{f.estudiantes}</td>
            <td>{f.docentes}</td><td>{f.espacios}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);



const BadgeRiesgo = ({ nivel }: { nivel: string }): ReactNode => (
  <span className={`unem-chip ${nivel === 'ALTO' ? 'unem-chip-del' : nivel === 'MEDIO' ? 'unem-chip-soft' : 'unem-chip-ins'}`}>
    {nivel}
  </span>
);

const TablaRiesgoMaterias = ({ filas }: { filas: MateriaRiesgoPred[] }): ReactNode => (
  filas.length === 0 ? (
    <div className="unem-note" style={{ marginTop: 10 }}>
      <Info size={16} /><span>No hay materias con riesgo identificado entre las calificaciones validadas disponibles.</span>
    </div>
  ) : (
    <div className="unem-table-wrap unem-scroll" style={{ marginTop: 10 }}>
      <table className="unem-table">
        <thead><tr>
          <th>Programa</th><th>Materia</th><th>Trayecto</th><th>Evaluados</th>
          <th>Promedio</th><th>Reprobados</th><th>% Aprob.</th><th>Riesgo</th>
        </tr></thead>
        <tbody>
          {filas.map((f: MateriaRiesgoPred) => (
            <tr key={`${f.cod_programa}-${f.materia}-${f.trayecto}-${f.periodo}`}>
              <td className="unem-strong">{f.cod_programa}</td>
              <td><span className="unem-ell" style={{ maxWidth: 260 }}>{f.materia}</span></td>
              <td>T{f.trayecto} · P{f.periodo}</td>
              <td>{f.evaluados}</td>
              <td className="unem-mono unem-strong">{f.promedio.toFixed(2)}</td>
              <td>{f.reprobados}</td>
              <td className="unem-mono">{f.pct_aprobacion.toFixed(1)}%</td>
              <td><BadgeRiesgo nivel={f.nivel} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
);

const TablaRiesgoEstudiantes = ({ filas }: { filas: EstudianteRiesgo[] }): ReactNode => (
  filas.length === 0 ? (
    <div className="unem-note" style={{ marginTop: 10 }}>
      <Info size={16} /><span>No se identificaron estudiantes en riesgo con las calificaciones validadas disponibles.</span>
    </div>
  ) : (
    <div className="unem-table-wrap unem-scroll" style={{ marginTop: 10 }}>
      <table className="unem-table">
        <thead><tr>
          <th>Cédula</th><th>Estudiante</th><th>Programa</th>
          <th>Materias</th><th>Reprobadas</th><th>Promedio</th><th>Riesgo</th>
        </tr></thead>
        <tbody>
          {filas.map((f: EstudianteRiesgo) => (
            <tr key={f.id_est}>
              <td className="unem-mono">{f.cedula}</td>
              <td className="unem-strong">{f.estudiante}</td>
              <td>{f.cod_programa}</td>
              <td>{f.materias_evaluadas}</td>
              <td>{f.materias_reprobadas}</td>
              <td className="unem-mono unem-strong">{f.promedio.toFixed(2)}</td>
              <td><BadgeRiesgo nivel={f.nivel} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
);

export const AnaliticaPage = Analitica;
export default Analitica;
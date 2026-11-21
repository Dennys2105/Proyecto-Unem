import { useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analyticsService';
import type {
  PuntoTendencia, FilaTrayecto, FilaEje, FilaOcupacionDia, FilaGeografia, BinHistograma,
  PrediccionesData, PuntoSerie, PuntoProyeccion, MateriaRiesgoPred, EstudianteRiesgo,
} from '../services/analyticsService';
import { useDias } from '../hooks/useDias';
import {
  BarChart3, TrendingUp, Layers, CalendarRange, MapPin, RefreshCw, Info, Sparkles,
} from 'lucide-react';
import {
  ComposedChart, Area, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';

type Tab = 'tendencia' | 'trayectos' | 'ejes' | 'ocupacion' | 'geografia' | 'predicciones';

const AZUL = '#1E88E5';
const INDIGO = '#2E3192';
const CIAN = '#00B8D4';
const LILA = '#7C7CC9';
const VERDE = '#0f9d58';
const AMBAR = '#e08600';

const etiquetaBin = (b: number): string => `${(b - 1) * 2}–${b * 2}`;

export const Analitica = (): ReactNode => {
  const [tab, setTab] = useState<Tab>('tendencia');
  const [idDia, setIdDia] = useState<number>(6); // 6 = Sábado por defecto
  const [idProPred, setIdProPred] = useState<number | undefined>(undefined);
  const { dias } = useDias();
  const diasActivos = (dias ?? []).filter((d) => d.estatus === 'A');
  const diaNombre = diasActivos.find((d) => d.id_dia === idDia)?.dia ?? 'Día';

  const qTen = useQuery<PuntoTendencia[]>({ queryKey: ['ana', 'ten'], queryFn: analyticsService.getTendencia, enabled: tab === 'tendencia' });
  const qHis = useQuery<BinHistograma[]>({ queryKey: ['ana', 'his'], queryFn: analyticsService.getHistograma, enabled: tab === 'tendencia' });
  const qTra = useQuery<FilaTrayecto[]>({ queryKey: ['ana', 'tra'], queryFn: () => analyticsService.getTrayectos(), enabled: tab === 'trayectos' });
  const qEje = useQuery<FilaEje[]>({ queryKey: ['ana', 'eje'], queryFn: analyticsService.getEjes, enabled: tab === 'ejes' });
  const qOcu = useQuery<FilaOcupacionDia[]>({ queryKey: ['ana', 'ocu', idDia], queryFn: () => analyticsService.getOcupacionPorDia(idDia), enabled: tab === 'ocupacion' });
  const qGeo = useQuery<FilaGeografia[]>({ queryKey: ['ana', 'geo'], queryFn: analyticsService.getGeografia, enabled: tab === 'geografia' });

  const qPre = useQuery<PrediccionesData>({
    queryKey: ['ana', 'pre', idProPred],
    queryFn: () => analyticsService.getPredicciones(idProPred),
    enabled: tab === 'predicciones',
  });

  const activa = tab === 'tendencia' ? qTen : tab === 'trayectos' ? qTra : tab === 'ejes' ? qEje
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
                Tendencias por período, comparativas por trayecto y eje formativo, ocupación de aulas
                por día (viernes y sábado) y distribución geográfica. Todo calculado en el motor de BD.
              </p>
            </div>
          </div>
          <button className="unem-btn" onClick={() => { void activa.refetch(); }} disabled={activa.isFetching}>
            <RefreshCw size={15} className={activa.isFetching ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>
      </section>

      <div className="unem-seg" style={{ alignSelf: 'flex-start' }}>
        <button data-on={tab === 'tendencia'} onClick={() => setTab('tendencia')}><TrendingUp size={13} style={{ marginRight: 5, verticalAlign: '-2px' }} />Tendencia</button>
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
          {tab === 'tendencia' && (
            <div className="unem-card unem-card-pad">
              <b style={{ fontSize: 12, color: 'var(--tx-2)' }}>Promedio y % de aprobación por período</b>
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
                  {qPre.data.confiable ? 'Modelo confiable' : 'Estimación preliminar'}
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

              <div style={{ height: 300, marginTop: 12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={seriePred}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 20]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <ReferenceLine y={10} stroke="#dc2626" strokeDasharray="4 4" />
                    <Line dataKey="promedio" name="Promedio histórico" stroke={INDIGO} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                    <Line dataKey="proyectado" name="Promedio proyectado" stroke={CIAN} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <p style={{ fontSize: 11.5, color: 'var(--tx-3)', marginTop: 10 }}>
                {qPre.data.metodo}
                {qPre.data.pendiente_promedio !== null && (
                  <> · Pendiente del promedio: <b>{qPre.data.pendiente_promedio.toFixed(3)}</b> pts/período
                    {qPre.data.pendiente_promedio >= 0 ? ' (tendencia al alza)' : ' (tendencia a la baja)'}</>
                )}
              </p>

              {qPre.data.proyeccion.length > 0 && (
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
      <Info size={16} /><span>Sin materias en riesgo: todas las materias evaluadas tienen aprobación total.</span>
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
      <Info size={16} /><span>Sin estudiantes en riesgo académico según las notas oficiales cargadas.</span>
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
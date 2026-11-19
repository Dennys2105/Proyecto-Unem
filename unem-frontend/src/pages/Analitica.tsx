import { useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analyticsService';
import type {
  PuntoTendencia, FilaTrayecto, FilaEje, FilaSabado, FilaGeografia, BinHistograma,
} from '../services/analyticsService';
import {
  BarChart3, TrendingUp, Layers, CalendarRange, MapPin, RefreshCw, Info,
} from 'lucide-react';
import {
  ComposedChart, Area, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

type Tab = 'tendencia' | 'trayectos' | 'ejes' | 'sabado' | 'geografia';

const AZUL = '#1E88E5';
const INDIGO = '#2E3192';
const CIAN = '#00B8D4';
const LILA = '#7C7CC9';
const VERDE = '#0f9d58';
const AMBAR = '#e08600';

const etiquetaBin = (b: number): string => `${(b - 1) * 2}–${b * 2}`;

export const Analitica = (): ReactNode => {
  const [tab, setTab] = useState<Tab>('tendencia');

  const qTen = useQuery<PuntoTendencia[]>({ queryKey: ['ana', 'ten'], queryFn: analyticsService.getTendencia, enabled: tab === 'tendencia' });
  const qHis = useQuery<BinHistograma[]>({ queryKey: ['ana', 'his'], queryFn: analyticsService.getHistograma, enabled: tab === 'tendencia' });
  const qTra = useQuery<FilaTrayecto[]>({ queryKey: ['ana', 'tra'], queryFn: () => analyticsService.getTrayectos(), enabled: tab === 'trayectos' });
  const qEje = useQuery<FilaEje[]>({ queryKey: ['ana', 'eje'], queryFn: analyticsService.getEjes, enabled: tab === 'ejes' });
  const qSab = useQuery<FilaSabado[]>({ queryKey: ['ana', 'sab'], queryFn: analyticsService.getSabado, enabled: tab === 'sabado' });
  const qGeo = useQuery<FilaGeografia[]>({ queryKey: ['ana', 'geo'], queryFn: analyticsService.getGeografia, enabled: tab === 'geografia' });

  const activa = tab === 'tendencia' ? qTen : tab === 'trayectos' ? qTra : tab === 'ejes' ? qEje : tab === 'sabado' ? qSab : qGeo;

  const bins: { label: string; cantidad: number }[] = (qHis.data ?? []).map((b: BinHistograma) => ({
    label: etiquetaBin(b.bin), cantidad: b.cantidad,
  }));
  const trayectos = (qTra.data ?? []).map((t: FilaTrayecto) => ({
    ...t, label: `${t.cod_programa} · T${t.trayecto}`,
  }));
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
                Análisis profundo del rendimiento: tendencias por período, comparativas por trayecto y
                eje formativo, ocupación sabatina de aulas y distribución geográfica. Todo calculado en
                el motor de base de datos sobre calificaciones oficiales.
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
        <button data-on={tab === 'sabado'} onClick={() => setTab('sabado')}><CalendarRange size={13} style={{ marginRight: 5, verticalAlign: '-2px' }} />Sábado</button>
        <button data-on={tab === 'geografia'} onClick={() => setTab('geografia')}><MapPin size={13} style={{ marginRight: 5, verticalAlign: '-2px' }} />Geografía</button>
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

          {tab === 'sabado' && (
            <div className="unem-card unem-card-pad">
              <b style={{ fontSize: 12, color: 'var(--tx-2)' }}>Horas ocupadas por aula — Sábado (Escuela Bustamante)</b>
              <div style={{ height: 300, marginTop: 12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={qSab.data ?? []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="aula" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="horas_ocupadas" name="Horas" fill={AMBAR} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <TablaSabado filas={qSab.data ?? []} />
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
        </>
      )}
    </div>
  );
};

/* ---------- Tablas ---------- */
const TablaTrayectos = ({ filas }: { filas: FilaTrayecto[] }): ReactNode => (
  <div className="unem-table-wrap unem-scroll" style={{ marginTop: 16 }}>
    <table className="unem-table">
      <thead><tr><th>Programa</th><th>Trayecto</th><th>Evaluados</th><th>Promedio</th><th>% Aprob.</th></tr></thead>
      <tbody>
        {filas.map((f: FilaTrayecto) => (
          <tr key={`${f.cod_programa}-${f.trayecto}`}>
            <td className="unem-strong">{f.cod_programa}</td>
            <td>T{f.trayecto}</td>
            <td>{f.estudiantes}</td>
            <td className="unem-mono unem-strong">{f.promedio.toFixed(2)}</td>
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
            <td className="unem-strong">{f.eje}</td>
            <td>{f.materias}</td>
            <td>{f.evaluaciones}</td>
            <td className="unem-mono unem-strong">{f.promedio.toFixed(2)}</td>
            <td>{f.pct_aprobacion.toFixed(1)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const TablaSabado = ({ filas }: { filas: FilaSabado[] }): ReactNode => (
  <div className="unem-table-wrap unem-scroll" style={{ marginTop: 16 }}>
    <table className="unem-table">
      <thead><tr><th>Aula</th><th>Centro</th><th>Asignaciones</th><th>Horas</th></tr></thead>
      <tbody>
        {filas.map((f: FilaSabado) => (
          <tr key={f.aula}>
            <td className="unem-strong">{f.aula}</td>
            <td>{f.nombre_centro}</td>
            <td>{f.total_asignaciones_sabado}</td>
            <td className="unem-mono unem-strong">{f.horas_ocupadas.toFixed(2)}</td>
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
            <td className="unem-strong">{f.municipio}</td>
            <td>{f.estudiantes}</td>
            <td>{f.docentes}</td>
            <td>{f.espacios}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const AnaliticaPage = Analitica;
export default Analitica;
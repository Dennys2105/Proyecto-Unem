import { useState } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportesSeguridadService } from '../services/reportesSeguridadService';
import type {
  Anomalia, Severidad, ReporteEjecutivo, CambiosNotas, DetalleNota,
  CambioPrivilegio, EventosAcceso, AccesoEvento, EventoAcceso,
} from '../services/reportesSeguridadService';
import {
  Activity, AlertTriangle, Download, KeyRound, LogIn, RefreshCw,
  ShieldAlert, ShieldCheck, ScrollText, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import toast from 'react-hot-toast';

type Sub = 'resumen' | 'anomalias' | 'notas' | 'privilegios' | 'accesos';
type SortKey = 'fec_hor' | 'estudiante' | 'nota_despues' | 'ejecutado_por' | 'tabla_mod' | 'usuario' | 'evento';
type SortDir = 'asc' | 'desc';

interface SortProps {
  sortKey: SortKey;
  sortDir: SortDir;
  toggleSort: (key: SortKey) => void;
}

const SortIco = ({ k, sortKey, sortDir }: { k: SortKey; sortKey: SortKey; sortDir: SortDir }): ReactNode => {
  if (sortKey !== k) return <ArrowUpDown size={11} style={{ opacity: 0.4 }} />;
  return sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />;
};

const hoy = (): string => new Date().toISOString().slice(0, 10);
const haceDias = (n: number): string => {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const SEV_CHIP: Record<Severidad, string> = { alta: 'unem-chip-del', media: 'unem-chip-soft', baja: 'unem-chip-mut' };
const TIPO_LABEL: Record<string, string> = {
  RAFAGA_NOTAS: 'Ráfaga de notas', SIN_AUTOR: 'Sin autor', FUERA_DE_HORARIO: 'Fuera de horario',
  MULTI_IP: 'Múltiples IPs', BORRADO_MASIVO: 'Borrado masivo',
  BLOQUEO_CUENTA: 'Bloqueo de cuenta', CAMBIO_PRIVILEGIOS: 'Cambio de privilegios',
};
const EVENTO_CHIP: Record<EventoAcceso, string> = {
  LOGIN_EXITOSO: 'unem-chip-ins', INTENTO_FALLIDO: 'unem-chip-soft',
  BLOQUEO_CUENTA: 'unem-chip-del', CAMBIO_PASSWORD: 'unem-chip-upd', OTRO: 'unem-chip-mut',
};
const EVENTO_LABEL: Record<EventoAcceso, string> = {
  LOGIN_EXITOSO: 'Login exitoso', INTENTO_FALLIDO: 'Intento fallido',
  BLOQUEO_CUENTA: 'Bloqueo', CAMBIO_PASSWORD: 'Cambio de clave', OTRO: 'Otro',
};

const fmtFH = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
};

const exportarCSV = (nombre: string, filas: Record<string, unknown>[]): void => {
  if (filas.length === 0) { toast.error('No hay datos para exportar'); return; }
  const cols = Object.keys(filas[0]);
  const esc = (v: unknown): string => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = `\uFEFF${cols.join(';')}\n${filas.map((f) => cols.map((c) => esc(f[c])).join(';')).join('\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url; a.download = `${nombre}_${hoy()}.csv`; a.click();
  URL.revokeObjectURL(url);
  toast.success(`${filas.length} fila(s) exportada(s)`, { icon: '📄' });
};

export const PanelSeguridad = (): ReactNode => {
  const [sub, setSub] = useState<Sub>('resumen');
  const [fecha, setFecha] = useState<string>(hoy());
  const [desde, setDesde] = useState<string>(haceDias(7));
  const [hasta, setHasta] = useState<string>(hoy());
  const [ventana, setVentana] = useState<number>(10);
  const [umbral, setUmbral] = useState<number>(3);
  const [hmin, setHmin] = useState<number>(7);
  const [hmax, setHmax] = useState<number>(21);

  const [sortKey, setSortKey] = useState<SortKey>('fec_hor');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleSort = (key: SortKey): void => {
    if (sortKey === key) setSortDir((d: SortDir): SortDir => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const qEjec = useQuery<ReporteEjecutivo>({
    queryKey: ['seguridad', 'ejecutivo', fecha],
    queryFn: () => reportesSeguridadService.getEjecutivo(fecha),
    enabled: sub === 'resumen',
  });
  const qAnom = useQuery<Anomalia[]>({
    queryKey: ['seguridad', 'anomalias', fecha, ventana, umbral, hmin, hmax],
    queryFn: () => reportesSeguridadService.getAnomalias({ fecha, ventana_min: ventana, umbral_rafaga: umbral, hora_min: hmin, hora_max: hmax }),
    enabled: sub === 'anomalias',
  });
  const qNotas = useQuery<CambiosNotas>({
    queryKey: ['seguridad', 'notas', desde, hasta],
    queryFn: () => reportesSeguridadService.getNotas({ desde, hasta, limite: 200 }),
    enabled: sub === 'notas',
  });
  const qPriv = useQuery<CambioPrivilegio[]>({
    queryKey: ['seguridad', 'privilegios', desde, hasta],
    queryFn: () => reportesSeguridadService.getPermisos({ desde, hasta }),
    enabled: sub === 'privilegios',
  });
  const qAcc = useQuery<EventosAcceso>({
    queryKey: ['seguridad', 'accesos', desde, hasta],
    queryFn: () => reportesSeguridadService.getAccesos({ desde, hasta }),
    enabled: sub === 'accesos',
  });

  const activa = sub === 'resumen' ? qEjec : sub === 'anomalias' ? qAnom : sub === 'notas' ? qNotas : sub === 'privilegios' ? qPriv : qAcc;

  const onExport = (): void => {
    if (sub === 'resumen' && qEjec.data) {
      const blob = new Blob([JSON.stringify(qEjec.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `reporte_ejecutivo_${fecha}.json`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Reporte ejecutivo descargado (JSON)', { icon: '🛡️' });
    } else if (sub === 'anomalias' && qAnom.data) {
      exportarCSV('anomalias', qAnom.data.map((a: Anomalia) => ({
        tipo: TIPO_LABEL[a.tipo] ?? a.tipo, severidad: a.severidad, descripcion: a.descripcion,
      })));
    } else if (sub === 'notas' && qNotas.data) {
      exportarCSV('cambios_notas', qNotas.data.detalle as unknown as Record<string, unknown>[]);
    } else if (sub === 'privilegios' && qPriv.data) {
      exportarCSV('cambios_privilegios', qPriv.data as unknown as Record<string, unknown>[]);
    } else if (sub === 'accesos' && qAcc.data) {
      exportarCSV('eventos_acceso', qAcc.data.eventos as unknown as Record<string, unknown>[]);
    } else {
      toast.error('No hay datos para exportar');
    }
  };

  const usaFecha = sub === 'resumen' || sub === 'anomalias';

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Controles */}
      <section className="unem-card unem-card-pad">
        <div className="unem-toolbar">
          <div className="unem-seg">
            {([['resumen', 'Resumen'], ['anomalias', 'Anomalías'], ['notas', 'Notas'], ['privilegios', 'Privilegios'], ['accesos', 'Accesos']] as [Sub, string][]).map(([k, label]: [Sub, string]) => (
              <button key={k} data-on={sub === k} onClick={() => { setSub(k); setSortKey('fec_hor'); setSortDir('desc'); }}>{label}</button>
            ))}
          </div>

          {usaFecha ? (
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--tx-2)' }}>
              Fecha
              <input type="date" className="unem-input" style={{ paddingLeft: 12, minWidth: 0 }}
                value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </label>
          ) : (
            <>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--tx-2)' }}>
                Desde
                <input type="date" className="unem-input" style={{ paddingLeft: 12, minWidth: 0 }}
                  value={desde} onChange={(e) => setDesde(e.target.value)} />
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--tx-2)' }}>
                Hasta
                <input type="date" className="unem-input" style={{ paddingLeft: 12, minWidth: 0 }}
                  value={hasta} onChange={(e) => setHasta(e.target.value)} />
              </label>
            </>
          )}

          {sub === 'anomalias' && (
            <>
              <Num label="Ventana (min)" v={ventana} set={setVentana} min={1} max={120} />
              <Num label="Umbral ráfaga" v={umbral} set={setUmbral} min={2} max={50} />
              <Num label="Hora mín" v={hmin} set={setHmin} min={0} max={23} />
              <Num label="Hora máx" v={hmax} set={setHmax} min={0} max={23} />
            </>
          )}

          <button className="unem-btn" onClick={() => { void activa.refetch(); }} disabled={activa.isFetching}>
            <RefreshCw size={15} className={activa.isFetching ? 'animate-spin' : ''} /> Actualizar
          </button>
          <button className="unem-btn unem-btn-primary" onClick={onExport}>
            <Download size={15} /> {sub === 'resumen' ? 'JSON ejecutivo' : 'Exportar CSV'}
          </button>
        </div>
      </section>

      {/* Contenido */}
      {activa.isLoading ? (
        <section className="unem-card unem-card-pad">
          {[0, 1, 2, 3].map((i: number) => <div key={i} className="unem-skel" style={{ height: 40, marginBottom: 10 }} />)}
        </section>
      ) : activa.isError ? (
        <div className="unem-note" style={{ borderColor: '#fecaca', background: '#fef2f2', color: '#991b1b' }}>
          <ShieldAlert size={16} />
          <span>No se pudo consultar el reporte. Verifica tu sesión y permisos sobre el módulo Auditoría.</span>
        </div>
      ) : (
        <>
          {sub === 'resumen' && qEjec.data && <Resumen d={qEjec.data} />}
          {sub === 'anomalias' && qAnom.data && <Anomalias lista={qAnom.data} />}
          {sub === 'notas' && qNotas.data && <Notas d={qNotas.data} sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort} />}
          {sub === 'privilegios' && qPriv.data && <Privilegios lista={qPriv.data} sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort} />}
          {sub === 'accesos' && qAcc.data && <Accesos d={qAcc.data} sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort} />}
        </>
      )}
    </div>
  );
};

/* ---------- Sub-vistas ---------- */

const Resumen = ({ d }: { d: ReporteEjecutivo }): ReactNode => {
  const riesgoColor = d.nivel_de_riesgo === 'CRÍTICO' ? '#dc2626' : d.nivel_de_riesgo === 'MODERADO' ? '#e08600' : '#0f9d58';
  const maxHora = Math.max(...d.diario.por_hora.map((h) => h.movimientos), 1);
  const horas = Array.from({ length: 24 }, (_, h) => d.diario.por_hora.find((x) => x.hora === h)?.movimientos ?? 0);
  return (
    <>
      <div className="unem-card unem-card-pad" style={{ display: 'flex', alignItems: 'center', gap: 12, borderColor: riesgoColor }}>
        <ShieldCheck size={22} style={{ color: riesgoColor }} />
        <div>
          <b style={{ color: 'var(--tx-1)' }}>Nivel de riesgo del {d.fecha_analizada}: </b>
          <span className="unem-chip" style={{ background: `${riesgoColor}1a`, color: riesgoColor, borderColor: `${riesgoColor}55` }}>{d.nivel_de_riesgo}</span>
          <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--tx-3)' }}>
            Alta: {d.conteo_anomalias_por_severidad.alta} · Media: {d.conteo_anomalias_por_severidad.media} · Baja: {d.conteo_anomalias_por_severidad.baja}
          </p>
        </div>
      </div>

      <div className="unem-kpis">
        <Kpi label="Movimientos" v={d.diario.totales.total_movimientos} hex="#2E3192" icon={<Activity size={16} />} />
        <Kpi label="Logins exitosos" v={d.diario.accesos.logins_exitosos} hex="#0f9d58" icon={<LogIn size={16} />} />
        <Kpi label="Intentos fallidos" v={d.diario.accesos.intentos_fallidos} hex="#e08600" icon={<AlertTriangle size={16} />} />
        <Kpi label="Cambios de notas" v={d.notas.resumen.total_cambios} hex="#7c3aed" icon={<ScrollText size={16} />} />
        <Kpi label="Sin autor" v={d.diario.totales.sin_autor} hex="#dc2626" icon={<ShieldAlert size={16} />} />
      </div>

      <div className="unem-card unem-card-pad">
        <b style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--tx-3)' }}>Actividad por hora</b>
        <div className="unem-spark" style={{ height: 64, marginTop: 10 }}>
          {horas.map((v: number, h: number) => (
            <i key={h} title={`${h}:00 → ${v} mov.`} style={{ height: `${Math.max((v / maxHora) * 100, v > 0 ? 8 : 2)}%`, opacity: v > 0 ? 1 : .25, animationDelay: `${h * 25}ms` }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: 'var(--tx-3)', marginTop: 4 }}>
          <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>23h</span>
        </div>
      </div>

      {d.anomalias.length > 0 && (
        <div className="unem-card unem-card-pad">
          <b style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--tx-3)' }}>Anomalías del día ({d.anomalias.length})</b>
          <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
            {d.anomalias.slice(0, 6).map((a: Anomalia, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
                <span className={`unem-chip ${SEV_CHIP[a.severidad]}`}>{a.severidad}</span>
                <span style={{ color: 'var(--tx-2)' }}>{a.descripcion}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

const Anomalias = ({ lista }: { lista: Anomalia[] }): ReactNode => (
  lista.length === 0 ? (
    <div className="unem-note"><ShieldCheck size={16} /><span>Sin anomalías para los parámetros seleccionados.</span></div>
  ) : (
    <div style={{ display: 'grid', gap: 10 }}>
      {lista.map((a: Anomalia, i: number) => (
        <div key={i} className="unem-card unem-card-pad">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={`unem-chip ${SEV_CHIP[a.severidad]}`}>{a.severidad.toUpperCase()}</span>
            <b style={{ fontSize: 13, color: 'var(--tx-1)' }}>{TIPO_LABEL[a.tipo] ?? a.tipo}</b>
          </div>
          <p style={{ margin: '8px 0', fontSize: 12.5, color: 'var(--tx-2)' }}>{a.descripcion}</p>
          <pre className="unem-json unem-scroll-dark">{JSON.stringify(a.evidencia, null, 2)}</pre>
        </div>
      ))}
    </div>
  )
);

const Notas = ({ d, sortKey, sortDir, toggleSort }: { d: CambiosNotas } & SortProps): ReactNode => {
  const datosOrdenados = [...d.detalle].sort((a: DetalleNota, b: DetalleNota): number => {
    let cmp = 0;
    if (sortKey === 'fec_hor') cmp = (new Date(a.fec_hor).getTime() || 0) - (new Date(b.fec_hor).getTime() || 0);
    else if (sortKey === 'estudiante') cmp = (a.estudiante ?? '').localeCompare(b.estudiante ?? '');
    else if (sortKey === 'nota_despues') cmp = (a.nota_despues ?? 0) - (b.nota_despues ?? 0);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return (
    <>
      <div className="unem-toolbar">
        <span className="unem-chip unem-chip-mut">Total: {d.resumen.total_cambios}</span>
        <span className="unem-chip unem-chip-ins">Subieron: {d.resumen.notas_subieron}</span>
        <span className="unem-chip unem-chip-del">Bajaron: {d.resumen.notas_bajaron}</span>
        <span className="unem-chip unem-chip-soft">Anuladas: {d.resumen.anuladas}</span>
        <span className="unem-chip unem-chip-upd">Restauradas: {d.resumen.restauradas}</span>
      </div>
      <div className="unem-table-wrap unem-scroll">
        <table className="unem-table">
          <thead><tr>
            <th><button className="unem-th-btn" onClick={() => toggleSort('fec_hor')}>Fecha <SortIco k="fec_hor" sortKey={sortKey} sortDir={sortDir} /></button></th>
            <th>Usuario</th>
            <th><button className="unem-th-btn" onClick={() => toggleSort('estudiante')}>Estudiante <SortIco k="estudiante" sortKey={sortKey} sortDir={sortDir} /></button></th>
            <th>Materia</th>
            <th><button className="unem-th-btn" onClick={() => toggleSort('nota_despues')}>Nota <SortIco k="nota_despues" sortKey={sortKey} sortDir={sortDir} /></button></th>
            <th>Estatus</th>
            <th>IP</th>
          </tr></thead>
          <tbody>
            {datosOrdenados.map((r: DetalleNota) => (
              <tr key={r.id_aud}>
                <td className="unem-mono" style={{ fontSize: 11.5 }}>{fmtFH(r.fec_hor)}</td>
                <td><span className="unem-chip unem-chip-mut">{r.usuario}</span></td>
                <td><span className="unem-strong">{r.estudiante ?? '—'}</span><br /><span className="unem-mono" style={{ fontSize: 10.5, color: 'var(--tx-3)' }}>{r.cedula ?? ''}</span></td>
                <td><span className="unem-ell" style={{ maxWidth: 220 }}>{r.materia ?? '—'}</span></td>
                <td className="unem-mono unem-strong">
                  {r.nota_antes !== null && r.nota_despues !== null && r.nota_antes !== r.nota_despues
                    ? `${Number(r.nota_antes).toFixed(2)} → ${Number(r.nota_despues).toFixed(2)}`
                    : r.nota_despues !== null ? Number(r.nota_despues).toFixed(2) : '—'}
                </td>
                <td>{r.estatus_antes !== r.estatus_despues
                  ? <span className={`unem-chip ${r.estatus_despues === 'I' ? 'unem-chip-soft' : 'unem-chip-ins'}`}>{r.estatus_antes} → {r.estatus_despues}</span>
                  : <span className="unem-chip unem-chip-mut">{r.estatus_despues ?? '—'}</span>}</td>
                <td className="unem-mono" style={{ fontSize: 11 }}>{r.dir_ip ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

const Privilegios = ({ lista, sortKey, sortDir, toggleSort }: { lista: CambioPrivilegio[] } & SortProps): ReactNode => {
  const datosOrdenados = [...lista].sort((a: CambioPrivilegio, b: CambioPrivilegio): number => {
    let cmp = 0;
    if (sortKey === 'fec_hor') cmp = (new Date(a.fec_hor).getTime() || 0) - (new Date(b.fec_hor).getTime() || 0);
    else if (sortKey === 'ejecutado_por') cmp = a.ejecutado_por.localeCompare(b.ejecutado_por);
    else if (sortKey === 'tabla_mod') cmp = a.tabla_mod.localeCompare(b.tabla_mod);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return lista.length === 0 ? (
    <div className="unem-note"><ShieldCheck size={16} /><span>Sin cambios de privilegios en el rango.</span></div>
  ) : (
    <div className="unem-table-wrap unem-scroll">
      <table className="unem-table">
        <thead><tr>
          <th><button className="unem-th-btn" onClick={() => toggleSort('fec_hor')}>Fecha <SortIco k="fec_hor" sortKey={sortKey} sortDir={sortDir} /></button></th>
          <th><button className="unem-th-btn" onClick={() => toggleSort('ejecutado_por')}>Ejecutado por <SortIco k="ejecutado_por" sortKey={sortKey} sortDir={sortDir} /></button></th>
          <th><button className="unem-th-btn" onClick={() => toggleSort('tabla_mod')}>Tabla <SortIco k="tabla_mod" sortKey={sortKey} sortDir={sortDir} /></button></th>
          <th>Rol</th><th>Módulo</th><th>Permiso</th><th>Alcance</th><th>IP</th>
        </tr></thead>
        <tbody>
          {datosOrdenados.map((r: CambioPrivilegio) => (
            <tr key={r.id_aud}>
              <td className="unem-mono" style={{ fontSize: 11.5 }}>{fmtFH(r.fec_hor)}</td>
              <td><span className="unem-chip unem-chip-mut">{r.ejecutado_por}</span></td>
              <td className="unem-mono" style={{ fontSize: 11.5 }}>{r.tabla_mod}</td>
              <td className="unem-strong">{r.rol_afectado ?? '—'}</td>
              <td>{r.modulo ?? '—'}</td>
              <td>{r.permiso ?? '—'}</td>
              <td className="unem-mono">{r.alcance_antes ?? '∅'} → {r.alcance_despues ?? '∅'}</td>
              <td className="unem-mono" style={{ fontSize: 11 }}>{r.dir_ip ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Accesos = ({ d, sortKey, sortDir, toggleSort }: { d: EventosAcceso } & SortProps): ReactNode => {
  const datosOrdenados = [...d.eventos].sort((a: AccesoEvento, b: AccesoEvento): number => {
    let cmp = 0;
    if (sortKey === 'fec_hor') cmp = (new Date(a.fec_hor).getTime() || 0) - (new Date(b.fec_hor).getTime() || 0);
    else if (sortKey === 'usuario') cmp = a.usuario.localeCompare(b.usuario);
    else if (sortKey === 'evento') cmp = a.evento.localeCompare(b.evento);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return (
    <>
      <div className="unem-kpis">
        <Kpi label="Logins" v={d.resumen.logins} hex="#0f9d58" icon={<LogIn size={16} />} />
        <Kpi label="Fallidos" v={d.resumen.fallidos} hex="#e08600" icon={<AlertTriangle size={16} />} />
        <Kpi label="Bloqueos" v={d.resumen.bloqueos} hex="#dc2626" icon={<ShieldAlert size={16} />} />
        <Kpi label="Cambios de clave" v={d.resumen.cambios_password} hex="#2563eb" icon={<KeyRound size={16} />} />
      </div>
      <div className="unem-table-wrap unem-scroll">
        <table className="unem-table">
          <thead><tr>
            <th><button className="unem-th-btn" onClick={() => toggleSort('fec_hor')}>Fecha <SortIco k="fec_hor" sortKey={sortKey} sortDir={sortDir} /></button></th>
            <th><button className="unem-th-btn" onClick={() => toggleSort('usuario')}>Usuario <SortIco k="usuario" sortKey={sortKey} sortDir={sortDir} /></button></th>
            <th><button className="unem-th-btn" onClick={() => toggleSort('evento')}>Evento <SortIco k="evento" sortKey={sortKey} sortDir={sortDir} /></button></th>
            <th>Intentos</th><th>IP</th>
          </tr></thead>
          <tbody>
            {datosOrdenados.map((r: AccesoEvento) => (
              <tr key={r.id_aud}>
                <td className="unem-mono" style={{ fontSize: 11.5 }}>{fmtFH(r.fec_hor)}</td>
                <td><span className="unem-chip unem-chip-mut">{r.usuario}</span></td>
                <td><span className={`unem-chip ${EVENTO_CHIP[r.evento]}`}>{EVENTO_LABEL[r.evento]}</span></td>
                <td className="unem-mono">{r.intentos_antes ?? 0} → {r.intentos_despues ?? 0}</td>
                <td className="unem-mono" style={{ fontSize: 11 }}>{r.dir_ip ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

/* ---------- Auxiliares ---------- */
const Kpi = ({ label, v, hex, icon }: { label: string; v: number; hex: string; icon: ReactNode }): ReactNode => (
  <article className="unem-kpi" style={{ ['--kpi-c' as never]: hex } as CSSProperties}>
    <div className="unem-kpi-top"><span className="unem-kpi-l">{label}</span><span className="unem-kpi-i">{icon}</span></div>
    <div className="unem-kpi-v">{v}</div>
  </article>
);

const Num = ({ label, v, set, min, max }: { label: string; v: number; set: (n: number) => void; min: number; max: number }): ReactNode => (
  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--tx-2)' }}>
    {label}
    <input type="number" className="unem-input" style={{ paddingLeft: 12, minWidth: 0, width: 76 }}
      min={min} max={max} value={v}
      onChange={(e) => set(Math.max(min, Math.min(max, Number(e.target.value) || min)))} />
  </label>
);

export default PanelSeguridad;
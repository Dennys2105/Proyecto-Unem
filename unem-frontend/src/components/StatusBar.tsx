import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analyticsService';
import type { InfoSistema, EsquemaInfo, PruebaSalud, TriggerDuplicado } from '../services/analyticsService';
import {
  Database, X, RefreshCw, ShieldCheck, ShieldAlert, CheckCircle2,
  AlertTriangle, Layers, KeyRound, Zap, GitBranch, Boxes, Command, Clock3,
} from 'lucide-react';

const ARCO = ['#4FC3F7', '#29B6F6', '#1E88E5', '#3949AB', '#2E3192'];

const ETIQUETA_VOL: Record<string, string> = {
  docentes: 'Docentes', docentes_act: 'Docentes activos',
  estudiantes: 'Estudiantes', estudiantes_act: 'Estudiantes activos',
  materias: 'Materias', malla: 'Registros de malla',
  notas: 'Notas', notas_act: 'Notas vigentes',
  asignaciones: 'Asignaciones', espacios: 'Espacios físicos',
  municipios: 'Municipios', auditoria: 'Movimientos auditados',
  roles: 'Roles', modulos: 'Módulos', permisos_rol: 'Permisos por rol', usuarios: 'Usuarios',
};

export const StatusBar = (): ReactNode => {
  const [abierto, setAbierto] = useState<boolean>(false);

  const { data, isLoading, isFetching, isError, refetch, dataUpdatedAt } = useQuery<InfoSistema>({
    queryKey: ['analytics', 'sistema'],
    queryFn: analyticsService.getInfoSistema,
    refetchInterval: 120_000,
    retry: 1,
  });

  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') setAbierto(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [abierto]);

  const est = data?.estructura;
  const cat = data?.catalogo;
  const mot = data?.motor;
  const dup: TriggerDuplicado[] = cat?.triggers_duplicados ?? [];
  const salud: PruebaSalud[] = data?.salud ?? [];
  const fallas = salud.filter((s: PruebaSalud) => !s.ok).length;

  const estado: 'cargando' | 'error' | 'ok' | 'alerta' =
    isLoading ? 'cargando' : isError ? 'error' : data?.salud_ok ? 'ok' : 'alerta';
  const colorEstado =
    estado === 'ok' ? '#0f9d58' : estado === 'alerta' ? '#e08600' : estado === 'error' ? '#dc2626' : '#7b849c';
  const maxTablas = Math.max(...(est?.desglose ?? []).map((e: EsquemaInfo) => e.tablas), 1);

  return (
    <>
      <footer className="unem-statusbar" style={{ cursor: 'pointer' }}
        onClick={() => setAbierto(true)} title="Ver metadatos reales de la base de datos">
        <span style={{ width: 6, height: 6, borderRadius: 99, flex: '0 0 auto',
          background: colorEstado, boxShadow: `0 0 8px ${colorEstado}` }} />

        {isLoading ? (
          <span style={{ color: 'var(--tx-3)' }}>Leyendo catálogos de PostgreSQL…</span>
        ) : isError ? (
          <span style={{ color: '#dc2626', fontWeight: 800 }}>Sin conexión al motor</span>
        ) : (
          <>
            <span style={{ fontWeight: 800, color: 'var(--tx-2)' }}>{mot?.base_datos}</span>
            <span>·</span><span><b>{est?.tablas ?? 0}</b> tablas</span>
            <span>·</span><span><b>{est?.vistas ?? 0}</b> vistas</span>
            <span>·</span><span><b>{est?.esquemas ?? 0}</b> esquemas</span>
            <span>·</span><span><b>{cat?.indices ?? 0}</b> índices</span>
            {fallas > 0 && (<><span>·</span>
              <span style={{ color: '#e08600', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <AlertTriangle size={11} /> {fallas} alerta(s)
              </span></>)}
            {dup.length > 0 && (<><span>·</span>
              <span style={{ color: '#dc2626', fontWeight: 800 }}>{dup.length} trigger(s) duplicado(s)</span></>)}
          </>
        )}

        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Command size={11} /> K navegar
        </span>
        <span>·</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Clock3 size={11} /> v5.5</span>
      </footer>

      {abierto && (
        <>
          <button className="unem-drawer-scrim" onClick={() => setAbierto(false)} aria-label="Cerrar" />
          <aside className="unem-drawer" role="dialog" aria-label="Metadatos del sistema">
            <header className="unem-drawer-head">
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <Database size={19} style={{ color: '#2E3192' }} />
                  <b style={{ fontSize: 16, color: 'var(--tx-1)' }}>Metadatos del sistema</b>
                </div>
                <p style={{ margin: '5px 0 0', fontSize: 11.5, color: 'var(--tx-3)' }}>
                  Consultado en vivo desde information_schema y pg_catalog
                  {dataUpdatedAt ? ` · ${new Date(dataUpdatedAt).toLocaleTimeString('es-VE', { hour12: false })}` : ''}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 7 }}>
                <button className="unem-icon-btn" onClick={() => { void refetch(); }} disabled={isFetching} title="Reconsultar">
                  <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
                </button>
                <button className="unem-icon-btn" onClick={() => setAbierto(false)} aria-label="Cerrar"><X size={17} /></button>
              </div>
            </header>

            <div className="unem-drawer-body unem-scroll">
              {isLoading ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  {[0, 1, 2, 3, 4].map((i: number) => <div key={i} className="unem-skel" style={{ height: 46 }} />)}
                </div>
              ) : isError || !data ? (
                <div className="unem-note" style={{ borderColor: '#fecaca', background: '#fef2f2', color: '#991b1b' }}>
                  <ShieldAlert size={16} />
                  <span>No se pudo consultar el motor. Verifica que el backend esté activo.</span>
                </div>
              ) : (
                <>
                  <section>
                    <Titulo icon={<Database size={13} />} texto="Motor" />
                    <dl className="unem-kv">
                      <dt>Base de datos</dt><dd className="unem-mono">{mot?.base_datos}</dd>
                      <dt>Versión</dt><dd style={{ fontSize: 11.5 }}>{mot?.version}</dd>
                      <dt>Tamaño</dt><dd className="unem-mono">{mot?.tamano}</dd>
                      <dt>Conexiones</dt><dd className="unem-mono">{mot?.conexiones}</dd>
                    </dl>
                  </section>

                  <section>
                    <Titulo icon={<Layers size={13} />} texto={`Esquemas · ${est?.tablas} tablas · ${est?.vistas} vistas`} />
                    <div style={{ display: 'grid', gap: 9 }}>
                      {(est?.desglose ?? []).map((e: EsquemaInfo, i: number) => (
                        <div key={e.esquema}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span className="unem-mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx-1)' }}>{e.esquema}</span>
                            <span style={{ fontSize: 11, color: 'var(--tx-3)', fontVariantNumeric: 'tabular-nums' }}>
                              <b style={{ color: ARCO[i % ARCO.length] }}>{e.tablas}</b> tablas · {e.vistas} vistas
                            </span>
                          </div>
                          <div style={{ height: 6, borderRadius: 99, background: 'var(--line-2)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 99,
                              width: `${Math.max((e.tablas / maxTablas) * 100, 4)}%`,
                              background: `linear-gradient(90deg, ${ARCO[i % ARCO.length]}, ${ARCO[(i + 2) % ARCO.length]})`,
                              transition: 'width .6s cubic-bezier(.22,1,.36,1)' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <Titulo icon={<KeyRound size={13} />} texto="Objetos de integridad" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                      <Mini icon={<Zap size={13} />} n={cat?.triggers ?? 0} label="Triggers" hex="#2E3192" />
                      <Mini icon={<GitBranch size={13} />} n={cat?.indices ?? 0} label="Índices" hex="#1E88E5" />
                      <Mini icon={<KeyRound size={13} />} n={cat?.foraneas ?? 0} label="Foráneas" hex="#4FC3F7" />
                      <Mini icon={<ShieldCheck size={13} />} n={cat?.checks ?? 0} label="Checks" hex="#0f9d58" />
                      <Mini icon={<Boxes size={13} />} n={cat?.unicos ?? 0} label="Únicos" hex="#7c3aed" />
                      <Mini icon={<Layers size={13} />} n={est?.vistas ?? 0} label="Vistas" hex="#e08600" />
                    </div>
                  </section>

                  <section>
                    <Titulo icon={data.salud_ok ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
                      texto={`Integridad · ${data.salud_ok ? 'sin observaciones' : `${fallas} alerta(s)`}`} />
                    <div style={{ display: 'grid', gap: 6 }}>
                      {salud.map((s: PruebaSalud) => (
                        <div key={s.prueba} style={{ display: 'flex', alignItems: 'center', gap: 9,
                          padding: '8px 11px', borderRadius: 10,
                          border: `1px solid ${s.ok ? '#bbf7d0' : '#fed7aa'}`,
                          background: s.ok ? '#f0fdf4' : '#fffbeb' }}>
                          {s.ok ? <CheckCircle2 size={14} style={{ color: '#0f9d58', flex: '0 0 auto' }} />
                                : <AlertTriangle size={14} style={{ color: '#e08600', flex: '0 0 auto' }} />}
                          <span style={{ flex: 1, fontSize: 11.5, fontWeight: 600, color: 'var(--tx-2)' }}>{s.prueba}</span>
                          <span style={{ fontSize: 11, fontWeight: 900, fontVariantNumeric: 'tabular-nums',
                            color: s.ok ? '#0f9d58' : '#e08600' }}>{s.fallas}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {dup.length > 0 && (
                    <section>
                      <Titulo icon={<AlertTriangle size={13} />} texto={`Triggers duplicados · ${dup.length} tabla(s)`} />
                      <div style={{ display: 'grid', gap: 4 }}>
                        {dup.map((d: TriggerDuplicado) => (
                          <div key={`${d.esquema}.${d.tabla}`} className="unem-mono"
                            style={{ fontSize: 11, color: 'var(--tx-2)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{d.esquema}.{d.tabla}</span><b style={{ color: '#dc2626' }}>×{d.cantidad}</b>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  <section>
                    <Titulo icon={<Boxes size={13} />} texto="Volumen de datos" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6 }}>
                      {Object.entries(data.volumen).map(([k, v]: [string, number]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                          padding: '6px 10px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--line-2)' }}>
                          <span style={{ fontSize: 11, color: 'var(--tx-3)', fontWeight: 600 }}>{ETIQUETA_VOL[k] ?? k}</span>
                          <b className="unem-mono" style={{ fontSize: 13, color: 'var(--tx-1)' }}>{v}</b>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </div>

            <footer className="unem-drawer-foot">
              <button className="unem-btn" onClick={() => setAbierto(false)}>Cerrar</button>
            </footer>
          </aside>
        </>
      )}
    </>
  );
};

const Titulo = ({ icon, texto }: { icon: ReactNode; texto: string }): ReactNode => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10,
    paddingBottom: 7, borderBottom: '1px solid var(--line-2)', color: '#2E3192' }}>
    {icon}<b style={{ fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase' }}>{texto}</b>
  </div>
);

const Mini = ({ icon, n, label, hex }: { icon: ReactNode; n: number; label: string; hex: string }): ReactNode => (
  <div style={{ padding: '9px 10px', borderRadius: 10, background: 'var(--surface)',
    border: '1px solid var(--line)', position: 'relative', overflow: 'hidden' }}>
    <span style={{ position: 'absolute', right: -14, bottom: -14, width: 44, height: 44,
      borderRadius: 99, background: hex, opacity: .1, filter: 'blur(9px)' }} />
    <span style={{ color: hex, display: 'block' }}>{icon}</span>
    <b className="unem-mono" style={{ display: 'block', fontSize: 19, color: 'var(--tx-1)', marginTop: 3 }}>{n}</b>
    <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--tx-3)' }}>{label}</span>
  </div>
);

export default StatusBar;
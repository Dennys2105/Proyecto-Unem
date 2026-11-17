import { useState, useMemo, useEffect, useCallback } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios';
import {
  ShieldAlert, Search, RefreshCw, Download, X, Trash2, FilePlus2, PencilLine,
  RotateCcw, Info, ArrowUpDown, ArrowUp, ArrowDown, Eye, CheckCheck,
  ChevronLeft, ChevronRight, Fingerprint, Database, Activity, Undo2, Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ═══════════════ TIPOS ═══════════════ */
interface Movimiento {
  id_aud: number;
  fecha: string;
  usuario: string;
  tabla_afectada: string;
  accion: string;
  registro_identificador: string;
  resumen_cambios: string;
  ip_origen: string | null;
}

type AccionKind = 'INSERT' | 'UPDATE' | 'SOFT_DELETE' | 'DELETE' | 'RESTORE';
type SortKey = 'id_aud' | 'fecha' | 'tabla_afectada';
type SortDir = 'asc' | 'desc';

interface Fila extends Movimiento { kind: AccionKind; ts: number }

/* ═══════════════ CATÁLOGOS ═══════════════ */
const TABLA_LABEL: Record<string, string> = {
  docentes: 'Docentes', estudiantes: 'Estudiantes', notas: 'Notas',
  asig_carga_horarias: 'Asignación de Carga', espacios_fis: 'Espacios Físicos',
  programas: 'Programas', materias: 'Materias', malla_curricular: 'Malla Curricular',
  ejes_formativos: 'Ejes Formativos', secciones: 'Secciones',
  periodos_academicos: 'Períodos Académicos', municipios: 'Municipios',
  dias_laborales: 'Días Laborales', roles: 'Roles', usuarios: 'Usuarios',
  credenciales: 'Credenciales', permisos_rol: 'Permisos por Rol',
  permisos_usuario: 'Permisos por Usuario', modulos: 'Módulos', permisos: 'Permisos',
  disponibilidad_docente: 'Disponibilidad Docente', aud_mov: 'Auditoría',
};

const KIND_META: Record<AccionKind, { label: string; cls: string; icon: typeof Trash2; hex: string }> = {
  INSERT:      { label: 'INSERT',        cls: 'unem-chip-ins',  icon: FilePlus2,  hex: '#0f9d58' },
  UPDATE:      { label: 'UPDATE',        cls: 'unem-chip-upd',  icon: PencilLine, hex: '#2563eb' },
  SOFT_DELETE: { label: 'DELETE LÓGICO', cls: 'unem-chip-soft', icon: Trash2,     hex: '#e08600' },
  DELETE:      { label: 'DELETE FÍSICO', cls: 'unem-chip-del',  icon: Trash2,     hex: '#dc2626' },
  RESTORE:     { label: 'RESTAURACIÓN',  cls: 'unem-chip-res',  icon: RotateCcw,  hex: '#a855f7' },
};

const KIND_ORDER: AccionKind[] = ['INSERT', 'UPDATE', 'SOFT_DELETE', 'RESTORE', 'DELETE'];

/* ═══════════════ EXTRACTO LOCAL DE REFERENCIA ═══════════════ */
const SEED: Movimiento[] = [
  { id_aud: 282, fecha: '2026-11-17T21:14:08-04:00', usuario: 'admin', tabla_afectada: 'dias_laborales', accion: 'UPDATE', registro_identificador: 'Jueves', resumen_cambios: 'estatus', ip_origen: '127.0.0.1' },
  { id_aud: 281, fecha: '2026-11-17T21:13:52-04:00', usuario: 'admin', tabla_afectada: 'dias_laborales', accion: 'UPDATE', registro_identificador: 'Miércoles', resumen_cambios: 'estatus', ip_origen: '127.0.0.1' },
  { id_aud: 280, fecha: '2026-11-17T21:13:41-04:00', usuario: 'admin', tabla_afectada: 'dias_laborales', accion: 'UPDATE', registro_identificador: 'Martes', resumen_cambios: 'estatus', ip_origen: '127.0.0.1' },
  { id_aud: 279, fecha: '2026-11-17T21:13:30-04:00', usuario: 'admin', tabla_afectada: 'dias_laborales', accion: 'UPDATE', registro_identificador: 'Lunes', resumen_cambios: 'estatus', ip_origen: '127.0.0.1' },
  { id_aud: 278, fecha: '2026-11-17T20:58:12-04:00', usuario: 'admin', tabla_afectada: 'notas', accion: 'UPDATE', registro_identificador: 'YURI COROMOTO MESA GARZON | Proyecto Socio Integrador V | Nota: 8.75', resumen_cambios: 'nota, observaciones', ip_origen: '127.0.0.1' },
  { id_aud: 277, fecha: '2026-11-17T20:57:44-04:00', usuario: 'admin', tabla_afectada: 'notas', accion: 'UPDATE', registro_identificador: 'MAYE ALEJANDRA NIÑO COLMENARES | Proyecto Socio Integrador V | Nota: 13.50', resumen_cambios: 'nota', ip_origen: '127.0.0.1' },
  { id_aud: 276, fecha: '2026-11-17T20:41:09-04:00', usuario: 'admin', tabla_afectada: 'notas', accion: 'INSERT', registro_identificador: 'SIASKA LORENA GRANADOS JAIMES | PSI V | Nota: 17.50', resumen_cambios: 'Registro creado', ip_origen: '127.0.0.1' },
  { id_aud: 275, fecha: '2026-11-17T20:40:55-04:00', usuario: 'admin', tabla_afectada: 'notas', accion: 'INSERT', registro_identificador: 'JAHYDDY GUADALUPE HANTUCH MENDOZA | PSI V | Nota: 16.00', resumen_cambios: 'Registro creado', ip_origen: '127.0.0.1' },
  { id_aud: 274, fecha: '2026-11-17T19:22:31-04:00', usuario: 'admin', tabla_afectada: 'docentes', accion: 'UPDATE', registro_identificador: 'V-12345678 - María González', resumen_cambios: 'estatus', ip_origen: '127.0.0.1' },
  { id_aud: 273, fecha: '2026-11-17T19:20:04-04:00', usuario: 'admin', tabla_afectada: 'docentes', accion: 'UPDATE', registro_identificador: 'V-12345678 - María González', resumen_cambios: 'estatus', ip_origen: '127.0.0.1' },
  { id_aud: 272, fecha: '2026-11-17T18:47:19-04:00', usuario: 'admin', tabla_afectada: 'malla_curricular', accion: 'UPDATE', registro_identificador: 'PRIT3PPIII · Proyecto III (T3·P1)', resumen_cambios: 'periodo', ip_origen: '127.0.0.1' },
  { id_aud: 271, fecha: '2026-11-17T18:46:58-04:00', usuario: 'admin', tabla_afectada: 'malla_curricular', accion: 'UPDATE', registro_identificador: 'EDUESPT3PSI5 · Proyecto Socio Integrador V (T3·P1)', resumen_cambios: 'periodo', ip_origen: '127.0.0.1' },
  { id_aud: 270, fecha: '2026-11-17T18:12:40-04:00', usuario: 'admin', tabla_afectada: 'programas', accion: 'UPDATE', registro_identificador: 'LPRI', resumen_cambios: 'estatus', ip_origen: '127.0.0.1' },
  { id_aud: 269, fecha: '2026-11-17T17:55:02-04:00', usuario: 'admin', tabla_afectada: 'periodos_academicos', accion: 'UPDATE', registro_identificador: 'Semestre 2025-I', resumen_cambios: 'activo', ip_origen: '127.0.0.1' },
  { id_aud: 268, fecha: '2026-11-17T17:31:26-04:00', usuario: 'admin', tabla_afectada: 'estudiantes', accion: 'UPDATE', registro_identificador: 'V-7873867 - NIRIA ZULAY COLINA GONZALEZ', resumen_cambios: 'id_mun', ip_origen: '127.0.0.1' },
  { id_aud: 267, fecha: '2026-11-17T17:30:11-04:00', usuario: 'admin', tabla_afectada: 'estudiantes', accion: 'UPDATE', registro_identificador: 'V-21003553 - ANNY YOHANA SANABRIA ONTIVEROS', resumen_cambios: 'id_mun', ip_origen: '127.0.0.1' },
  { id_aud: 266, fecha: '2026-11-17T16:48:37-04:00', usuario: 'admin', tabla_afectada: 'asig_carga_horarias', accion: 'INSERT', registro_identificador: 'Carlos Rodríguez | Lunes 07:00–08:00 | Aula 10', resumen_cambios: 'Registro creado', ip_origen: '127.0.0.1' },
  { id_aud: 265, fecha: '2026-11-17T16:22:15-04:00', usuario: 'admin', tabla_afectada: 'espacios_fis', accion: 'UPDATE', registro_identificador: 'Escuela Bustamante - Aula 15', resumen_cambios: 'equipamiento', ip_origen: '127.0.0.1' },
  { id_aud: 264, fecha: '2026-11-17T15:59:48-04:00', usuario: 'admin', tabla_afectada: 'municipios', accion: 'UPDATE', registro_identificador: 'San Cristóbal 2', resumen_cambios: 'estatus', ip_origen: '127.0.0.1' },
  { id_aud: 263, fecha: '2026-11-17T15:31:07-04:00', usuario: 'Sistema', tabla_afectada: 'credenciales', accion: 'UPDATE', registro_identificador: 'Usuario: admin', resumen_cambios: 'ultimo_acceso', ip_origen: null },
  { id_aud: 262, fecha: '2026-11-17T15:03:40-04:00', usuario: 'admin', tabla_afectada: 'ejes_formativos', accion: 'INSERT', registro_identificador: 'A · Actividades Acreditables', resumen_cambios: 'Registro creado', ip_origen: '127.0.0.1' },
  { id_aud: 261, fecha: '2026-11-17T14:44:22-04:00', usuario: 'admin', tabla_afectada: 'secciones', accion: 'UPDATE', registro_identificador: 'NT.2021.AESP.20.01 (LESP)', resumen_cambios: 'capacidad_maxima', ip_origen: '127.0.0.1' },
  { id_aud: 260, fecha: '2026-11-17T14:12:03-04:00', usuario: 'admin', tabla_afectada: 'permisos_rol', accion: 'INSERT', registro_identificador: 'VICERRECTOR · notas · LEC = TODO', resumen_cambios: 'Registro creado', ip_origen: '127.0.0.1' },
  { id_aud: 259, fecha: '2026-11-17T13:50:19-04:00', usuario: 'admin', tabla_afectada: 'materias', accion: 'UPDATE', registro_identificador: 'EDUESPT3EIPA · Educación Integral para la Persona con Autismo', resumen_cambios: 'unidades_creditos', ip_origen: '127.0.0.1' },
];

/* ═══════════════ HELPERS ═══════════════ */
const clasificar = (m: Movimiento): AccionKind => {
  const acc = (m.accion ?? '').toUpperCase();
  const campos = (m.resumen_cambios ?? '').toLowerCase();
  if (acc === 'INSERT') return 'INSERT';
  if (acc === 'DELETE') return 'DELETE';
  if (acc === 'UPDATE' && campos.includes('estatus')) {
    return /reactiv|restaur|reincorp/i.test(m.registro_identificador ?? '') ? 'RESTORE' : 'SOFT_DELETE';
  }
  return 'UPDATE';
};

const fmtFecha = (iso: string): { d: string; h: string } => {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return { d: iso || '—', h: '' };
  return {
    d: dt.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    h: dt.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
  };
};

const jsonPintado = (obj: Record<string, unknown>): string => JSON.stringify(obj, null, 2);
const PAGE_SIZE = 12;

/* ═══════════════ PÁGINA ═══════════════ */
export const AuditoriaPage = (): ReactNode => {
  const { data, isLoading, isFetching, isError, refetch } = useQuery<Movimiento[]>({
    queryKey: ['auditoria', 'movimientos'],
    queryFn: async (): Promise<Movimiento[]> => {
      const r = await api.get('/analytics/auditoria/movimientos');
      return Array.isArray(r.data) ? (r.data as Movimiento[]) : [];
    },
    retry: 1,
    refetchInterval: 60_000,
  });

  const fuente: Movimiento[] = useMemo(
    () => (data && data.length > 0 ? data : SEED),
    [data]
  );
  const offline = !isError && (!data || data.length === 0);

  const filas: Fila[] = useMemo(
    () => fuente.map((m: Movimiento): Fila => ({ ...m, kind: clasificar(m), ts: new Date(m.fecha).getTime() || 0 })),
    [fuente]
  );

  const [q, setQ] = useState<string>('');
  const [fTabla, setFTabla] = useState<string>('');
  const [fKind, setFKind] = useState<string>('');
  const [fUsuario, setFUsuario] = useState<string>('');
  const [sortKey, setSortKey] = useState<SortKey>('id_aud');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState<number>(1);
  const [sel, setSel] = useState<number[]>([]);
  const [detalle, setDetalle] = useState<Fila | null>(null);
  const [vista, setVista] = useState<'todos' | 'pendientes'>('todos');
  const [revisados, setRevisados] = useState<number[]>(() => {
    try { return JSON.parse(window.localStorage.getItem('unem_aud_rev') ?? '[]') as number[]; }
    catch { return []; }
  });

  useEffect(() => {
    try { window.localStorage.setItem('unem_aud_rev', JSON.stringify(revisados)); } catch { /* noop */ }
  }, [revisados]);

  useEffect(() => { setPage(1); }, [q, fTabla, fKind, fUsuario, vista]);

  useEffect(() => {
    if (!detalle) return;
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') setDetalle(null); };
    window.addEventListener('keydown', onKey);
    document.body.classList.add('unem-locked');
    return () => { window.removeEventListener('keydown', onKey); document.body.classList.remove('unem-locked'); };
  }, [detalle]);

  const tablas: string[] = useMemo(
    () => Array.from(new Set(filas.map((f: Fila): string => f.tabla_afectada))).sort(),
    [filas]
  );
  const usuarios: string[] = useMemo(
    () => Array.from(new Set(filas.map((f: Fila): string => f.usuario || 'Sistema'))).sort(),
    [filas]
  );

  const filtradas: Fila[] = useMemo(() => {
    const t = q.trim().toLowerCase();
    const out = filas.filter((f: Fila): boolean => {
      if (fTabla && f.tabla_afectada !== fTabla) return false;
      if (fKind && f.kind !== fKind) return false;
      if (fUsuario && (f.usuario || 'Sistema') !== fUsuario) return false;
      if (vista === 'pendientes' && revisados.includes(f.id_aud)) return false;
      if (t) {
        const blob = `${f.id_aud} ${f.usuario} ${f.tabla_afectada} ${TABLA_LABEL[f.tabla_afectada] ?? ''} ${f.registro_identificador} ${f.resumen_cambios} ${f.ip_origen ?? ''}`.toLowerCase();
        if (!blob.includes(t)) return false;
      }
      return true;
    });
    return out.sort((a: Fila, b: Fila): number => {
      let c = 0;
      if (sortKey === 'id_aud') c = a.id_aud - b.id_aud;
      else if (sortKey === 'fecha') c = a.ts - b.ts;
      else c = (TABLA_LABEL[a.tabla_afectada] ?? a.tabla_afectada).localeCompare(TABLA_LABEL[b.tabla_afectada] ?? b.tabla_afectada);
      return sortDir === 'asc' ? c : -c;
    });
  }, [filas, q, fTabla, fKind, fUsuario, vista, revisados, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const visibles: Fila[] = useMemo(
    () => filtradas.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE),
    [filtradas, pageSafe]
  );

  const stats = useMemo(() => {
    const c: Record<AccionKind, number> = { INSERT: 0, UPDATE: 0, SOFT_DELETE: 0, DELETE: 0, RESTORE: 0 };
    filas.forEach((f: Fila) => { c[f.kind] += 1; });
    const conIp = filas.filter((f: Fila) => !!f.ip_origen).length;
    return {
      total: filas.length, ...c,
      tablas: tablas.length,
      trazables: filas.length ? Math.round((conIp / filas.length) * 100) : 0,
      pendientes: filas.filter((f: Fila) => !revisados.includes(f.id_aud)).length,
    };
  }, [filas, tablas, revisados]);

  const spark: number[] = useMemo(() => {
    const buckets = new Array<number>(14).fill(0);
    const ids = filas.map((f: Fila) => f.id_aud);
    const max = Math.max(...ids, 1);
    const min = Math.min(...ids, 0);
    const span = Math.max(max - min, 1);
    filas.forEach((f: Fila) => {
      const i = Math.min(13, Math.floor(((f.id_aud - min) / span) * 14));
      buckets[i] += 1;
    });
    return buckets;
  }, [filas]);
  const sparkMax = Math.max(...spark, 1);

  const toggleSort = (k: SortKey): void => {
    if (sortKey === k) setSortDir((d: SortDir): SortDir => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir(k === 'tabla_afectada' ? 'asc' : 'desc'); }
  };

  const toggleSel = (id: number): void =>
    setSel((s: number[]) => (s.includes(id) ? s.filter((x: number) => x !== id) : [...s, id]));

  const allVisibleSel = visibles.length > 0 && visibles.every((f: Fila) => sel.includes(f.id_aud));
  const toggleAll = (): void => {
    if (allVisibleSel) setSel((s: number[]) => s.filter((id: number) => !visibles.some((f: Fila) => f.id_aud === id)));
    else setSel((s: number[]) => Array.from(new Set([...s, ...visibles.map((f: Fila) => f.id_aud)])));
  };

  const marcarRevisados = useCallback((ids: number[]): void => {
    if (ids.length === 0) return;
    const prev = revisados;
    setRevisados((r: number[]) => Array.from(new Set([...r, ...ids])));
    setSel([]);
    toast.custom((tt) => (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
        background: '#0b1024', color: '#eef2ff', borderRadius: 12, fontSize: 12.5, fontWeight: 600,
        boxShadow: '0 18px 48px -18px rgba(7,11,26,.6)',
      }}>
        <Undo2 size={15} />
        <span>{ids.length} movimiento(s) revisado(s)</span>
        <button
          onClick={() => { setRevisados(prev); toast.dismiss(tt.id); toast('Revisión revertida', { icon: '↩' }); }}
          style={{
            marginLeft: 6, padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,.25)',
            background: 'rgba(255,255,255,.12)', color: '#fff', fontWeight: 800, fontSize: 11.5, cursor: 'pointer',
          }}
        >Deshacer</button>
      </div>
    ), { duration: 5000 });
  }, [revisados]);

  const exportCSV = (): void => {
    const rows = sel.length > 0 ? filtradas.filter((f: Fila) => sel.includes(f.id_aud)) : filtradas;
    if (rows.length === 0) { toast.error('No hay movimientos para exportar'); return; }
    const head = ['id_aud', 'fecha', 'usuario', 'tabla', 'accion', 'registro', 'campos', 'ip', 'revisado'];
    const esc = (v: string): string => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const body = rows.map((f: Fila) => [
      f.id_aud, f.fecha, f.usuario || 'Sistema',
      TABLA_LABEL[f.tabla_afectada] ?? f.tabla_afectada,
      KIND_META[f.kind].label, f.registro_identificador, f.resumen_cambios,
      f.ip_origen ?? 'N/A', revisados.includes(f.id_aud) ? 'si' : 'no',
    ].map((v) => esc(String(v))).join(';'));
    const csv = `\uFEFF${head.join(';')}\n${body.join('\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria_unem_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} movimiento(s) exportado(s)`, { icon: '📄' });
  };

  const copiar = async (txt: string): Promise<void> => {
    try { await navigator.clipboard.writeText(txt); toast.success('Copiado al portapapeles', { icon: '📋', duration: 1400 }); }
    catch { toast.error('El navegador bloqueó el portapapeles'); }
  };

  const limpiar = (): void => {
    setQ(''); setFTabla(''); setFKind(''); setFUsuario(''); setVista('todos');
    toast('Filtros restablecidos', { icon: '↺', duration: 1400 });
  };

  const SortIco = ({ k }: { k: SortKey }): ReactNode => {
    if (sortKey !== k) return <ArrowUpDown size={11} />;
    return sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />;
  };

  const pageBtns: number[] = useMemo(() => {
    const out: number[] = [];
    const to = Math.min(totalPages, Math.max(1, pageSafe - 2) + 4);
    for (let i = Math.max(1, to - 4); i <= to; i += 1) out.push(i);
    return out;
  }, [pageSafe, totalPages]);

  const kpiStyle = (hex: string): CSSProperties => ({ ['--kpi-c' as never]: hex } as CSSProperties);

  return (
    <div className="unem-page">
      <section className="unem-hero">
        <div className="unem-hero-row">
          <div style={{ display: 'flex', gap: 15, minWidth: 0 }}>
            <span className="unem-hero-ico"><ShieldAlert size={22} /></span>
            <div style={{ minWidth: 0 }}>
              <h1>Bitácora de Auditoría</h1>
              <p>
                Registro forense de cada <strong style={{ color: '#fff' }}>INSERT</strong>,{' '}
                <strong style={{ color: '#fff' }}>UPDATE</strong> y borrado lógico, capturado por triggers
                a nivel de motor. Conserva el estado anterior y posterior en JSONB, el usuario y la IP de origen.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                <span className="unem-chip" style={{ background: 'rgba(255,255,255,.12)', color: '#dbeafe', borderColor: 'rgba(255,255,255,.2)' }}>
                  <Database size={11} /> general.aud_mov
                </span>
                <span className="unem-chip" style={{ background: 'rgba(34,211,238,.16)', color: '#a5f3fc', borderColor: 'rgba(34,211,238,.32)' }}>
                  <Fingerprint size={11} /> {stats.trazables}% con IP de origen
                </span>
                <span className="unem-chip" style={{ background: 'rgba(52,211,153,.16)', color: '#a7f3d0', borderColor: 'rgba(52,211,153,.32)' }}>
                  <Activity size={11} /> {stats.tablas} tablas vigiladas
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="unem-btn" onClick={() => { void refetch(); }} disabled={isFetching}>
              <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
              {isFetching ? 'Consultando…' : 'Actualizar'}
            </button>
            <button className="unem-btn unem-btn-primary" onClick={exportCSV}>
              <Download size={15} /> Exportar CSV
            </button>
          </div>
        </div>
      </section>

      {offline && (
        <div className="unem-note">
          <Info size={16} />
          <span>
            Mostrando un <b>extracto local de referencia</b> porque el endpoint{' '}
            <code>/analytics/auditoria/movimientos</code> no devolvió registros. Los filtros, el orden,
            la revisión y la exportación operan igualmente sobre este conjunto.
          </span>
        </div>
      )}

      <div className="unem-kpis">
        <article className="unem-kpi" style={kpiStyle('#4f46e5')}>
          <div className="unem-kpi-top">
            <span className="unem-kpi-l">Movimientos</span>
            <span className="unem-kpi-i"><Activity size={17} /></span>
          </div>
          <div className="unem-kpi-v">{stats.total}</div>
          <div className="unem-kpi-s">{stats.pendientes} pendiente(s) de revisión</div>
          <div className="unem-spark" style={{ marginTop: 10 }}>
            {spark.map((v: number, i: number) => (
              <i key={i} style={{ height: `${Math.max(6, (v / sparkMax) * 100)}%`, animationDelay: `${i * 34}ms` }} />
            ))}
          </div>
        </article>

        {KIND_ORDER.filter((k: AccionKind) => k !== 'DELETE' || stats.DELETE > 0).map((k: AccionKind) => {
          const meta = KIND_META[k];
          const Icon = meta.icon;
          const n = stats[k];
          const p = stats.total ? (n / stats.total) * 100 : 0;
          return (
            <article className="unem-kpi" key={k} style={kpiStyle(meta.hex)}>
              <div className="unem-kpi-top">
                <span className="unem-kpi-l">{meta.label}</span>
                <span className="unem-kpi-i"><Icon size={17} /></span>
              </div>
              <div className="unem-kpi-v">{n}</div>
              <div className="unem-kpi-s">{p.toFixed(1)}% del total registrado</div>
              <div className="unem-kpi-bar"><i style={{ width: `${Math.max(p, 1.5)}%` }} /></div>
            </article>
          );
        })}
      </div>

      <section className="unem-card unem-card-pad">
        <div className="unem-toolbar">
          <label className="unem-field" style={{ flex: '1 1 260px' }}>
            <Search size={15} />
            <input
              className="unem-input"
              style={{ width: '100%' }}
              placeholder="Buscar por registro, usuario, tabla, campo o IP…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>

          <select className="unem-select" value={fTabla} onChange={(e) => setFTabla(e.target.value)}>
            <option value="">Todas las tablas</option>
            {tablas.map((t: string) => <option key={t} value={t}>{TABLA_LABEL[t] ?? t}</option>)}
          </select>

          <select className="unem-select" value={fKind} onChange={(e) => setFKind(e.target.value)}>
            <option value="">Toda acción</option>
            {KIND_ORDER.map((k: AccionKind) => <option key={k} value={k}>{KIND_META[k].label}</option>)}
          </select>

          <select className="unem-select" value={fUsuario} onChange={(e) => setFUsuario(e.target.value)}>
            <option value="">Todo usuario</option>
            {usuarios.map((u: string) => <option key={u} value={u}>{u}</option>)}
          </select>

          <div className="unem-seg">
            <button data-on={vista === 'todos'} onClick={() => setVista('todos')}>Todos</button>
            <button data-on={vista === 'pendientes'} onClick={() => setVista('pendientes')}>
              Pendientes · {stats.pendientes}
            </button>
          </div>

          <button className="unem-btn unem-btn-ghost" onClick={limpiar} title="Restablecer filtros">
            <RotateCcw size={15} /> Limpiar
          </button>
        </div>

        <div className="unem-legend" style={{ marginTop: 13, paddingTop: 12, borderTop: '1px solid var(--line-2)' }}>
          {KIND_ORDER.map((k: AccionKind) => (
            <span key={k}><i style={{ background: KIND_META[k].hex }} /> {KIND_META[k].label}</span>
          ))}
        </div>
      </section>

      {sel.length > 0 && (
        <div className="unem-bulk">
          <CheckCheck size={16} style={{ color: 'var(--indigo)' }} />
          <b>{sel.length} seleccionado(s)</b>
          <button className="unem-btn unem-btn-sm unem-btn-primary" onClick={() => marcarRevisados(sel)}>
            <CheckCheck size={13} /> Marcar revisados
          </button>
          <button className="unem-btn unem-btn-sm" onClick={exportCSV}>
            <Download size={13} /> Exportar selección
          </button>
          <button className="unem-btn unem-btn-sm unem-btn-ghost" onClick={() => setSel([])}>
            <X size={13} /> Cancelar
          </button>
        </div>
      )}

      {isLoading ? (
        <section className="unem-card unem-card-pad">
          {Array.from({ length: 8 }).map((_, i: number) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
              <div className="unem-skel" style={{ width: 16, height: 16 }} />
              <div className="unem-skel" style={{ width: 54, height: 13 }} />
              <div className="unem-skel" style={{ width: 128, height: 13 }} />
              <div className="unem-skel" style={{ width: 96, height: 20, borderRadius: 99 }} />
              <div className="unem-skel" style={{ flex: 1, height: 13 }} />
            </div>
          ))}
        </section>
      ) : filtradas.length === 0 ? (
        <section className="unem-card">
          <div className="unem-empty">
            <span className="unem-empty-i"><ShieldAlert size={26} /></span>
            <b>Sin movimientos que coincidan</b>
            <span>Ajusta la búsqueda o restablece los filtros para volver a ver la bitácora completa.</span>
            <button className="unem-btn unem-btn-primary" style={{ marginTop: 16 }} onClick={limpiar}>
              <RotateCcw size={15} /> Restablecer filtros
            </button>
          </div>
        </section>
      ) : (
        <>
          <div className="unem-table-wrap unem-scroll">
            <table className="unem-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input className="unem-check" type="checkbox" checked={allVisibleSel} onChange={toggleAll} aria-label="Seleccionar página" />
                  </th>
                  <th style={{ width: 84 }}>
                    <button className="unem-th-btn" onClick={() => toggleSort('id_aud')}>ID <SortIco k="id_aud" /></button>
                  </th>
                  <th style={{ width: 158 }}>
                    <button className="unem-th-btn" onClick={() => toggleSort('fecha')}>Fecha · Hora <SortIco k="fecha" /></button>
                  </th>
                  <th style={{ width: 116 }}>Usuario</th>
                  <th style={{ width: 178 }}>
                    <button className="unem-th-btn" onClick={() => toggleSort('tabla_afectada')}>Módulo <SortIco k="tabla_afectada" /></button>
                  </th>
                  <th style={{ width: 160 }}>Acción</th>
                  <th>Registro afectado</th>
                  <th style={{ width: 118 }}>Campos</th>
                  <th style={{ width: 104, textAlign: 'right' }}>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((f: Fila) => {
                  const meta = KIND_META[f.kind];
                  const Icon = meta.icon;
                  const { d, h } = fmtFecha(f.fecha);
                  const rev = revisados.includes(f.id_aud);
                  return (
                    <tr key={f.id_aud} data-sel={sel.includes(f.id_aud)}>
                      <td>
                        <input className="unem-check" type="checkbox" checked={sel.includes(f.id_aud)}
                          onChange={() => toggleSel(f.id_aud)} aria-label={`Seleccionar ${f.id_aud}`} />
                      </td>
                      <td>
                        <span className="unem-mono unem-strong">#{f.id_aud}</span>
                        {rev && <span title="Revisado" style={{ marginLeft: 6, color: 'var(--ok)' }}><CheckCheck size={12} /></span>}
                      </td>
                      <td>
                        <div className="unem-mono unem-strong" style={{ fontSize: 12.5 }}>{d}</div>
                        <div className="unem-mono" style={{ fontSize: 11, color: 'var(--tx-3)' }}>{h}</div>
                      </td>
                      <td><span className="unem-chip unem-chip-mut">{f.usuario || 'Sistema'}</span></td>
                      <td>
                        <span className="unem-strong" style={{ fontSize: 12.5 }}>{TABLA_LABEL[f.tabla_afectada] ?? f.tabla_afectada}</span>
                        <div className="unem-mono" style={{ fontSize: 10, color: 'var(--tx-3)' }}>{f.tabla_afectada}</div>
                      </td>
                      <td><span className={`unem-chip ${meta.cls}`}><Icon size={11} /> {meta.label}</span></td>
                      <td>
                        <span className="unem-ell unem-strong" title={f.registro_identificador}>{f.registro_identificador || '—'}</span>
                        <span className="unem-mono" style={{ fontSize: 10.5, color: 'var(--tx-3)' }}>IP {f.ip_origen ?? 'no registrada'}</span>
                      </td>
                      <td>
                        <span className="unem-ell" style={{ maxWidth: 110, fontSize: 11.5 }} title={f.resumen_cambios}>
                          {f.resumen_cambios || '—'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="unem-btn unem-btn-sm" onClick={() => setDetalle(f)}>
                          <Eye size={13} /> Ver
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="unem-pager">
            <span className="unem-pager-info">
              Mostrando <b>{(pageSafe - 1) * PAGE_SIZE + 1}</b>–<b>{Math.min(pageSafe * PAGE_SIZE, filtradas.length)}</b> de{' '}
              <b>{filtradas.length}</b> movimiento(s) · página {pageSafe} de {totalPages}
            </span>
            <div className="unem-pager-ctrl">
              <button className="unem-pnum" disabled={pageSafe <= 1} onClick={() => setPage(pageSafe - 1)} aria-label="Anterior">
                <ChevronLeft size={14} />
              </button>
              {pageBtns.map((n: number) => (
                <button key={n} className="unem-pnum" data-on={n === pageSafe} onClick={() => setPage(n)}>{n}</button>
              ))}
              <button className="unem-pnum" disabled={pageSafe >= totalPages} onClick={() => setPage(pageSafe + 1)} aria-label="Siguiente">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}

      <div className="unem-note">
        <Info size={16} />
        <span>
          El <b>borrado lógico</b> (<code>estatus = 'I'</code>) se distingue de la eliminación física: el registro
          permanece en la base y puede reactivarse. Cada entrada fue escrita por{' '}
          <code>fn_auditoria_general()</code>, por lo que existe incluso para cambios hechos fuera de la aplicación.
        </span>
      </div>

      {detalle && (
        <>
          <button className="unem-drawer-scrim" onClick={() => setDetalle(null)} aria-label="Cerrar detalle" />
          <aside className="unem-drawer" role="dialog" aria-label={`Movimiento ${detalle.id_aud}`}>
            <header className="unem-drawer-head">
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                  <span className="unem-mono" style={{ fontSize: 19, fontWeight: 900, color: 'var(--tx-1)' }}>#{detalle.id_aud}</span>
                  <span className={`unem-chip ${KIND_META[detalle.kind].cls}`}>{KIND_META[detalle.kind].label}</span>
                  {revisados.includes(detalle.id_aud) && (
                    <span className="unem-chip unem-chip-ins"><CheckCheck size={11} /> Revisado</span>
                  )}
                </div>
                <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--tx-2)', fontWeight: 600 }}>
                  {TABLA_LABEL[detalle.tabla_afectada] ?? detalle.tabla_afectada}
                </div>
              </div>
              <button className="unem-icon-btn" onClick={() => setDetalle(null)} aria-label="Cerrar"><X size={17} /></button>
            </header>

            <div className="unem-drawer-body unem-scroll">
              <dl className="unem-kv">
                <dt>Fecha y hora</dt>
                <dd className="unem-mono">{fmtFecha(detalle.fecha).d} · {fmtFecha(detalle.fecha).h}</dd>
                <dt>Usuario</dt><dd>{detalle.usuario || 'Sistema / Script'}</dd>
                <dt>IP de origen</dt><dd className="unem-mono">{detalle.ip_origen ?? 'no registrada'}</dd>
                <dt>Tabla</dt><dd className="unem-mono">{detalle.tabla_afectada}</dd>
                <dt>Operación SQL</dt><dd className="unem-mono">{detalle.accion}</dd>
                <dt>Registro</dt><dd>{detalle.registro_identificador || '—'}</dd>
                <dt>Campos alterados</dt><dd>{detalle.resumen_cambios || '—'}</dd>
              </dl>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                  <b style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--tx-3)' }}>
                    Snapshot del movimiento
                  </b>
                  <button className="unem-btn unem-btn-sm" onClick={() => { void copiar(jsonPintado(detalle as unknown as Record<string, unknown>)); }}>
                    <Copy size={12} /> Copiar
                  </button>
                </div>
                <pre className="unem-json unem-scroll-dark">{jsonPintado({
                  id_aud: detalle.id_aud,
                  fec_hor: detalle.fecha,
                  usuario: detalle.usuario || 'Sistema',
                  tabla_mod: detalle.tabla_afectada,
                  accion: detalle.accion,
                  clasificacion: KIND_META[detalle.kind].label,
                  registro: detalle.registro_identificador,
                  campos: detalle.resumen_cambios,
                  dir_ip: detalle.ip_origen,
                })}</pre>
              </div>

              <div className="unem-note">
                <Info size={15} />
                <span>
                  Los valores completos <code>val_antes</code> y <code>val_despues</code> residen en{' '}
                  <code>general.aud_mov</code> como JSONB y permiten reversión punto a punto.
                </span>
              </div>
            </div>

            <footer className="unem-drawer-foot">
              <button className="unem-btn" onClick={() => setDetalle(null)}>Cerrar</button>
              <button className="unem-btn unem-btn-primary"
                onClick={() => { marcarRevisados([detalle.id_aud]); setDetalle(null); }}
                disabled={revisados.includes(detalle.id_aud)}>
                <CheckCheck size={15} />
                {revisados.includes(detalle.id_aud) ? 'Ya revisado' : 'Marcar revisado'}
              </button>
            </footer>
          </aside>
        </>
      )}
    </div>
  );
};

export const Auditoria = AuditoriaPage;
export default AuditoriaPage;
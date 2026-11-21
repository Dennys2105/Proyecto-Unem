import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { ReactNode, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Award, BarChart3, BookOpen, Boxes, CalendarDays, CalendarRange, ChevronRight,
  ClipboardList, CornerDownLeft, DoorOpen, Layers, LayoutDashboard,
  Library, LogOut, MapPin, Menu, Network, PanelLeftClose, PanelLeftOpen,
  Search, ShieldAlert, ShieldCheck, UserCheck, Users, X,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { LogoUnem } from './LogoUnem';
import { StatusBar } from './StatusBar';
import { useAuth } from '../hooks/useAuth';

interface NavItem { to: string; label: string; icon: typeof LayoutDashboard; hint: string }
interface NavGroup { title: string; items: NavItem[] }

const NAV: NavGroup[] = [
  { title: 'Panel', items: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, hint: 'Métricas operativas y académicas' },
    { to: '/analitica', label: 'Analítica', icon: BarChart3, hint: 'Tendencias, trayectos, ejes, ocupación y geografía' },
  ]},
  { title: 'Académico', items: [
    { to: '/programas', label: 'Programas', icon: BookOpen, hint: 'PNF y licenciaturas' },
    { to: '/ejes', label: 'Ejes Formativos', icon: Layers, hint: 'Ejes transversales del currículo' },
    { to: '/materias', label: 'Materias', icon: Library, hint: 'Unidades curriculares' },
    { to: '/malla', label: 'Malla Curricular', icon: Network, hint: 'Pensum por trayecto y período' },
    { to: '/periodos', label: 'Períodos Académicos', icon: CalendarDays, hint: 'Trimestres y semestres' },
    { to: '/secciones', label: 'Secciones', icon: Boxes, hint: 'Grupos de clase' },
  ]},
  { title: 'Personas', items: [
    { to: '/docentes', label: 'Docentes', icon: Users, hint: 'Personal y capacidad horaria' },
    { to: '/estudiantes', label: 'Estudiantes', icon: UserCheck, hint: 'Matrícula estudiantil' },
  ]},
  { title: 'Operación', items: [
    { to: '/asignaciones', label: 'Asignación de Carga', icon: ClipboardList, hint: 'Docente · materia · aula · hora' },
    { to: '/espacios', label: 'Espacios Físicos', icon: DoorOpen, hint: 'Aulas de Escuela Bustamante' },
    { to: '/dias', label: 'Días Laborales', icon: CalendarRange, hint: 'Calendario semanal' },
    { to: '/notas', label: 'Notas', icon: Award, hint: 'Actas de calificaciones' },
  ]},
  { title: 'Sistema', items: [
    { to: '/municipios', label: 'Municipios', icon: MapPin, hint: 'Catálogo del estado Táchira' },
    { to: '/roles', label: 'Usuarios y Permisos', icon: ShieldCheck, hint: 'Cuentas, roles y matriz de permisos' },
    { to: '/auditoria', label: 'Auditoría', icon: ShieldAlert, hint: 'Bitácora forense de cambios' },
  ]},
];

const FLAT: NavItem[] = NAV.flatMap((g: NavGroup): NavItem[] => g.items);

const REQ_MODULO: Record<string, [string, string]> = {
  '/programas':    ['malla', 'SP'],
  '/ejes':         ['malla', 'SP'],
  '/materias':     ['materias', 'SP'],
  '/malla':        ['malla', 'SP'],
  '/periodos':     ['periodos', 'SP'],
  '/secciones':    ['estudiantes', 'SP'],
  '/docentes':     ['docentes', 'SP'],
  '/estudiantes':  ['estudiantes', 'SP'],
  '/asignaciones': ['asig_carga', 'SP'],
  '/espacios':     ['espacios', 'SP'],
  '/notas':        ['notas', 'SP'],
  '/municipios':   ['municipios', 'LIM'],
  '/roles':        ['usuarios', 'LIM'],
  '/auditoria':    ['aud_mov', 'LIM'],
};

const ROL_NOMBRE: Record<number, string> = {
  1: 'Admin', 2: 'Vicerrector', 3: 'Coordinador', 4: 'Docente', 5: 'Estudiante',
};

const readLS = (k: string, f: string): string => {
  try { return window.localStorage.getItem(k) ?? f; } catch { return f; }
};

const writeLS = (k: string, v: string): void => {
  try { window.localStorage.setItem(k, v); } catch { /* noop */ }
};

const Reloj = (): ReactNode => {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span className="unem-clock">
      {now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
    </span>
  );
};

const Palette = ({ items, onClose }: { items: NavItem[]; onClose: () => void }): ReactNode => {
  const [q, setQ] = useState<string>('');
  const [sel, setSel] = useState<number>(0);
  const nav = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const results: NavItem[] = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items;
    return items.filter((i: NavItem) => `${i.label} ${i.hint} ${i.to}`.toLowerCase().includes(t));
  }, [q, items]);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setSel(0); }, [q]);

  const go = useCallback((item: NavItem | undefined): void => {
    if (!item) return;
    nav(item.to);
    onClose();
    toast.success(item.label, { icon: '→', duration: 1400 });
  }, [nav, onClose]);

  const onKey = (e: ReactKeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s: number) => Math.min(s + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s: number) => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(results[sel]); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  return (
    <div className="unem-cmdk-scrim" onClick={onClose} role="presentation">
      <div className="unem-cmdk" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Buscar módulo">
        <div className="unem-cmdk-head">
          <Search size={18} style={{ color: 'var(--tx-3)' }} />
          <input ref={inputRef} className="unem-cmdk-input"
            placeholder="Ir a un módulo… (docentes, notas, auditoría)"
            value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} />
          <button className="unem-icon-btn" onClick={onClose} aria-label="Cerrar"><X size={16} /></button>
        </div>

        <div className="unem-cmdk-list unem-scroll">
          {results.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--tx-3)', fontSize: 13 }}>
              Sin coincidencias para «{q}»
            </div>
          ) : results.map((item: NavItem, i: number) => {
            const Icon = item.icon;
            return (
              <button key={item.to} className="unem-cmdk-item" data-sel={i === sel}
                onMouseEnter={() => setSel(i)} onClick={() => go(item)}>
                <span className="unem-cmdk-ico"><Icon size={16} /></span>
                <span className="unem-cmdk-t"><b>{item.label}</b><span>{item.hint}</span></span>
                {i === sel && <CornerDownLeft size={14} style={{ color: 'var(--indigo)' }} />}
              </button>
            );
          })}
        </div>

        <div className="unem-cmdk-foot">
          <span>↑ ↓ navegar</span><span>↵ abrir</span><span>esc cerrar</span>
          <span style={{ marginLeft: 'auto' }}>{results.length} módulo(s)</span>
        </div>
      </div>
    </div>
  );
};

export const Layout = ({ children }: { children?: ReactNode }): ReactNode => {
  const loc = useLocation();
  const nav = useNavigate();
  const { puede, username, idRol } = useAuth();

  const navVisible: NavGroup[] = NAV
    .map((g: NavGroup): NavGroup => ({
      ...g,
      items: g.items.filter((i: NavItem): boolean => {
        const req = REQ_MODULO[i.to];
        return !req || puede(req[0], 'LEC', req[1]);
      }),
    }))
    .filter((g: NavGroup): boolean => g.items.length > 0);

  const flatVisible: NavItem[] = navVisible.flatMap((g: NavGroup): NavItem[] => g.items);

  const [mini, setMini] = useState<boolean>(() => readLS('unem_sidebar_mini', '0') === '1');
  const [drawer, setDrawer] = useState<boolean>(false);
  const [palette, setPalette] = useState<boolean>(false);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const current: NavItem | undefined = useMemo(
    () => flatVisible.find((i: NavItem) => loc.pathname.startsWith(i.to)) ?? FLAT.find((i: NavItem) => loc.pathname.startsWith(i.to)),
    [loc.pathname, flatVisible]
  );

  useEffect(() => {
    setDrawer(false);
    contentRef.current?.scrollTo({ top: 0 });
  }, [loc.pathname]);

  useEffect(() => {
    const lock = drawer || palette;
    document.body.classList.toggle('unem-locked', lock);
    return () => document.body.classList.remove('unem-locked');
  }, [drawer, palette]);

  const toggleMini = useCallback((): void => {
    setMini((v: boolean) => { writeLS('unem_sidebar_mini', !v ? '1' : '0'); return !v; });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((v: boolean) => !v); }
      else if (meta && e.key.toLowerCase() === 'b') { e.preventDefault(); toggleMini(); }
      else if (e.key === 'Escape') { setPalette(false); setDrawer(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleMini]);

  const salir = (): void => {
    try { window.sessionStorage.removeItem('unem_token'); } catch { /* noop */ }
    toast.success('Sesión cerrada correctamente', { icon: '👋' });
    nav('/login');
  };

  return (
    <>
      <div className="unem-shell" data-mini={mini} data-drawer={drawer}>
        <aside className="unem-sidebar" aria-label="Navegación principal">
          <div className="unem-brand">
            <LogoUnem size={40} variant="tile" />
            <span className="unem-brand-txt"><b>UNEM</b><span>Táchira</span></span>
            <button className="unem-icon-btn unem-burger"
              style={{ marginLeft: 'auto', background: 'rgba(255,255,255,.1)', borderColor: 'rgba(255,255,255,.2)', color: '#fff' }}
              onClick={() => setDrawer(false)} aria-label="Cerrar menú">
              <X size={16} />
            </button>
          </div>

          <nav className="unem-nav unem-scroll-dark">
            {navVisible.map((g: NavGroup) => (
              <div className="unem-nav-group" key={g.title}>
                <div className="unem-nav-label">{mini ? '•••' : g.title}</div>
                {g.items.map((item: NavItem) => {
                  const Icon = item.icon;
                  return (
                    <NavLink key={item.to} to={item.to} className="unem-link"
                      title={mini ? item.label : undefined}
                      data-active={loc.pathname.startsWith(item.to)}>
                      <Icon size={17} /><span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="unem-side-foot">
            <button className="unem-logout" onClick={salir} title="Cerrar sesión">
              <LogOut size={16} /><span>Cerrar Sesión</span>
            </button>
          </div>
        </aside>

        <div className="unem-main">
          <header className="unem-topbar">
            <button className="unem-icon-btn unem-burger" onClick={() => setDrawer(true)} aria-label="Abrir menú">
              <Menu size={18} />
            </button>
            <button className="unem-icon-btn unem-mini-toggle" onClick={toggleMini}
              title={mini ? 'Expandir menú (Ctrl+B)' : 'Colapsar menú (Ctrl+B)'} aria-label="Alternar ancho del menú">
              {mini ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>

            <div className="unem-crumb">
              <span className="unem-crumb-i">UNEM</span>
              <ChevronRight size={13} style={{ color: 'var(--tx-3)', flex: '0 0 auto' }} />
              <span className="unem-crumb-c">{current?.label ?? 'Panel'}</span>
            </div>

            <button className="unem-search" onClick={() => setPalette(true)} aria-label="Buscar módulo">
              <Search size={14} />
              <em style={{ fontStyle: 'normal' }}>Buscar módulo…</em>
              <span className="unem-kbd">⌘K</span>
            </button>

            <span className="unem-live">
              <span className="unem-pulse"><i /><b /></span> En vivo
            </span>

            <Reloj />

            <div className="unem-user">
              <span className="unem-avatar">{(username ?? 'U').charAt(0).toUpperCase()}</span>
              <span className="unem-user-txt"><b>{username ?? 'Usuario'}</b><span>{ROL_NOMBRE[idRol ?? 0] ?? 'Usuario'}</span></span>
            </div>
          </header>

          <main className="unem-content unem-scroll" ref={contentRef}>
            {children ?? <Outlet />}
          </main>

          <StatusBar />
        </div>
      </div>

      {drawer && <button className="unem-scrim" onClick={() => setDrawer(false)} aria-label="Cerrar menú" />}
      {palette && <Palette items={flatVisible} onClose={() => setPalette(false)} />}
    </>
  );
};

export const AppShell = Layout;
export const MainLayout = Layout;
export const DashboardLayout = Layout;
export const LayoutPage = Layout;
export default Layout;
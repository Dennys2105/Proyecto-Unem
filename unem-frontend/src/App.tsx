import { Suspense, lazy, Component } from 'react';
import type { ComponentType, ReactNode, ErrorInfo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AlertTriangle, RotateCcw, Loader2 } from 'lucide-react';
import { Layout } from './components/Layout';

/* ══════════════════════════════════════════════════════════════
   RESOLUCIÓN TOLERANTE DE EXPORTS
   Cada página del proyecto usa una convención distinta
   (`Docentes`, `DocentesPage`, `default`…). Este resolver acepta
   cualquiera, de modo que un nombre de export nunca vuelva a
   tumbar la aplicación con "does not provide an export named".
   ══════════════════════════════════════════════════════════════ */
type Modulo = Record<string, unknown>;

const esComponente = (v: unknown): v is ComponentType<Record<string, never>> =>
  typeof v === 'function' || (typeof v === 'object' && v !== null && '$$typeof' in v);

const resolver = (mod: Modulo, candidatos: string[]): ComponentType<Record<string, never>> => {
  for (const nombre of candidatos) {
    const v = mod[nombre];
    if (esComponente(v)) return v;
  }
  if (esComponente(mod.default)) return mod.default;
  for (const clave of Object.keys(mod)) {
    if (/^[A-Z]/.test(clave) && esComponente(mod[clave])) return mod[clave];
  }
  throw new Error(`El módulo no exporta ningún componente React (buscado: ${candidatos.join(', ')})`);
};

const pagina = (
  cargar: () => Promise<Modulo>,
  candidatos: string[],
) => lazy(async () => ({ default: resolver(await cargar(), candidatos) }));

/* ══════════════ PÁGINAS ══════════════ */
const Login          = pagina(() => import('./pages/Login'),            ['Login', 'LoginPage']);
const Dashboard      = pagina(() => import('./pages/Dashboard'),        ['Dashboard', 'DashboardPage']);
const Municipios     = pagina(() => import('./pages/Municipios'),       ['Municipios', 'MunicipiosPage']);
const Programas      = pagina(() => import('./pages/Programas'),        ['Programas', 'ProgramasPage']);
const Ejes           = pagina(() => import('./pages/EjesFormativos'),   ['EjesFormativos', 'EjesFormativosPage', 'EjesPage']);
const Materias       = pagina(() => import('./pages/Materias'),         ['Materias', 'MateriasPage']);
const Malla          = pagina(() => import('./pages/MallaCurricular'),  ['MallaCurricular', 'MallaCurricularPage', 'MallaPage']);
const Periodos       = pagina(() => import('./pages/PeriodosAcademicos'), ['PeriodosAcademicos', 'PeriodosAcademicosPage', 'Periodos', 'PeriodosPage']);
const Secciones      = pagina(() => import('./pages/Secciones'),        ['Secciones', 'SeccionesPage']);
const Docentes       = pagina(() => import('./pages/Docentes'),         ['DocentesPage', 'Docentes']);
const Estudiantes    = pagina(() => import('./pages/Estudiantes'),      ['EstudiantesPage', 'Estudiantes']);
const Asignaciones   = pagina(() => import('./pages/AsignacionCarga'),  ['AsignacionCarga', 'AsignacionCargaPage', 'AsignacionesPage']);
const Espacios       = pagina(() => import('./pages/EspaciosFisicos'),  ['EspaciosFisicos', 'EspaciosFisicosPage', 'EspaciosPage']);
const Dias           = pagina(() => import('./pages/Dias'),             ['Dias', 'DiasPage', 'DiasLaborales']);
const Roles          = pagina(() => import('./pages/Roles'),            ['Roles', 'RolesPage']);
const Notas          = pagina(() => import('./pages/Notas'),            ['NotasPage', 'Notas']);
const Auditoria      = pagina(() => import('./pages/Auditoria'),        ['AuditoriaPage', 'Auditoria']);
const Analitica = pagina(() => import('./pages/Analitica'), ['Analitica', 'AnaliticaPage', 'Analytics', 'AnalyticsPage']);

/* ══════════════ QUERY CLIENT ══════════════ */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

/* ══════════════ CARGA ══════════════ */
const Cargando = (): ReactNode => (
  <div style={{
    display: 'grid', placeItems: 'center', minHeight: '58vh',
    animation: 'unem-rise .4s cubic-bezier(.22,1,.36,1) both',
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 62, height: 62, margin: '0 auto', borderRadius: 18,
        display: 'grid', placeItems: 'center', color: '#fff',
        background: 'linear-gradient(140deg,#4f46e5,#7c3aed 60%,#06b6d4)',
        boxShadow: '0 18px 40px -16px rgba(79,70,229,.95)',
      }}>
        <Loader2 size={26} className="animate-spin" />
      </div>
      <p style={{ marginTop: 16, fontSize: 13.5, fontWeight: 700, color: '#475069' }}>
        Cargando módulo…
      </p>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12 }}>
        {[0, 1, 2].map((i: number) => (
          <span key={i} style={{
            width: 7, height: 7, borderRadius: 99, background: '#818cf8',
            animation: `unem-ping 1.3s ${i * 0.18}s cubic-bezier(0,0,.2,1) infinite`,
          }} />
        ))}
      </div>
    </div>
  </div>
);

/* ══════════════ ERROR BOUNDARY ══════════════ */
interface EBProps { children: ReactNode }
interface EBState { error: Error | null }

class LimiteError extends Component<EBProps, EBState> {
  state: EBState = { error: null };

  static getDerivedStateFromError(error: Error): EBState { return { error }; }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[UNEM] Error de render:', error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', padding: 24 }}>
        <div className="unem-card unem-card-pad" style={{ maxWidth: 560, textAlign: 'center' }}>
          <span style={{
            display: 'grid', placeItems: 'center', width: 56, height: 56, margin: '0 auto',
            borderRadius: 16, color: '#fff', background: 'linear-gradient(140deg,#dc2626,#e08600)',
            boxShadow: '0 16px 36px -14px rgba(220,38,38,.9)',
          }}>
            <AlertTriangle size={26} />
          </span>
          <h2 style={{ margin: '16px 0 6px', fontSize: 19, fontWeight: 900, color: '#0f172e' }}>
            Este módulo no pudo renderizarse
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: '#7b849c', lineHeight: 1.6 }}>
            El resto del sistema sigue operativo. Detalle técnico:
          </p>
          <pre className="unem-json unem-scroll-dark" style={{ marginTop: 14, textAlign: 'left' }}>
            {error.message}
          </pre>
          <div style={{ display: 'flex', gap: 9, justifyContent: 'center', marginTop: 16 }}>
            <button className="unem-btn" onClick={() => this.setState({ error: null })}>
              <RotateCcw size={15} /> Reintentar
            </button>
            <button className="unem-btn unem-btn-primary" onClick={() => { window.location.href = '/dashboard'; }}>
              Ir al Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
}

/* ══════════════ GUARD ══════════════ */
const Protegido = ({ children }: { children: ReactNode }): ReactNode => {
  const loc = useLocation();
  let token: string | null = null;
  try { token = window.sessionStorage.getItem('unem_token'); } catch { token = null; }
  if (!token) return <Navigate to="/login" replace state={{ desde: loc.pathname }} />;
  return <>{children}</>;
};

/* ══════════════ RUTAS ══════════════ */
const Rutas = (): ReactNode => (
  <Routes>
    <Route path="/login" element={<Suspense fallback={<Cargando />}><Login /></Suspense>} />

    <Route element={<Protegido><Layout /></Protegido>}>
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/programas" element={<Programas />} />
      <Route path="/ejes" element={<Ejes />} />
      <Route path="/materias" element={<Materias />} />
      <Route path="/malla" element={<Malla />} />
      <Route path="/periodos" element={<Periodos />} />
      <Route path="/secciones" element={<Secciones />} />
      <Route path="/docentes" element={<Docentes />} />
      <Route path="/estudiantes" element={<Estudiantes />} />
      <Route path="/asignaciones" element={<Asignaciones />} />
      <Route path="/espacios" element={<Espacios />} />
      <Route path="/dias" element={<Dias />} />
      <Route path="/notas" element={<Notas />} />
      <Route path="/municipios" element={<Municipios />} />
      <Route path="/roles" element={<Roles />} />
      <Route path="/auditoria" element={<Auditoria />} />
      <Route path="/analitica" element={<Analitica />} />

      {/* Alias de rutas usadas en versiones anteriores */}
      <Route path="/ejes-formativos" element={<Navigate to="/ejes" replace />} />
      <Route path="/malla-curricular" element={<Navigate to="/malla" replace />} />
      <Route path="/periodos-academicos" element={<Navigate to="/periodos" replace />} />
      <Route path="/espacios-fisicos" element={<Navigate to="/espacios" replace />} />
      <Route path="/asignacion-carga" element={<Navigate to="/asignaciones" replace />} />
      <Route path="/asignacion" element={<Navigate to="/asignaciones" replace />} />
      <Route path="/dias-laborales" element={<Navigate to="/dias" replace />} />
      <Route path="/auditoria-movimientos" element={<Navigate to="/auditoria" replace />} />
      <Route path="/analytics" element={<Navigate to="/analitica" replace />} />
    </Route>

    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

/* ══════════════ APP ══════════════ */
export const App = (): ReactNode => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <LimiteError>
        <Suspense fallback={<Cargando />}>
          <Rutas />
        </Suspense>
      </LimiteError>
      <Toaster
        position="top-right"
        gutter={10}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#ffffff',
            color: '#0f172e',
            border: '1px solid #e4e8f2',
            borderRadius: '12px',
            padding: '11px 14px',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 18px 44px -18px rgba(16,24,40,.4)',
            maxWidth: 420,
          },
          success: { iconTheme: { primary: '#0f9d58', secondary: '#ffffff' } },
          error: { iconTheme: { primary: '#dc2626', secondary: '#ffffff' }, duration: 4200 },
          loading: { iconTheme: { primary: '#4f46e5', secondary: '#ffffff' } },
        }}
      />
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
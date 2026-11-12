import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { 
  LayoutDashboard, Building2, BookOpen, Users, UserCheck, 
  Layers, MapPin, LogOut, Menu, X, Book, 
  CalendarDays, Shield, ShieldAlert, Network, ClipboardList 
} from 'lucide-react';
import { Award } from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/municipios', label: 'Municipios', icon: Building2 },
  { path: '/programas', label: 'Programas', icon: BookOpen },
  { path: '/ejes', label: 'Ejes Formativos', icon: Book },
  { path: '/periodos', label: 'Periodos Académicos', icon: CalendarDays },
  { path: '/docentes', label: 'Docentes', icon: Users },
  { path: '/estudiantes', label: 'Estudiantes', icon: UserCheck },
  { path: '/secciones', label: 'Secciones', icon: Layers },
  { path: '/espacios', label: 'Espacios Físicos', icon: MapPin },
  { path: '/materias', label: 'Materias', icon: BookOpen },
  { path: '/dias', label: 'Días Laborales', icon: CalendarDays },
  { path: '/roles', label: 'Roles', icon: Shield },
  { path: '/malla', label: 'Malla Curricular', icon: Network },
  { path: '/asignacion-carga', label: 'Asignación de Carga', icon: ClipboardList },
  { path: '/auditoria', label: 'Auditoría', icon: ShieldAlert },
  { path: '/notas', label: 'Notas', icon: Award },
];

export const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    sessionStorage.removeItem('unem_token');
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 flex flex-col`}>
        <div className="p-4 flex items-center justify-between">
          {sidebarOpen && <h1 className="text-xl font-bold">UNEM</h1>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-800 rounded">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center ${sidebarOpen ? 'px-4' : 'justify-center'} py-3 rounded-lg transition-colors ${
                  isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-800'
                }`}
              >
                <Icon size={20} />
                {sidebarOpen && <span className="ml-3">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-2 text-red-400 hover:bg-slate-800 rounded-lg"
          >
            <LogOut size={20} />
            {sidebarOpen && <span className="ml-3">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            {navItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
          </h2>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">Administrador</span>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              A
            </div>
          </div>
        </header>

        {/* Content Area - AQUÍ ESTÁ LA CLAVE */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
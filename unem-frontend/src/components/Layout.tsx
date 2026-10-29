import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building2, Users, Calendar, LogOut, Menu, X, BookOpen, CalendarDays, Shield } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/municipios', label: 'Municipios', icon: Building2 },
  { path: '/programas', label: 'Programas', icon: BookOpen },
  { path: '/dias', label: 'Días Laborales', icon: CalendarDays },
  { path: '/roles', label: 'Roles', icon: Shield },
  { path: '/docentes', label: 'Docentes', icon: Users },
  { path: '/horarios', label: 'Horarios', icon: Calendar },
];

export const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    sessionStorage.removeItem('unem_token');
    sessionStorage.removeItem('unem_auth_block');
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center justify-between h-16 px-6 bg-slate-950">
          <span className="text-xl font-bold tracking-wider">UNEM</span>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <nav className="mt-6 px-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setIsSidebarOpen(false);
                }}
                className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={20} className="mr-3" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-400 rounded-lg hover:bg-slate-800 hover:text-red-300 transition-colors"
          >
            <LogOut size={20} className="mr-3" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar */}
        <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-gray-600 hover:text-gray-900">
            <Menu size={24} />
          </button>
          <div className="flex items-center space-x-4 ml-auto">
            <span className="text-sm font-medium text-gray-700">Administrador</span>
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              A
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
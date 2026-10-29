import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
import { Municipios } from './pages/Municipios';
import { Programas } from './pages/Programas';
import { Dias } from './pages/Dias';
import { Roles } from './pages/Roles';

const Dashboard = () => (
  <div>
    <h1 className="text-2xl font-bold text-gray-800 mb-4">Panel Principal</h1>
    <p className="text-gray-600">Bienvenido al Sistema de Horarios UNEM.</p>
  </div>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/municipios" element={<Municipios />} />
              <Route path="/programas" element={<Programas />} />
              <Route path="/dias" element={<Dias />} />
              <Route path="/roles" element={<Roles />} />
              <Route path="/docentes" element={<div className="text-gray-600">Módulo Docentes (Día 4)</div>} />
              <Route path="/horarios" element={<div className="text-gray-600">Módulo Horarios (Día 5)</div>} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
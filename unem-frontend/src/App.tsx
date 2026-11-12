import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard'; // <-- Importamos el Dashboard real
import { Municipios } from './pages/Municipios';
import { Programas } from './pages/Programas';
import { EjesFormativos } from './pages/EjesFormativos';
import { PeriodosAcademicos } from './pages/PeriodosAcademicos';
import { Docentes } from './pages/Docentes';
import { Estudiantes } from './pages/Estudiantes';
import { Secciones } from './pages/Secciones';
import { EspaciosFisicos } from './pages/EspaciosFisicos';
import { Materias } from './pages/Materias';
import { Dias } from './pages/Dias';
import { Roles } from './pages/Roles';
import { MallaCurricularPage } from './pages/MallaCurricular';
import { AsignacionCargaPage } from './pages/AsignacionCarga';
import { AuditoriaPage } from './pages/Auditoria';
import { NotasPage } from './pages/Notas';

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
              <Route path="/ejes" element={<EjesFormativos />} />
              <Route path="/periodos" element={<PeriodosAcademicos />} />
              <Route path="/docentes" element={<Docentes />} />
              <Route path="/estudiantes" element={<Estudiantes />} />
              <Route path="/secciones" element={<Secciones />} />
              <Route path="/espacios" element={<EspaciosFisicos />} />
              <Route path="/materias" element={<Materias />} />          
              <Route path="/dias" element={<Dias />} />
              <Route path="/roles" element={<Roles />} />
              <Route path="/malla" element={<MallaCurricularPage />} />
              <Route path="/asignacion-carga" element={<AsignacionCargaPage />} />
              <Route path="/auditoria" element={<AuditoriaPage />} />
              <Route path="/notas" element={<NotasPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
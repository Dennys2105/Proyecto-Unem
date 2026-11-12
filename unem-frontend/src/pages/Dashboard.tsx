import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { BookOpen, Calendar, FileBarChart, UserCheck, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Función para obtener los datos del nuevo endpoint del backend
const fetchResumen = async () => {
  const token = sessionStorage.getItem('unem_token');
  const response = await axios.get('http://localhost:8000/api/v1/analytics/resumen', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const Dashboard = () => {
  const { data: resumen, isLoading } = useQuery({
    queryKey: ['resumenDashboard'],
    queryFn: fetchResumen,
  });

  if (isLoading) return <div className="p-10 text-center text-gray-500">Cargando estadísticas...</div>;

  const stats = [
    { title: 'Docentes Activos', value: resumen?.total_docentes_activos || 0, icon: Users, color: 'bg-blue-600' },
    { title: 'Estudiantes', value: resumen?.total_estudiantes_activos || 0, icon: UserCheck, color: 'bg-green-600' },
    { title: 'Asignaciones', value: resumen?.total_asignaciones_activas || 0, icon: Calendar, color: 'bg-purple-600' },
    { title: 'Horas Asignadas', value: resumen?.total_horas_asignadas || 0, icon: BookOpen, color: 'bg-orange-600' },
  ];

  // Datos de ejemplo para la gráfica (tu compañero puede agregar una vista de horas por día después)
  const datosGrafica = [
    { nombre: 'Lunes', carga: 12 },
    { nombre: 'Martes', carga: 19 },
    { nombre: 'Miércoles', carga: 15 },
    { nombre: 'Jueves', carga: 22 },
    { nombre: 'Viernes', carga: 18 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Panel de Control UNEM</h1>
        <p className="text-gray-600 mt-1">Resumen operativo y análisis de carga académica en tiempo real</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <Icon className="text-white" size={24} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <FileBarChart className="text-blue-600" size={24} />
          <h2 className="text-xl font-bold text-gray-900">Análisis: Carga Horaria Semanal</h2>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datosGrafica} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="nombre" axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
              <Bar dataKey="carga" radius={[4, 4, 0, 0]}>
                {datosGrafica.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#2563eb' : '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
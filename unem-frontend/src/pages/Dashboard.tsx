import { useDocentes } from '../hooks/useDocentes';
import { useEstudiantes } from '../hooks/useEstudiantes';
import { useAsignaciones } from '../hooks/useAsignaciones';
import { useDias } from '../hooks/useDias';
import { Users, UserCheck, Calendar, FileBarChart } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const Dashboard = () => {
  const { docentes } = useDocentes();
  const { estudiantes } = useEstudiantes();
  const { asignaciones } = useAsignaciones();
  const { dias } = useDias();

  // Análisis de datos: Agrupar asignaciones por día
  const cargaPorDia = dias?.map(dia => {
    const cantidad = asignaciones?.filter(a => a.id_dia === dia.id_dia).length || 0;
    return {
      nombre: dia.dia,
      carga: cantidad,
    };
  }) || [];

  const stats = [
    { title: 'Docentes', value: docentes?.length || 0, icon: Users, color: 'bg-blue-600' },
    { title: 'Estudiantes', value: estudiantes?.length || 0, icon: UserCheck, color: 'bg-green-600' },
    { title: 'Asignaciones Activas', value: asignaciones?.length || 0, icon: Calendar, color: 'bg-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Panel de Control UNEM</h1>
        <p className="text-gray-600 mt-1">Resumen operativo y análisis de carga académica</p>
      </div>

      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

      {/* Sección de Análisis de Datos (Gráfica) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <FileBarChart className="text-blue-600" size={24} />
          <h2 className="text-xl font-bold text-gray-900">Análisis: Carga Horaria por Día Laboral</h2>
        </div>
        
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cargaPorDia} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="nombre" axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f3f4f6' }}
              />
              <Bar dataKey="carga" radius={[4, 4, 0, 0]}>
                {cargaPorDia.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#2563eb' : '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-gray-500 mt-4 text-center">
          * Datos calculados en tiempo real a partir de las asignaciones de carga horaria registradas en el sistema.
        </p>
      </div>
    </div>
  );
};
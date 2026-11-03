import { useMunicipios } from '../hooks/useMunicipios';
import { useProgramas } from '../hooks/useProgramas';
import { useDocentes } from '../hooks/useDocentes';
import { useEstudiantes } from '../hooks/useEstudiantes';
import { useAsignaciones } from '../hooks/useAsignaciones';
import { Building2, BookOpen, Users, UserCheck, Calendar, TrendingUp } from 'lucide-react';

export const Dashboard = () => {
  const { municipios } = useMunicipios();
  const { programas } = useProgramas();
  const { docentes } = useDocentes();
  const { estudiantes } = useEstudiantes();
  const { asignaciones } = useAsignaciones();

  const stats = [
    {
      title: 'Municipios',
      value: municipios?.length || 0,
      icon: Building2,
      color: 'bg-blue-500',
    },
    {
      title: 'Programas',
      value: programas?.length || 0,
      icon: BookOpen,
      color: 'bg-green-500',
    },
    {
      title: 'Docentes',
      value: docentes?.length || 0,
      icon: Users,
      color: 'bg-purple-500',
    },
    {
      title: 'Estudiantes',
      value: estudiantes?.length || 0,
      icon: UserCheck,
      color: 'bg-orange-500',
    },
    {
      title: 'Asignaciones',
      value: asignaciones?.length || 0,
      icon: Calendar,
      color: 'bg-red-500',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Panel Principal</h1>
        <p className="text-gray-600">Bienvenido al Sistema de Horarios UNEM</p>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="text-white" size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sección de información */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <TrendingUp className="mr-2 text-blue-600" size={24} />
            Resumen del Sistema
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Total de Municipios:</span>
              <span className="font-bold text-gray-800">{municipios?.length || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Programas Académicos:</span>
              <span className="font-bold text-gray-800">{programas?.length || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Docentes Activos:</span>
              <span className="font-bold text-gray-800">{docentes?.length || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Estudiantes Registrados:</span>
              <span className="font-bold text-gray-800">{estudiantes?.length || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Asignaciones de Carga:</span>
              <span className="font-bold text-gray-800">{asignaciones?.length || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg shadow-md p-6 text-white">
          <h2 className="text-xl font-bold mb-4">Información del Sistema</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm opacity-90">Versión</p>
              <p className="text-lg font-semibold">1.0.0</p>
            </div>
            <div>
              <p className="text-sm opacity-90">Última actualización</p>
              <p className="text-lg font-semibold">{new Date().toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm opacity-90">Estado del sistema</p>
              <div className="flex items-center mt-1">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                <span className="font-semibold">Operativo</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
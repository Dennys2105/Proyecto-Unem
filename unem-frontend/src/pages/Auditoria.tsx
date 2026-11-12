import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { DataTable } from '../components/DataTable';
import { ShieldAlert, Search } from 'lucide-react';

const fetchAuditoria = async (tabla?: string, usuario?: string) => {
  const token = sessionStorage.getItem('unem_token');
  let url = 'http://localhost:8000/api/v1/analytics/auditoria/movimientos?';
  if (tabla) url += `tabla=${tabla}&`;
  if (usuario) url += `usuario=${usuario}`;
  
  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const Auditoria = () => {
  const [filtroTabla, setFiltroTabla] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('');

  const { data: movimientos, isLoading } = useQuery({
    queryKey: ['auditoria', filtroTabla, filtroUsuario],
    queryFn: () => fetchAuditoria(filtroTabla, filtroUsuario),
  });

  const columns = [
    { key: 'id_aud', label: 'ID' },
    { 
      key: 'fecha', 
      label: 'Fecha y Hora',
      render: (value: string) => new Date(value).toLocaleString('es-VE')
    },
    { key: 'usuario', label: 'Usuario' },
    { key: 'tabla_afectada', label: 'Tabla' },
    { key: 'accion', label: 'Acción' },
    { key: 'registro_identificador', label: 'Registro' },
    { key: 'resumen_cambios', label: 'Detalle del Cambio' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldAlert className="text-blue-600" size={32} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registro de Auditoría</h1>
          <p className="text-gray-600">Historial de movimientos y cambios en el sistema</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Tabla</label>
            <input 
              type="text" 
              placeholder="Ej: docentes, asignaciones..." 
              value={filtroTabla}
              onChange={(e) => setFiltroTabla(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Usuario</label>
            <input 
              type="text" 
              placeholder="Ej: admin, profesor1..." 
              value={filtroUsuario}
              onChange={(e) => setFiltroUsuario(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex items-end">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Search size={18} /> Buscar
            </button>
          </div>
        </div>

        <DataTable 
          columns={columns} 
          data={movimientos || []} 
          isLoading={isLoading} 
          rowKey={(row: any) => String(row.id_aud)} 
        />
      </div>
    </div>
  );
};
import { useDias } from '../hooks/useDias';
import { DataTable } from '../components/DataTable';
import type { Dia, DiaUpdate } from '../types/models';
import { CalendarDays, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const Dias = () => {
  const { dias, isLoading, updateDia, isUpdating } = useDias();

  // ✅ ÚNICA ACCIÓN: Alternar Activo/Inactivo (borrado lógico)
  const toggleStatus = async (dia: Dia) => {
    const nuevoEstatus = dia.estatus === 'A' ? 'I' : 'A';
    const accion = nuevoEstatus === 'A' ? 'activado' : 'desactivado';

    try {
      await updateDia({
        id: dia.id_dia,
        data: { estatus: nuevoEstatus } as DiaUpdate,
      });
      toast.success(`Día "${dia.dia}" ${accion} correctamente`, {
        icon: nuevoEstatus === 'A' ? '✅' : '⛔',
        duration: 3000,
      });
    } catch {
      toast.error(`No se pudo ${accion} el día "${dia.dia}"`);
    }
  };

  const columns = [
    { key: 'id_dia', label: 'ID' },
    {
      key: 'dia',
      label: 'Día Laboral',
      render: (value: string) => (
        <span className="font-semibold text-gray-900 capitalize">{value}</span>
      ),
    },
    {
      key: 'orden',
      label: 'Orden',
      render: (value: number) => (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">
          {value}
        </span>
      ),
    },
    {
      key: 'estatus',
      label: 'Estado',
      render: (value: string) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
            value === 'A'
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}
        >
          {value === 'A' ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'acciones',
      label: 'Acción',
      render: (_: any, row: Dia) => {
        const isActive = row.estatus === 'A';
        return (
          <button
            onClick={() => toggleStatus(row)}
            disabled={isUpdating}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50 ${
              isActive
                ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
            }`}
            title={isActive ? 'Desactivar día' : 'Activar día'}
          >
            {isActive ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
            {isActive ? 'Desactivar' : 'Activar'}
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-start gap-4">
        <div className="bg-indigo-100 p-3 rounded-xl">
          <CalendarDays className="text-indigo-600" size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Días Laborales</h1>
          <p className="text-gray-600 mt-1 max-w-2xl">
            Los días hábiles de la institución son de <strong>Lunes a Sábado</strong>. 
            Puedes <strong>activar o desactivar</strong> cada día según las necesidades 
            del calendario académico. Los días desactivados no aparecerán en los horarios 
            ni en los reportes, pero se conservan en el historial del sistema.
          </p>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Cargando días laborales...</p>
          </div>
        ) : !dias || dias.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarDays className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500 font-medium">No hay días laborales registrados</p>
            <p className="text-gray-400 text-sm mt-1">
              Contacta al administrador para configurar los días iniciales.
            </p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={dias}
            isLoading={false}
            rowKey={(row) => row.id_dia}
          />
        )}
      </div>
    </div>
  );
};
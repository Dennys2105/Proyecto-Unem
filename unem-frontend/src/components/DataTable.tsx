import React from 'react';

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  rowKey?: (row: T) => string | number;
}

export function DataTable<T>({ 
  columns, 
  data, 
  isLoading = false,
  onEdit,
  onDelete,
  rowKey 
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <p className="text-gray-500">No se encontraron registros.</p>
      </div>
    );
  }

  const getKey = (row: T, index: number): string | number => {
    if (rowKey) return rowKey(row);
    return index;
  };

  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th key={String(col.key)} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {col.label}
              </th>
            ))}
            {(onEdit || onDelete) && (
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, index) => (
            <tr key={getKey(row, index)} className="hover:bg-gray-50 transition-colors">
              {columns.map((col) => (
                <td key={String(col.key)} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {col.render ? col.render(row[col.key as keyof T], row) : String(row[col.key as keyof T] ?? '-')}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  {onEdit && (
                    <button onClick={() => onEdit(row)} className="text-blue-600 hover:text-blue-900">Editar</button>
                  )}
                  {onDelete && (
                    <button onClick={() => onDelete(row)} className="text-red-600 hover:text-red-900">Eliminar</button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
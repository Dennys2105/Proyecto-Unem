import React from 'react';

interface Column<T> { key: keyof T | string; label: string; render?: (value: any, row: T) => React.ReactNode; }
interface DataTableProps<T> {
  columns: Column<T>[]; data: T[]; isLoading?: boolean;
  onEdit?: (row: T) => void; onDelete?: (row: T) => void; rowKey?: (row: T) => string | number;
}

export function DataTable<T>({ columns, data, isLoading = false, onEdit, onDelete, rowKey }: DataTableProps<T>) {
  if (isLoading) return (
    <div className="unem-card unem-card-pad" style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--indigo)' }} />
    </div>
  );
  if (data.length === 0) return (
    <div className="unem-empty"><span className="unem-empty-i">🗂️</span><p>No se encontraron registros.</p></div>
  );
  const getKey = (row: T, i: number): string | number => (rowKey ? rowKey(row) : i);
  return (
    <div className="unem-table-wrap unem-scroll">
      <table className="unem-table">
        <thead><tr>
          {columns.map((c) => <th key={String(c.key)}>{c.label}</th>)}
          {(onEdit || onDelete) && <th style={{ textAlign: 'right' }}>Acciones</th>}
        </tr></thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={getKey(row, i)}>
              {columns.map((c) => (
                <td key={String(c.key)}>{c.render ? c.render(row[c.key as keyof T], row) : String(row[c.key as keyof T] ?? '—')}</td>
              ))}
              {(onEdit || onDelete) && (
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {onEdit && <button className="unem-btn unem-btn-sm" onClick={() => onEdit(row)}>Editar</button>}
                  {onDelete && <button className="unem-btn unem-btn-sm unem-btn-ghost" style={{ color: 'var(--danger)', marginLeft: 6 }} onClick={() => onDelete(row)}>Eliminar</button>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
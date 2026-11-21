import { useDias } from '../hooks/useDias';
import { DataTable } from '../components/DataTable';
import { PageHero } from '../components/PageHero';
import type { Dia, DiaUpdate } from '../types/models';
import { CalendarDays, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const Dias = () => {
  const { dias, isLoading, updateDia, isUpdating } = useDias();

  // ÚNICA ACCIÓN: alternar Activo/Inactivo (catálogo cerrado, borrado lógico)
  const toggleStatus = async (dia: Dia) => {
    const nuevoEstatus = dia.estatus === 'A' ? 'I' : 'A';
    const accion = nuevoEstatus === 'A' ? 'activado' : 'desactivado';
    try {
      await updateDia({ id: dia.id_dia, data: { estatus: nuevoEstatus } as DiaUpdate });
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
      label: 'Día',
      render: (value: string) => (
        <span className="unem-strong" style={{ textTransform: 'capitalize' }}>{value}</span>
      ),
    },
    {
      key: 'orden',
      label: 'Orden',
      render: (value: number) => <span className="unem-chip unem-chip-mut">{value}</span>,
    },
    {
      key: 'estatus',
      label: 'Estado',
      render: (value: string) => (
        <span className={`unem-chip ${value === 'A' ? 'unem-chip-ins' : 'unem-chip-del'}`}>
          {value === 'A' ? 'Operativo' : 'Desactivado'}
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
            className="unem-btn unem-btn-sm"
            onClick={() => toggleStatus(row)}
            disabled={isUpdating}
            style={{ color: isActive ? 'var(--danger)' : 'var(--ok)' }}
            title={isActive ? 'Desactivar día' : 'Activar día'}
          >
            {isActive ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
            {isActive ? 'Desactivar' : 'Activar'}
          </button>
        );
      },
    },
  ];

  const activos = (dias ?? []).filter((d: Dia) => d.estatus === 'A').length;
  const total = dias?.length ?? 0;

  return (
    <div className="unem-page">
      <PageHero
        icon={CalendarDays}
        titulo="Días Laborales"
        descripcion={
          <>
            Catálogo cerrado del calendario semanal. La sede opera <b>viernes y sábado</b>; los demás
            días permanecen desactivados. Solo se activan o desactivan: no se crean ni se eliminan.
          </>
        }
      />

      <section className="unem-card unem-card-pad">
        <div className="unem-toolbar">
          <span className="unem-chip unem-chip-ins">{activos} día(s) operativo(s)</span>
          <span className="unem-chip unem-chip-mut">{total - activos} desactivado(s)</span>
          <span className="unem-chip unem-chip-soft">
            Los días desactivados no aparecen en horarios ni reportes
          </span>
        </div>
      </section>

      {!dias || dias.length === 0 ? (
        <div className="unem-empty">
          <span className="unem-empty-i"><CalendarDays size={34} /></span>
          <p>No hay días laborales registrados.</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={dias}
          isLoading={isLoading}
          rowKey={(row: Dia) => row.id_dia}
        />
      )}
    </div>
  );
};
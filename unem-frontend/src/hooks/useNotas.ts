import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notaService } from '../services/notaService';
import type { NotaCreate, NotaUpdate, ActaCreate } from '../types/models';

export const useNotas = () => {
  const queryClient = useQueryClient();

  const { data: notas, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['notas'],
    queryFn: notaService.getAll,
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['notas'] });
    // El dashboard depende de las notas: refrescamos su cobertura
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };

  const createMutation = useMutation({
    mutationFn: (data: NotaCreate) => notaService.create(data),
    onSuccess: invalidar,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: NotaUpdate }) => notaService.update(id, data),
    onSuccess: invalidar,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => notaService.delete(id),
    onSuccess: invalidar,
  });

  const revisarMutation = useMutation({
    mutationFn: ({ id, accion, motivo }: { id: number; accion: 'aprobar' | 'rechazar'; motivo?: string }) =>
      accion === 'aprobar' ? notaService.aprobar(id) : notaService.rechazar(id, motivo ?? ''),
    onSuccess: invalidar,
  });

  const actaMutation = useMutation({
    mutationFn: (data: ActaCreate) => notaService.guardarActa(data),
    onSuccess: invalidar,
  });

  return {
    notas,
    isLoading,
    isFetching,
    refetch,
    createNota: createMutation.mutateAsync,
    updateNota: updateMutation.mutateAsync,
    deleteNota: deleteMutation.mutateAsync,
    guardarActa: actaMutation.mutateAsync,
    revisarNota: revisarMutation.mutateAsync,
    isRevisando: revisarMutation.isPending,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isSavingActa: actaMutation.isPending,
  };
};
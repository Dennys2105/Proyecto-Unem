import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notaService } from '../services/notaService';
import type { NotaCreate, NotaUpdate } from '../types/models';

export const useNotas = () => {
  const queryClient = useQueryClient();
  
  const { data: notas, isLoading } = useQuery({
    queryKey: ['notas'],
    queryFn: notaService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: NotaCreate) => notaService.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notas'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: NotaUpdate }) => notaService.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notas'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => notaService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notas'] }),
  });

  return {
    notas,
    isLoading,
    createNota: createMutation.mutate,
    updateNota: updateMutation.mutate,
    deleteNota: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
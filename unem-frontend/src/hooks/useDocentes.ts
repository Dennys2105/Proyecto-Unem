import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { docenteService } from '../services/docenteService';
import type { DocenteCreate, DocenteUpdate } from '../types/models';

export const useDocentes = () => {
  const queryClient = useQueryClient();

  const { data: docentes, isLoading } = useQuery({
    queryKey: ['docentes'],
    queryFn: docenteService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: DocenteCreate) => docenteService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docentes'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: DocenteUpdate }) =>
      docenteService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docentes'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => docenteService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docentes'] });
    },
  });

  return {
    docentes,
    isLoading,
    createDocente: createMutation.mutate,
    updateDocente: updateMutation.mutate,
    deleteDocente: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
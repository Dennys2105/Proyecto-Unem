import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { docenteService } from '../services/docenteService';
import type { DocenteCreate, DocenteUpdate } from '../types/models';

export const useDocentes = () => {
  const queryClient = useQueryClient();

  // 1. Extraemos 'refetch' aquí para poder forzar la actualización si es necesario
  const { 
    data: docentes, 
    isLoading, 
    refetch 
  } = useQuery({
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

  // 2. Devolvemos 'refetch' y usamos 'mutateAsync' para que el 'await' funcione
  return {
    docentes,
    isLoading,
    refetch, // <-- ESTO ES LO QUE FALTABA
    createDocente: createMutation.mutateAsync,
    updateDocente: updateMutation.mutateAsync,
    deleteDocente: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
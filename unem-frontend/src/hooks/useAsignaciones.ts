import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { asignacionService } from '../services/asignacionService';
import type { AsignacionCreate, AsignacionUpdate } from '../types/models'; // <-- CORREGIDO: se agregó 'type'

export const useAsignaciones = () => {
  const queryClient = useQueryClient();

  const { data: asignaciones, isLoading } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: asignacionService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: AsignacionCreate) => asignacionService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: AsignacionUpdate }) =>
      asignacionService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => asignacionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
    },
  });

  return {
    asignaciones,
    isLoading,
    createAsignacion: createMutation.mutateAsync,
    updateAsignacion: updateMutation.mutateAsync,
    deleteAsignacion: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
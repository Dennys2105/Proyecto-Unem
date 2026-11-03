import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bloqueHorarioService } from '../services/bloqueHorarioService';
import type { BloqueHorarioCreate, BloqueHorarioUpdate } from '../types/models';

export const useBloquesHorarios = () => {
  const queryClient = useQueryClient();

  const { data: bloques, isLoading } = useQuery({
    queryKey: ['bloques_horarios'],
    queryFn: bloqueHorarioService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: BloqueHorarioCreate) => bloqueHorarioService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bloques_horarios'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: BloqueHorarioUpdate }) =>
      bloqueHorarioService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bloques_horarios'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => bloqueHorarioService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bloques_horarios'] });
    },
  });

  return {
    bloques,
    isLoading,
    createBloque: createMutation.mutate,
    updateBloque: updateMutation.mutate,
    deleteBloque: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
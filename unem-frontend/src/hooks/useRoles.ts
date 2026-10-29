import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolService } from '../services/rolService';
import type { RolCreate, RolUpdate } from '../types/models';

export const useRoles = () => {
  const queryClient = useQueryClient();

  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: rolService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: RolCreate) => rolService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: RolUpdate }) =>
      rolService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => rolService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });

  return {
    roles,
    isLoading,
    createRol: createMutation.mutate,
    updateRol: updateMutation.mutate,
    deleteRol: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
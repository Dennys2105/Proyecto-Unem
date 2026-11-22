import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesService } from '../services/rolesService';
import type { RolCreate, RolUpdate } from '../types/models';

export const useRoles = () => {
  const queryClient = useQueryClient();

  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: rolesService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: RolCreate) => rolesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: RolUpdate }) =>
      rolesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => rolesService.delete(id),
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
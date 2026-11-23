import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { estudianteService } from '../services/estudianteService';
import type { EstudianteCreate, EstudianteUpdate } from '../types/models';

export const useEstudiantes = () => {
  const [filtroSeccion, setFiltroSeccion] = useState<number | undefined>(undefined);
  const [busqueda, setBusqueda] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: estudiantes, isLoading, refetch } = useQuery({
    queryKey: ['estudiantes', filtroSeccion, busqueda],
    queryFn: () => estudianteService.getEstudiantesFiltrados(filtroSeccion, busqueda),
  });

  const createMutation = useMutation({
    mutationFn: (data: EstudianteCreate) => estudianteService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estudiantes'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: EstudianteUpdate }) =>
      estudianteService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estudiantes'] });
    },
  });

  const cambiarEstadoMutation = useMutation({
    mutationFn: ({ id, estatus }: { id: number; estatus: 'A' | 'I' }) =>
      estudianteService.cambiarEstado(id, estatus),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['estudiantes'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => estudianteService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estudiantes'] });
    },
  });

  return {
    estudiantes,
    isLoading,
    refetch,
    filtroSeccion,
    setFiltroSeccion,
    busqueda,
    setBusqueda,
    createEstudiante: createMutation.mutate,
    updateEstudiante: updateMutation.mutate,
    cambiarEstadoEstudiante: cambiarEstadoMutation.mutateAsync,
    isCambiandoEstado: cambiarEstadoMutation.isPending,
    deleteEstudiante: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listMaterias, getMateriaEstudiantes } from './api';

export function useMaterias() {
  return useQuery({ queryKey: ['materias'], queryFn: listMaterias });
}

/** Hook para obtener estudiantes de una materia con el query key canónico. */
export function useEstudiantes(materiaId: string) {
  const query = useQuery({
    queryKey: ['materia-estudiantes', materiaId],
    queryFn: () => getMateriaEstudiantes(materiaId),
    enabled: Boolean(materiaId),
  });

  const estudiantes = useMemo(() => query.data?.estudiantes ?? [], [query.data?.estudiantes]);

  return { estudiantes, isLoading: query.isLoading, query };
}

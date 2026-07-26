import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select } from '@/components/ui';
import { listMaterias, getMateriaEstudiantes } from './api';
import type { Materia } from '@/types/api';

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

  return { estudiantes, isLoading: query.isLoading, query };}

export function MateriaSelect({ value, onChange, materias }: { value: string; onChange: (id: string) => void; materias: Materia[] }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} className="max-w-xs">
      {materias.length === 0 && <option value="">Sin materias</option>}
      {materias.map((m) => (
        <option key={m.id} value={m.id}>{m.nombre}</option>
      ))}
    </Select>
  );
}

import { useQuery } from '@tanstack/react-query';
import { Select } from '@/components/ui';
import { listMaterias } from './api';
import type { Materia } from '@/types/api';

export function useMaterias() {
  return useQuery({ queryKey: ['materias'], queryFn: listMaterias });
}

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

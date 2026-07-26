import { useOutletContext } from 'react-router-dom';
import type { Materia, MateriaConEstudiantes } from '@/types/api';

export type MateriaContext = {
  materia: Materia | MateriaConEstudiantes;
  canManageMateria: boolean;
  isStudent: boolean;
};

export function useMateriaContext(): MateriaContext {
  return useOutletContext<MateriaContext>();
}

import { api } from '@/lib/api';
import type { ResumenProfesor } from '@/types/api';

export async function getResumenProfesor(): Promise<ResumenProfesor> {
  const { data } = await api.get<ResumenProfesor>('/reportes/profesor/resumen');
  return data;
}

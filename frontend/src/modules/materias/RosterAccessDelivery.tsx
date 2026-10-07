import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Modal } from '@/components/ui';
import { useAuth } from '@/stores/auth';
import { getMateriaEstudiantes } from './api';
import { RosterCredentials } from './RosterCredentials';

export function RosterAccessDelivery({ materiaId, onClose }: { materiaId: string; onClose: () => void }) {
  const user = useAuth(state => state.user);
  const [owner] = useState(user?.id);
  const permitted = Boolean(owner) && owner === user?.id && Boolean(user?.permissions?.includes('subjects.update'));
  const query = useQuery({ queryKey: ['roster-delivery', materiaId, owner], queryFn: () => getMateriaEstudiantes(materiaId), enabled: permitted, gcTime: 0, staleTime: 0, retry: false });
  if (!permitted) return null;
  return <Modal open onClose={onClose} title="Entregar accesos" description="Selecciona todo el grupo o algunos estudiantes. Cada ficha debe entregarse en privado." className="max-w-2xl">
    {query.isFetching ? <p role="status">Cargando estudiantes…</p> : query.isError ? <div role="alert"><p>No pudimos cargar los accesos.</p><Button onClick={() => void query.refetch()}>Reintentar</Button></div> : query.data?.id === materiaId ? <RosterCredentials result={{ creados: 0, matriculados_existentes: 0, ya_matriculados: 0, omitidos: 0, credenciales_mostradas_una_vez: true, credenciales: [] }} subjectName={query.data.nombre} students={query.data.estudiantes.map(item => ({ estudiante_id: item.id, nombre: item.nombre, email: item.email }))} /> : <p>No hay estudiantes disponibles.</p>}
  </Modal>;
}

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Modal } from '@/components/ui';
import { useAuth } from '@/stores/auth';
import { getMateriaEstudiantes } from './api';
import { RosterCredentials } from './RosterCredentials';
import { resetTemporaryPassword } from './rosterImportApi';

export function RosterAccessDelivery({ materiaId, onClose }: { materiaId: string; onClose: () => void }) {
  const user = useAuth(state => state.user);
  const [owner] = useState(user?.id);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [generated, setGenerated] = useState<Record<string, Awaited<ReturnType<typeof resetTemporaryPassword>>>>({});
  const secretSession = useRef(user);
  const active = useRef(true);
  const locked = useRef(false);
  const permitted = Boolean(owner) && owner === user?.id && Boolean(user?.permissions?.includes('subjects.update'));
  const query = useQuery({ queryKey: ['roster-delivery', materiaId, owner], queryFn: () => getMateriaEstudiantes(materiaId), enabled: permitted, gcTime: 0, staleTime: 0, retry: false, refetchOnWindowFocus: false });
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    if (secretSession.current !== user) { setGenerated({}); setError(''); setProgress(''); secretSession.current = user; }
  }, [user]);
  async function generate(ids: string[]) {
    if (!permitted || locked.current || !ids.length) return;
    locked.current = true;
    setBusy(true); setError(''); setProgress('Comprobando estudiantes…');
    const session = useAuth.getState().user;
    const valid = () => active.current && useAuth.getState().user === session && Boolean(session?.permissions?.includes('subjects.update'));
    let received = 0;
    try {
      const fresh = await getMateriaEstudiantes(materiaId);
      if (!valid()) return;
      const targets = [...new Set(ids)].map(id => fresh.estudiantes.find(student => student.id === id && student.email_es_interno));
      if (fresh.id !== materiaId || targets.some(student => !student)) {
        setError('La lista cambió. Cierra y vuelve a seleccionar antes de generar claves.');
        setProgress('');
        return;
      }
      for (const student of targets) {
        if (!valid()) return;
        if (!student || generated[student.id]) continue;
        setProgress(`Generando clave ${received + 1} de ${targets.length}…`);
        try {
          const value = await resetTemporaryPassword(materiaId, student.id);
          if (!valid()) return;
          if (value.estudiante_id !== student.id || !value.password_temporal || !value.email) throw new Error('Resultado incompleto');
          setGenerated(current => ({ ...current, [student.id]: value }));
          received++;
        } catch {
          if (!valid()) return;
          setError(`No recibimos una clave confirmada para ${student.nombre}. Su clave puede haber cambiado si se perdió la conexión. Se detuvo la generación; no se reintentó ni se continuó con los demás. Descarga las claves recibidas. Para ese estudiante, una nueva generación requiere confirmar otra vez.`);
          break;
        }
      }
      if (valid()) setProgress(`${received} claves nuevas recibidas. Descárgalas antes de cerrar esta ventana.`);
    } catch {
      if (valid()) { setError('No pudimos comprobar la lista. No se generaron claves.'); setProgress(''); }
    } finally {
      locked.current = false;
      if (active.current) setBusy(false);
    }
  }
  if (!permitted) return null;
  return <Modal open onClose={() => { if (!locked.current) onClose(); }} closeOnBackdrop={!busy} closeOnEscape={!busy} showCloseButton={!busy} title="Entregar accesos" description="Selecciona todo el grupo o algunos estudiantes. Cada ficha debe entregarse en privado." className="max-w-2xl">
    {progress && <p role="status" className="mb-3 text-sm">{progress}</p>}
    {error && <p role="alert" className="mb-3 rounded-lg border border-danger p-3 text-sm">{error}</p>}
    {query.isFetching ? <p role="status">Cargando estudiantes…</p> : query.isError ? <div role="alert"><p>No pudimos cargar los accesos.</p><Button onClick={() => void query.refetch()}>Reintentar</Button></div> : query.data?.id === materiaId ? <RosterCredentials result={{ creados: 0, matriculados_existentes: 0, ya_matriculados: 0, omitidos: 0, credenciales_mostradas_una_vez: true, credenciales: [] }} subjectName={query.data.nombre} generating={busy} onGenerate={generate} students={query.data.estudiantes.map(item => ({ estudiante_id: item.id, nombre: item.nombre, email: item.email, email_es_interno: item.email_es_interno, ...(secretSession.current === user ? generated[item.id] : undefined) }))} /> : <p>No hay estudiantes disponibles.</p>}
  </Modal>;
}

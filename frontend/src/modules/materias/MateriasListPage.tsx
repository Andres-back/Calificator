import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, BookOpen, UserPlus } from 'lucide-react';
import { Button, Card, Badge, Skeleton, EmptyState, Modal, Input, Field, Textarea, QueryState } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { listMaterias, createMateria } from './api';
import { queryClient } from '@/lib/queryClient';
import { toApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useAuth } from '@/stores/auth';

const COURSE_TONES = [
  { border: 'border-l-brand-500', icon: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300' },
  { border: 'border-l-sky-500', icon: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300' },
  { border: 'border-l-emerald-500', icon: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300' },
  { border: 'border-l-amber-500', icon: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300' },
  { border: 'border-l-rose-500', icon: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300' },
  { border: 'border-l-cyan-500', icon: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300' },
];
const MAX_ACTIVE_MATERIAS = 6;
const LIMIT_MESSAGE = 'Has alcanzado el límite máximo de 6 materias.';

export function MateriasListPage() {
  const user = useAuth((state) => state.user);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nombre: '', area: '', grado: '', descripcion: '' });
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['materias'], queryFn: listMaterias });
  const isStudent = user?.rol === 'estudiante';
  const isProfesor = user?.rol === 'profesor';
  const canCreateMateria = !isStudent;
  const activeMateriaCount = data?.filter((materia) => materia.estado === 'activa').length ?? 0;
  const reachedMateriaLimit = isProfesor && activeMateriaCount >= MAX_ACTIVE_MATERIAS;
  const subtitle = isProfesor
    ? `Tus clases y sus estudiantes. Materias creadas: ${activeMateriaCount}/${MAX_ACTIVE_MATERIAS}.`
    : isStudent
      ? 'Consulta tus materias inscritas y únete a nuevas clases con el código de tu docente.'
      : 'Tus clases y sus estudiantes.';

  const create = useMutation({
    mutationFn: () => createMateria({ nombre: form.nombre.trim(), area: form.area.trim() || undefined, grado: form.grado.trim() || undefined, descripcion: form.descripcion.trim() || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materias'] });
      toast.success('Materia creada');
      setOpen(false);
      setForm({ nombre: '', area: '', grado: '', descripcion: '' });
    },
    onError: (e) => {
      const error = toApiError(e);
      toast.error(error.status === 409 ? LIMIT_MESSAGE : error.detail);
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Materias"
        eyebrow="Tus cursos"
        subtitle={subtitle}
        badge={isProfesor ? <Badge tone={reachedMateriaLimit ? 'warning' : 'neutral'}>{activeMateriaCount}/{MAX_ACTIVE_MATERIAS} activas</Badge> : undefined}
        action={
          isStudent ? (
            <Link
              to="/app/materias/unirse"
              className="focus-ring inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-brand-600 bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 sm:w-auto"
            >
              <UserPlus className="h-4 w-4" />
              Unirme a materia
            </Link>
          ) : (
            <Button onClick={() => setOpen(true)} disabled={reachedMateriaLimit}><Plus className="h-4 w-4" /> Nueva materia</Button>
          )
        }
      />

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => void refetch()}
        isEmpty={!data || data.length === 0}
        loading={<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-40" />)}</div>}
        empty={
          <EmptyState
            icon={BookOpen}
              image="/branding/empty-no-subjects.png"
            title={isStudent ? 'Aún no estás inscrito en materias' : 'Aún no tienes materias'}
            description={isStudent ? 'Únete a una materia usando el código que te compartió tu docente.' : 'Crea tu primera clase y comparte el código para que tus estudiantes se inscriban.'}
            action={
              isStudent ? (
                <Link to="/app/materias/unirse" className="focus-ring inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-brand-600 bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 sm:w-auto">
                  <UserPlus className="h-4 w-4" /> Unirme a materia
                </Link>
              ) : (
                <Button onClick={() => setOpen(true)} disabled={reachedMateriaLimit}><Plus className="h-4 w-4" /> Nueva materia</Button>
              )
            }
          />
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((materia, index) => {
            const tone = COURSE_TONES[index % COURSE_TONES.length];
            return (
            <motion.div key={materia.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <Link to={`/app/materias/${materia.id}`}>
                <Card interactive className={cn('group h-full border-l-4 p-5', tone.border)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className={cn('grid h-10 w-10 place-items-center rounded-lg', tone.icon)}><BookOpen className="h-5 w-5" /></div>
                    <Badge tone={materia.estado === 'activa' ? 'success' : 'neutral'} className="capitalize">{materia.estado}</Badge>
                  </div>
                  <div className="mt-4">
                    <p className="line-clamp-1 font-display text-lg font-bold group-hover:text-brand-600">{materia.nombre}</p>
                    <p className="mt-1 text-sm text-muted">{[materia.area, materia.grado].filter(Boolean).join(' · ') || 'Sin área o grado definidos'}</p>
                    {materia.descripcion && <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted">{materia.descripcion}</p>}
                    {!isStudent && (
                      <div className="mt-4 border-t border-border pt-4">
                        <p className="text-[11px] font-semibold uppercase text-muted">Código de matrícula</p>
                        <span className="mt-1 block font-mono text-sm font-extrabold text-brand-700 dark:text-brand-200">{materia.codigo_matricula}</span>
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
            </motion.div>
            );
          })}
        </div>
      </QueryState>
      {canCreateMateria && <Modal open={open} onClose={() => setOpen(false)} title="Nueva materia">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
          <Field label="Nombre" required><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ciencias Naturales 4°" required minLength={2} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Área"><Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Ciencias" /></Field>
            <Field label="Grado"><Input value={form.grado} onChange={(e) => setForm({ ...form, grado: e.target.value })} placeholder="4°" /></Field>
          </div>
          <Field label="Descripción"><Textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Breve descripción…" /></Field>
          {reachedMateriaLimit && <p className="text-sm text-amber-700">{LIMIT_MESSAGE}</p>}
          <Button type="submit" loading={create.isPending} disabled={reachedMateriaLimit} className="w-full">Crear materia</Button>
        </form>
      </Modal>}
    </div>
  );
}

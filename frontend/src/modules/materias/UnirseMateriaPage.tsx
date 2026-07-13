import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, BookOpen, KeyRound, TriangleAlert } from 'lucide-react';
import { Button, Card, EmptyState, Field, Input } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { toApiError } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/stores/auth';
import { unirseMateria } from './api';

function humanizeJoinError(error: unknown) {
  const apiError = toApiError(error);
  const detail = apiError.detail.toLowerCase();

  if (apiError.status === 0) return 'No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.';
  if (apiError.status === 404) return 'El código no corresponde a una materia activa.';
  if (apiError.status === 409 || detail.includes('matriculad')) return 'Ya estás matriculado en esta materia.';
  if (detail.includes('aprobacion') || detail.includes('aprobaci')) return 'Esta materia requiere aprobación del docente.';
  if (apiError.status === 400) return apiError.detail || 'El código no es válido.';
  if (apiError.status === 403) return apiError.detail || 'No tienes permisos para unirte a esta materia.';

  return apiError.detail;
}

export function UnirseMateriaPage() {
  const user = useAuth((state) => state.user);
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState('');
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState(false);

  const join = useMutation({
    mutationFn: () => unirseMateria(codigo.trim().toUpperCase()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['materias'] });
      toast.success('Te uniste a la materia.');
      setCodigo('');
      setLocalError('');
      setSuccess(true);
    },
    onError: (error) => {
      setSuccess(false);
      setLocalError(humanizeJoinError(error));
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = codigo.trim();
    if (!normalized) {
      setSuccess(false);
      setLocalError('Escribe el código de matrícula.');
      return;
    }
    setLocalError('');
    join.mutate();
  }

  if (user?.rol && user.rol !== 'estudiante') {
    return (
      <div className="space-y-6">
        <PageHeader title="Unirme a materia" subtitle="Esta opción está disponible para estudiantes." />
        <EmptyState icon={TriangleAlert} title="Acceso estudiantil" description="Los profesores administran materias desde la sección Materias." action={<Button variant="secondary" onClick={() => navigate('/app/materias')}>Ir a materias</Button>} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unirme a materia"
        eyebrow="Acceso estudiantil"
        subtitle="Ingresa el código compartido por tu docente para agregar la materia a tu lista."
        action={<Button variant="secondary" onClick={() => navigate('/app/materias')}><ArrowLeft className="h-4 w-4" /> Mis materias</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,560px)_1fr]">
        <Card className="p-6">
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-brand-200 bg-brand-50 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-600 text-white"><KeyRound className="h-5 w-5" /></div>
            <div><p className="font-semibold">Ingresa el código exactamente como te lo compartieron.</p><p className="text-sm text-muted">Cuando se confirme, la materia aparecerá en tu lista de Mis materias.</p></div>
          </div>
          <form onSubmit={submit} className="space-y-5">
            <Field label="Código de matrícula" required hint="Usa el código exacto entregado por el docente.">
              <Input value={codigo} onChange={(event) => { setCodigo(event.target.value.toUpperCase()); setLocalError(''); setSuccess(false); }} placeholder="ABC123" autoComplete="off" disabled={join.isPending} />
            </Field>

            {localError && <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /><span>{localError}</span></div>}
            {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">Materia agregada. Puedes verla en Mis materias.</div>}

            <Button type="submit" loading={join.isPending} className="w-full"><KeyRound className="h-4 w-4" /> Unirme</Button>
          </form>
        </Card>

        <Card className="flex items-start gap-4 p-6">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300"><BookOpen className="h-5 w-5" /></div>
          <div><p className="font-semibold">Solo necesitas el código de tu docente.</p><p className="mt-1 text-sm text-muted">Si el código no funciona, verifica que esté activo o pide al profesor que lo regenere. Algunas materias pueden requerir aprobación del docente.</p></div>
        </Card>
      </div>
    </div>
  );
}

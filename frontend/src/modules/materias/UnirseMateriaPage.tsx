import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { BookOpen, KeyRound, TriangleAlert } from 'lucide-react';
import { Button, Field, Input, Modal } from '@/components/ui';
import { toApiError } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
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

export function JoinMateriaModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
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
    if (!codigo.trim()) {
      setSuccess(false);
      setLocalError('Escribe el código de matrícula.');
      return;
    }
    setLocalError('');
    join.mutate();
  }

  function close() {
    if (join.isPending) return;
    setCodigo('');
    setLocalError('');
    setSuccess(false);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Unirme a una materia"
      className="max-w-xl"
      closeOnBackdrop={!join.isPending}
      closeOnEscape={!join.isPending}
    >
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-600 text-white">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold">Escribe el código que te compartió tu docente.</p>
          <p className="mt-1 text-sm leading-5 text-muted">Al confirmarlo, la clase aparecerá aquí mismo en Mis materias.</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <Field label="Código de matrícula" required hint="No importa si lo escribes en mayúsculas o minúsculas.">
          <Input
            autoFocus
            value={codigo}
            onChange={(event) => {
              setCodigo(event.target.value.toUpperCase());
              setLocalError('');
              setSuccess(false);
            }}
            placeholder="ABC123"
            autoComplete="off"
            disabled={join.isPending}
          />
        </Field>

        {localError && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{localError}</span>
          </div>
        )}
        {success && (
          <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
            <BookOpen className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Materia agregada correctamente. Ya aparece en tu lista.</span>
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={close} disabled={join.isPending}>
            {success ? 'Listo' : 'Cancelar'}
          </Button>
          {!success && (
            <Button type="submit" loading={join.isPending} disabled={!codigo.trim()}>
              <KeyRound className="h-4 w-4" /> Unirme a la materia
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}

// Compatibilidad para enlaces antiguos: el formulario ahora vive en Mis materias.
export function UnirseMateriaPage() {
  return <Navigate to="/app/materias?unirse=1" replace />;
}

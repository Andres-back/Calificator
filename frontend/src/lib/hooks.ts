import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { toApiError } from './api';
import { queryClient } from './queryClient';

interface UseDeleteConfirmOptions {
  /** Función que recibe el id del recurso a eliminar. */
  mutationFn: (id: string) => Promise<unknown>;
  /** Query key a invalidar tras la eliminación. */
  queryKey: string[];
  /** Mensaje de éxito. Por defecto "Eliminado correctamente." */
  successMessage?: string;
  /** Callback opcional ejecutado tras invalidar. */
  onSuccess?: () => void;
}

/**
 * State machine + mutation para el patrón "Seleccionar ítem → ConfirmDialog → eliminar".
 * Maneja el estado del target, la mutación, el toast y la invalidación.
 */
export function useDeleteConfirm({
  mutationFn,
  queryKey,
  successMessage = 'Eliminado correctamente.',
  onSuccess,
}: UseDeleteConfirmOptions) {
  const [target, setTarget] = useState<{ id: string; title: string } | null>(null);

  const mutation = useMutation({
    mutationFn: () => mutationFn(target!.id),
    onSuccess: () => {
      toast.success(successMessage);
      queryClient.invalidateQueries({ queryKey });
      setTarget(null);
      onSuccess?.();
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  return { target, setTarget, mutation };
}

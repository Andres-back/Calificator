import { type ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

/**
 * Diálogo de confirmación reutilizable para acciones definitivas o destructivas.
 * No ejecuta nada hasta que el usuario pulsa "Confirmar". Bloquea el cierre
 * mientras `loading` está activo para evitar dobles envíos.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  loading = false,
  tone = 'primary',
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  tone?: 'primary' | 'danger';
  children?: ReactNode;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description} closeOnBackdrop={!loading} closeOnEscape={!loading} showCloseButton={!loading}>
      <div className="space-y-4">
        {children}
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={loading} disabled={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

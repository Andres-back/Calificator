import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import { Badge, Button, Card, Field, Modal, Select } from '@/components/ui';
import { api, toApiError } from '@/lib/api';

const TIPOS = [
  { value: 'actividad', label: 'Actividad de refuerzo' },
  { value: 'explicacion', label: 'Explicación alternativa' },
  { value: 'ejercicio', label: 'Ejercicio de verificación' },
  { value: 'plan_clase', label: 'Mini planificación de clase' },
];

interface RefuerzoContenido {
  titulo?: string;
  objetivo?: string;
  duracion_minutos?: number;
  materiales?: string[];
  instrucciones?: string;
  actividad_principal?: string;
  evidencia_aprendizaje?: string;
  adaptacion_nivel?: string;
  [key: string]: unknown;
}

interface RefuerzoResultado {
  id: string;
  modelo?: string | null;
  contenido_json?: RefuerzoContenido;
}

interface Props {
  open: boolean;
  onClose: () => void;
  materiaId: string;
  criterioNombre: string;
  porcentajeLogro: number;
  estudiantesConDificultad: number;
  totalEstudiantes: number;
}

export function XaliRefuerzoModal({
  open, onClose, materiaId, criterioNombre,
  porcentajeLogro, estudiantesConDificultad, totalEstudiantes,
}: Props) {
  const [tipo, setTipo] = useState('actividad');
  const [resultado, setResultado] = useState<RefuerzoResultado | null>(null);
  const [editando, setEditando] = useState(false);
  const [editContent, setEditContent] = useState('');

  const generarMut = useMutation({
    mutationFn: () => api.post('/xali/refuerzos/generar', {
      materia_id: materiaId,
      criterio_nombre: criterioNombre,
      porcentaje_logro: porcentajeLogro,
      estudiantes_con_dificultad: estudiantesConDificultad,
      total_estudiantes: totalEstudiantes,
      tipo,
    }).then(r => r.data),
    onSuccess: (data) => {
      setResultado(data);
      const c = data.contenido_json || {};
      setEditContent(JSON.stringify(c, null, 2));
      setEditando(false);
      toast.success('Refuerzo generado');
    },
    onError: (e) => toast.error(toApiError(e).detail),
  });

  const guardarMut = useMutation({
    mutationFn: () => {
      if (!resultado) throw new Error('No hay un refuerzo para guardar.');
      const parsed = JSON.parse(editContent);
      return api.patch(`/xali/refuerzos/${resultado.id}`, { contenido_json: parsed }).then(r => r.data);
    },
    onSuccess: () => { toast.success('Refuerzo guardado'); onClose(); },
    onError: (e) => toast.error(toApiError(e).detail),
  });

  function handleClose() {
    setResultado(null);
    setEditando(false);
    setEditContent('');
    onClose();
  }

  const content = resultado?.contenido_json;

  return (
    <Modal open={open} onClose={handleClose} title="Preparar refuerzo con Xali">
      <div className="space-y-5">
        {/* Contexto */}
        <Card className="flex items-start gap-3 border-l-4 border-l-amber-500 p-4">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div className="text-sm">
            <p className="font-semibold">{criterioNombre}</p>
            <p className="mt-1 text-muted">{porcentajeLogro.toFixed(0)}% logro · {estudiantesConDificultad} de {totalEstudiantes} estudiantes con dificultad</p>
          </div>
        </Card>

        {/* Selector de tipo (solo si no hay resultado aún) */}
        {!resultado && (
          <Field label="Tipo de recurso">
            <Select value={tipo} onChange={(e) => setTipo(e.target.value)} disabled={generarMut.isPending}>
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </Field>
        )}

        {/* Botón generar */}
        {!resultado && (
          <Button onClick={() => generarMut.mutate()} loading={generarMut.isPending} className="w-full">
            <Sparkles className="h-4 w-4" /> Generar con Xali
          </Button>
        )}

        {/* Resultado */}
        {resultado && content && (
          <div className="space-y-4">
            {!editando ? (
              <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
                {content.titulo && <p className="text-lg font-bold">{content.titulo}</p>}
                {content.objetivo && <p className="text-sm"><strong>Objetivo:</strong> {content.objetivo}</p>}
                {content.duracion_minutos && <Badge tone="brand">{content.duracion_minutos} min</Badge>}
                {content.materiales && Array.isArray(content.materiales) && (
                  <div className="text-sm"><strong>Materiales:</strong> {content.materiales.join(', ')}</div>
                )}
                {content.instrucciones && <p className="text-sm"><strong>Instrucciones:</strong> {content.instrucciones}</p>}
                {content.actividad_principal && <p className="text-sm"><strong>Actividad:</strong> {content.actividad_principal}</p>}
                {content.evidencia_aprendizaje && <p className="text-sm"><strong>Evidencia:</strong> {content.evidencia_aprendizaje}</p>}
                {content.adaptacion_nivel && <p className="text-sm"><strong>Adaptación:</strong> {content.adaptacion_nivel}</p>}
                <p className="text-[10px] text-muted">Generado con {resultado.modelo || 'IA'}</p>
              </div>
            ) : (
              <Field label="Editar contenido (JSON)">
                <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={15}
                  className="focus-ring w-full rounded-lg border border-border bg-surface-2 p-3 font-mono text-xs" />
              </Field>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => { setEditando(!editando); }}>
                {editando ? 'Vista previa' : 'Editar'}
              </Button>
              <Button variant="outline" onClick={handleClose}>Descartar</Button>
              <Button onClick={() => guardarMut.mutate()} loading={guardarMut.isPending}>
                <CheckCircle2 className="h-4 w-4" /> Guardar refuerzo
              </Button>
            </div>
          </div>
        )}

        {generarMut.isPending && (
          <div className="flex items-center justify-center gap-3 py-8 text-sm text-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
            Xali está generando el refuerzo...
          </div>
        )}
      </div>
    </Modal>
  );
}

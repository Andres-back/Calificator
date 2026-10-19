import { useState } from 'react';
import { Button } from '@/components/ui';
import type { EvaluationVisualManifest } from '@/types/api';
import { getEvaluationOriginal } from '../api';
import { EvaluationContentViewer } from './EvaluationContentViewer';

export function EvaluationSourceReview({ evaluationId, versionId, manifest, questions, onChange }: {
  evaluationId: string; versionId?: string | null; manifest: EvaluationVisualManifest;
  questions: { id: string; label: string }[];
  onChange?: (manifest: EvaluationVisualManifest) => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  async function original() {
    if (loading) return;
    setLoading(true); setError(false);
    try {
      const file = await getEvaluationOriginal(evaluationId, versionId);
      const url = URL.createObjectURL(file);
      const link = document.createElement('a'); link.href = url;
      link.download = file.type === 'application/pdf' ? 'evaluacion-original.pdf'
        : file.type.includes('wordprocessingml') ? 'evaluacion-original.docx'
        : file.type === 'image/jpeg' ? 'evaluacion-original.jpg'
        : file.type === 'image/webp' ? 'evaluacion-original.webp' : 'evaluacion-original.png';
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch { setError(true); } finally { setLoading(false); }
  }
  function changeBlock(blockId: string, changes: Partial<EvaluationVisualManifest['bloques'][number]>) {
    const bloques = manifest.bloques.map(block => block.id === blockId ? { ...block, ...changes } : block);
    const block = bloques.find(item => item.id === blockId)!;
    const avisos = manifest.cobertura.avisos.filter(warning => warning.bloque_id !== blockId
      || !['asociacion_pendiente', 'publicacion_pendiente'].includes(warning.motivo));
    if (!block.pregunta_ids.length) avisos.push({ bloque_id: blockId, motivo: 'asociacion_pendiente', mensaje: 'Selecciona las preguntas que necesitan este material.' });
    if (block.seguridad_contenido === 'pendiente_revision') avisos.push({ bloque_id: blockId, motivo: 'publicacion_pendiente', mensaje: 'Comprueba que el material no muestra respuestas del estudiante.' });
    onChange?.({ ...manifest, bloques, cobertura: { ...manifest.cobertura, avisos, estado: avisos.length ? 'requiere_revision' : 'completa' } });
  }
  return <section className="min-w-0 max-w-full rounded-xl border border-border p-3 sm:p-4">
    <Button type="button" variant="outline" className="min-h-11 w-full justify-between sm:w-auto" aria-expanded={open} onClick={() => setOpen(!open)}>Revisar material conservado</Button>
    {open && <div className="mt-4 space-y-5">
      <p className="text-sm leading-6 text-muted">Compara las figuras con el original y comprueba a qué preguntas pertenecen. El documento respondido es privado.</p>
      {manifest.original_recurso_id && <Button type="button" variant="outline" loading={loading} onClick={original}>Descargar original para comparar</Button>}
      {error && <p role="alert" className="text-sm text-amber-800 dark:text-amber-200">No pudimos abrir el original. Tu evaluación sigue guardada; vuelve a intentarlo.</p>}
      {manifest.cobertura.avisos.length > 0 && <details><summary className="focus-ring min-h-11 cursor-pointer py-2 font-semibold">Qué falta comprobar ({manifest.cobertura.avisos.length})</summary>
        <ul className="list-disc space-y-2 pl-5 text-sm">{manifest.cobertura.avisos.map((warning, index) => <li key={index}>{warning.pagina ? `Página ${warning.pagina}: ` : ''}{warning.mensaje}</li>)}</ul>
      </details>}
      {manifest.bloques.map(block => <div key={block.id} className="min-w-0 space-y-3 border-t border-border pt-4">
        <EvaluationContentViewer evaluationId={evaluationId} versionId={versionId} content={{ schema_version: 1, bloques: [block] }} showPrivate />
        <fieldset disabled={!onChange} className="flex flex-wrap gap-2"><legend className="mb-2 text-sm font-semibold">Se usa en</legend>
          {questions.map(question => <label key={question.id} className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm">
            <input type="checkbox" checked={block.pregunta_ids.includes(question.id)} aria-label={`${question.label} · ${block.descripcion || 'Material'}`}
              onChange={event => changeBlock(block.id, { pregunta_ids: event.target.checked ? [...block.pregunta_ids, question.id] : block.pregunta_ids.filter(id => id !== question.id) })} />{question.label}
          </label>)}
        </fieldset>
        <label className="flex min-h-11 items-start gap-2 text-sm leading-6"><input className="mt-1" type="checkbox"
          aria-label={`Material limpio, sin respuestas del estudiante · ${block.descripcion || 'Material'}`}
          disabled={!onChange || block.seguridad_contenido === 'privado_original'} checked={block.seguridad_contenido === 'publicable_confirmado'}
          onChange={event => changeBlock(block.id, { seguridad_contenido: event.target.checked ? 'publicable_confirmado' : 'pendiente_revision' })} />
          {block.seguridad_contenido === 'privado_original' ? 'Original privado: no se entrega a los estudiantes.' : 'Material limpio, sin respuestas del estudiante. Puede incluirse en la evaluación.'}
        </label>
      </div>)}
    </div>}
  </section>;
}

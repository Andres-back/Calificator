import { Component, lazy, Suspense, useMemo, useState, type ReactNode } from 'react';
import { Button, Modal, RichContent } from '@/components/ui';
import { splitTeacherResponse, type XaliVisual } from '../visualContent';

const TeacherVisual = lazy(() => import('./TeacherVisual'));
class VisualBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p>No pudimos abrir este apoyo. Puedes seguir leyendo la explicación.</p> : this.props.children; }
}
function Content({ visual, expanded = false }: { visual: XaliVisual; expanded?: boolean }) {
  return <VisualBoundary><Suspense fallback={<p role="status">Preparando apoyo visual…</p>}><TeacherVisual visual={visual} expanded={expanded} /></Suspense></VisualBoundary>;
}
export function TeacherResponse({ content }: { content: string }) {
  const parsed = useMemo(() => splitTeacherResponse(content), [content]);
  const [expanded, setExpanded] = useState<XaliVisual | null>(null);
  return <div className="min-w-0 space-y-4">
    <RichContent content={parsed.text} variant="chat" />
    {parsed.warning && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">No pudimos mostrar uno de los apoyos. Conservamos la explicación para que puedas revisarla.</p>}
    {parsed.visuales.map((visual) => <section key={visual.id} className="min-w-0 space-y-3 rounded-xl border border-border p-3 sm:p-4" aria-label={visual.titulo}>
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{visual.titulo}</h3>
        <Button variant="outline" onClick={(event) => { event.currentTarget.focus(); setExpanded(visual); }} aria-label={`Ampliar ${visual.titulo}`}>Ampliar</Button>
      </div><p className="text-sm text-muted">{visual.descripcion}</p><Content visual={visual} />
    </section>)}
    {expanded && <Modal open onClose={() => setExpanded(null)} title={expanded.titulo} description={expanded.descripcion} mobileWriting={false} className="max-w-5xl">
      <Content visual={expanded} expanded />
    </Modal>}
  </div>;
}

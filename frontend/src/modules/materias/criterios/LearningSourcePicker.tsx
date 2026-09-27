import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, FileText, LockKeyhole, Type, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { MultiPageEvidencePicker } from '@/components/evidence/MultiPageEvidencePicker';
import type { EvidencePage } from '@/components/evidence/evidencePayload';
import { Button, Card, Field, Input, Select, Textarea } from '@/components/ui';
import { listMateriaResources } from '@/modules/herramientas/api';
import { listDbaCombinado } from '@/modules/materias/dbaApi';

export interface PendingLearningReference {
  tipo: 'material_existente' | 'estandar_oficial';
  reference_id: string;
  titulo: string;
}

export interface PendingLearningSources {
  pages: EvidencePage[];
  document: File | null;
  textTitle: string;
  textContent: string;
  references: PendingLearningReference[];
}

export const EMPTY_LEARNING_SOURCES: PendingLearningSources = {
  pages: [],
  document: null,
  textTitle: '',
  textContent: '',
  references: [],
};

export function LearningSourcePicker({
  value,
  onChange,
  disabled,
  materiaId,
}: {
  value: PendingLearningSources;
  onChange: (value: PendingLearningSources) => void;
  disabled?: boolean;
  materiaId: string;
}) {
  const documentInput = useRef<HTMLInputElement>(null);
  const materials = useQuery({ queryKey: ['learning-source-materials', materiaId], queryFn: () => listMateriaResources(materiaId), enabled: Boolean(materiaId), retry: false });
  const standards = useQuery({ queryKey: ['learning-source-standards', materiaId], queryFn: () => listDbaCombinado(materiaId), enabled: Boolean(materiaId), retry: false });
  const addReference = (reference: PendingLearningReference) => {
    if (value.references.some((item) => item.tipo === reference.tipo && item.reference_id === reference.reference_id)) return;
    onChange({ ...value, references: [...value.references, reference] });
  };

  const selectDocument = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      toast.error('Selecciona un documento Word .docx. Para PDF usa el selector de fotos o PDF.');
      return;
    }
    if (file.size > 40 * 1024 * 1024) {
      toast.error('El documento debe pesar máximo 40 MB.');
      return;
    }
    if (value.pages.length) {
      toast.error('Usa varias fotos, un PDF o un Word, pero no los mezcles.');
      return;
    }
    onChange({ ...value, document: file });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50/80 p-4 text-sm leading-6 text-sky-950 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100">
        <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" />
        <p><strong>Referencia privada.</strong> Este material ayuda a construir los criterios y no se muestra al estudiante salvo que luego lo asignes expresamente.</p>
      </div>

      {!value.document && (
        <MultiPageEvidencePicker
          pages={value.pages}
          onChange={(pages) => onChange({ ...value, pages })}
          disabled={disabled}
        />
      )}

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200"><FileText className="h-5 w-5" /></span>
            <div>
              <p className="font-semibold">Documento Word</p>
              <p className="text-sm text-muted">Un archivo .docx de hasta 40 MB</p>
            </div>
          </div>
          {value.document ? (
            <Button variant="outline" onClick={() => onChange({ ...value, document: null })} disabled={disabled}>
              <X className="h-4 w-4" /> Quitar
            </Button>
          ) : (
            <Button variant="outline" onClick={() => documentInput.current?.click()} disabled={disabled || value.pages.length > 0}>
              <Upload className="h-4 w-4" /> Elegir Word
            </Button>
          )}
        </div>
        {value.document && <p className="mt-3 truncate rounded-lg bg-surface-2 px-3 py-2 text-sm font-medium">{value.document.name}</p>}
        <input
          ref={documentInput}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) selectDocument(file);
            event.currentTarget.value = '';
          }}
        />
      </Card>

      <Card className="space-y-4 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"><Type className="h-5 w-5" /></span>
          <div>
            <p className="font-semibold">Texto o indicaciones de clase</p>
            <p className="text-sm text-muted">Opcional; puedes combinarlo con el archivo para precisar el contexto.</p>
          </div>
        </div>
        <Field label="Nombre de la referencia">
          <Input
            value={value.textTitle}
            onChange={(event) => onChange({ ...value, textTitle: event.currentTarget.value })}
            placeholder="Ej. Apuntes del tema 3"
            disabled={disabled}
          />
        </Field>
        <Field label="Contenido" hint="No escribas la rúbrica aquí; describe o pega únicamente el material trabajado.">
          <Textarea
            value={value.textContent}
            onChange={(event) => onChange({ ...value, textContent: event.currentTarget.value })}
            placeholder="Pega un fragmento del libro, tus apuntes o una explicación trabajada en clase…"
            rows={5}
            maxLength={30000}
            disabled={disabled}
          />
        </Field>
      </Card>

      <Card className="space-y-3 p-4 sm:p-5">
        <div className="flex items-center gap-3"><BookOpen className="h-5 w-5 text-brand-700" /><div><p className="font-semibold">Referencias ya disponibles</p><p className="text-sm text-muted">Elige un recurso de esta materia o un estándar oficial; ambos son opcionales.</p></div></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Recurso de esta materia"><Select value="" disabled={disabled || materials.isLoading} onChange={(event) => { const item = materials.data?.find((resource) => resource.id === event.currentTarget.value); if (item) addReference({ tipo: 'material_existente', reference_id: item.id, titulo: item.titulo }); }}><option value="">Seleccionar recurso</option>{materials.data?.map((item) => <option key={item.id} value={item.id}>{item.titulo}</option>)}</Select></Field>
          <Field label="Estándar oficial"><Select value="" disabled={disabled || standards.isLoading} onChange={(event) => { const item = standards.data?.find((standard) => standard.id === event.currentTarget.value); if (item) addReference({ tipo: 'estandar_oficial', reference_id: item.id, titulo: item.codigo || item.descripcion.slice(0, 65) }); }}><option value="">Seleccionar estándar</option>{standards.data?.filter((item) => item.fuente === 'oficial').map((item) => <option key={item.id} value={item.id}>{item.codigo || item.descripcion.slice(0, 65)}</option>)}</Select></Field>
        </div>
        {materials.isError || standards.isError ? <p className="text-xs text-amber-700 dark:text-amber-200">No se cargaron todas las referencias. Puedes continuar con fotos, Word, texto o sin material.</p> : null}
        {value.references.map((item) => <div key={`${item.tipo}-${item.reference_id}`} className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm"><span className="min-w-0 truncate">{item.titulo}</span><Button variant="ghost" size="icon" aria-label={`Quitar ${item.titulo}`} disabled={disabled} onClick={() => onChange({ ...value, references: value.references.filter((selected) => selected !== item) })}><X className="h-4 w-4" /></Button></div>)}
      </Card>

      {!value.pages.length && !value.document && !value.textContent.trim() && !value.references.length && (
        <p className="text-center text-sm text-muted">Puedes continuar sin material y crear los criterios manualmente.</p>
      )}
    </div>
  );
}

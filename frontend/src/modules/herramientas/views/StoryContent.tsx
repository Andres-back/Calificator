import { motion } from 'framer-motion';
import { BookOpen, Lightbulb, MessageCircleQuestion, Sparkles, Users } from 'lucide-react';
import { cn } from '@/lib/cn';

interface StoryImage {
  is_placeholder?: boolean;
  b64_data?: string;
  url?: string;
}

export interface StoryData {
  titulo?: string;
  imagen?: StoryImage;
  personajes?: string[];
  parrafos?: string[];
  moraleja?: string;
  preguntas_comprension?: unknown[];
}

const reveal = {
  hidden: { opacity: 0, y: 10 },
  show: (index: number) => ({ opacity: 1, y: 0, transition: { delay: index * 0.05 } }),
};

function imageSrc(image?: StoryImage) {
  if (!image || image.is_placeholder) return null;
  if (image.b64_data) return `data:image/png;base64,${image.b64_data}`;
  return image.url || null;
}

function readableQuestion(value: unknown) {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (!value || typeof value !== 'object') return '';
  const item = value as Record<string, unknown>;
  return String(item.enunciado ?? item.pregunta ?? item.texto ?? item.descripcion ?? '');
}

function StoryImageFrame({ image, alt }: { image?: StoryImage; alt: string }) {
  const src = imageSrc(image);
  if (!src) {
    return (
      <div className="grid aspect-[4/3] place-items-center rounded-2xl border border-dashed border-violet-200 bg-white/75 p-6 text-center dark:border-violet-500/25 dark:bg-surface/70">
        <div>
          <BookOpen className="mx-auto h-9 w-9 text-violet-400" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-fg">Historia lista para leer</p>
          <p className="mt-1 text-xs leading-5 text-muted">La ilustración todavía no está disponible.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-white/80 bg-white/85 p-2 shadow-xl dark:border-white/10 dark:bg-surface/80">
      <img src={src} alt={alt} className="aspect-[4/3] max-h-[430px] w-full rounded-xl object-cover" />
    </div>
  );
}

export function StoryContent({ data }: { data: StoryData }) {
  const paragraphs = data.parrafos ?? [];
  const characters = data.personajes ?? [];
  const questions = (data.preguntas_comprension ?? []).map(readableQuestion).filter(Boolean);

  if (paragraphs.length === 0 && !imageSrc(data.imagen)) {
    return (
      <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100" role="status">
        <p className="font-bold">Este borrador necesita revisión</p>
        <p className="mt-1 leading-6">El cuento no contiene narración ni ilustración todavía.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="story-view">
      <section className="relative isolate overflow-hidden rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-amber-50 p-4 shadow-sm dark:border-violet-500/30 dark:from-violet-500/10 dark:via-surface dark:to-amber-500/10 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-violet-200/50 blur-3xl dark:bg-violet-500/10" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-amber-200/55 blur-3xl dark:bg-amber-500/10" aria-hidden="true" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.25fr)] lg:items-center">
          <div className="relative">
            <div className="absolute -left-2 -top-2 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/90 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-violet-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-surface/90 dark:text-violet-200">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Historia ilustrada
            </div>
            <StoryImageFrame image={data.imagen} alt={data.titulo ?? 'Ilustración del cuento'} />
          </div>
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
              <BookOpen className="h-4 w-4" aria-hidden="true" /> Momento de leer
            </div>
            <h2 className="mt-3 text-balance font-display text-2xl font-black leading-tight text-slate-950 dark:text-white sm:text-3xl">{data.titulo || 'Una historia para aprender'}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Lee con calma, imagina cada escena y descubre el aprendizaje que guarda esta historia.</p>
            {characters.length > 0 && (
              <div className="mt-5 rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-surface/70">
                <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300"><Users className="h-4 w-4" aria-hidden="true" /> Conoce a los personajes</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {characters.map((character, index) => (
                    <span key={`${character}-${index}`} className="inline-flex min-h-9 items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-100">{character}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {paragraphs.length > 0 && (
        <article className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border bg-surface px-5 py-7 shadow-card sm:px-10 sm:py-10" aria-label="Narración del cuento">
          <div className="pointer-events-none absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-amber-400" aria-hidden="true" />
          <div className="mb-6 flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200"><BookOpen className="h-5 w-5" aria-hidden="true" /></span>
            <div><p className="font-display text-lg font-extrabold text-fg">La historia</p><p className="text-xs text-muted">{paragraphs.length} {paragraphs.length === 1 ? 'escena' : 'escenas'} para leer</p></div>
          </div>
          <div className="space-y-5 sm:space-y-6">
            {paragraphs.map((paragraph, index) => (
              <motion.div key={`${index}-${paragraph.slice(0, 24)}`} custom={index} variants={reveal} initial="hidden" animate="show" className="group flex gap-3 sm:gap-4">
                <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-violet-200 bg-violet-50 text-xs font-extrabold text-violet-600 group-hover:bg-violet-100 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200">{index + 1}</span>
                <p className={cn('min-w-0 flex-1 text-[16px] leading-8 text-fg sm:text-[17px]', index === 0 && 'first-letter:float-left first-letter:mr-2 first-letter:font-display first-letter:text-5xl first-letter:font-black first-letter:leading-[0.85] first-letter:text-violet-600 dark:first-letter:text-violet-300')}>{paragraph}</p>
              </motion.div>
            ))}
          </div>
        </article>
      )}

      {data.moraleja && (
        <section className="rounded-3xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-sm dark:border-amber-500/35 dark:from-amber-500/10 dark:to-orange-500/10 sm:p-6" aria-labelledby="story-moral-title">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-400 text-amber-950 shadow-sm"><Lightbulb className="h-6 w-6" aria-hidden="true" /></span>
            <div className="min-w-0"><h3 id="story-moral-title" className="font-display text-lg font-black text-amber-950 dark:text-amber-100">La enseñanza que nos deja</h3><p className="mt-2 text-[15px] leading-7 text-amber-950/85 dark:text-amber-100/85">{data.moraleja}</p></div>
          </div>
        </section>
      )}

      {questions.length > 0 && (
        <section aria-labelledby="story-questions-title">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200"><MessageCircleQuestion className="h-5 w-5" aria-hidden="true" /></span>
            <div><h3 id="story-questions-title" className="font-display text-lg font-black text-fg">Piensa y conversa</h3><p className="text-sm text-muted">Responde con tus palabras después de leer.</p></div>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2">
            {questions.map((question, index) => (
              <li key={`${question}-${index}`} className="flex min-h-24 gap-3 rounded-2xl border border-sky-200 bg-sky-50/65 p-4 text-sm leading-6 shadow-sm dark:border-sky-500/25 dark:bg-sky-500/10">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-sky-600 text-xs font-extrabold text-white">{index + 1}</span><span className="font-medium text-fg">{question}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Github,
  GraduationCap,
  HeartHandshake,
  ScanLine,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui';
import { routes } from '@/config/routes';

const benefits = [
  {
    icon: ScanLine,
    title: 'Califica con evidencia',
    description: 'Procesa evaluaciones en línea, fotografías o PDF y conserva el detalle de cada respuesta.',
  },
  {
    icon: ShieldCheck,
    title: 'El docente tiene la última palabra',
    description: 'La IA propone y explica; el profesor revisa, ajusta y decide antes de publicar la nota.',
  },
  {
    icon: GraduationCap,
    title: 'Aprendizaje acompañado',
    description: 'El estudiante entrega, revisa su retroalimentación y practica con Xali en un espacio claro.',
  },
];

const steps = [
  ['1', 'Crea tu cuenta', 'Regístrate como estudiante o solicita participar como docente.'],
  ['2', 'Validación segura', 'Un administrador revisa las solicitudes docentes; mientras tanto la cuenta sigue siendo estudiantil.'],
  ['3', 'Prueba y contribuye', 'Usa la plataforma y comparte hallazgos para mejorar un proyecto educativo abierto.'],
];

export function LandingPage() {
  return (
    <div className="min-h-dvh overflow-hidden bg-surface text-fg">
      <header className="relative z-20 border-b border-border/80 bg-surface/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-18 max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link to={routes.home} className="focus-ring flex items-center gap-3 rounded-xl" aria-label="XCalificator, inicio">
            <img src="/branding/logo-full.png" alt="" className="h-11 w-11 rounded-xl object-contain" />
            <div>
              <p className="font-display text-lg font-extrabold leading-none">XCalificator</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Plataforma educativa abierta</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to={routes.login} className="focus-ring hidden min-h-11 items-center rounded-xl border border-border px-4 text-sm font-bold transition hover:bg-surface-2 sm:inline-flex">
              Ingresar
            </Link>
            <Link to={routes.register} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700">
              Crear cuenta <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative isolate">
          <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_15%_15%,rgba(79,70,229,.20),transparent_34%),radial-gradient(circle_at_88%_15%,rgba(14,165,233,.18),transparent_30%),linear-gradient(to_bottom,transparent,rgba(99,102,241,.04))]" />
          <img src="/branding/pattern-hero.png" alt="" className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-[0.055] dark:opacity-[0.035]" />
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-24">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:border-emerald-500/35 dark:bg-emerald-500/10 dark:text-emerald-200">
                <Github className="h-4 w-4" /> Código abierto · buscamos docentes para probarlo
              </span>
              <h1 className="mt-6 max-w-3xl font-display text-4xl font-black leading-[1.06] tracking-tight sm:text-5xl lg:text-6xl">
                Evalúa mejor, sin perder el <span className="bg-gradient-to-r from-brand-600 to-sky-500 bg-clip-text text-transparent">criterio docente.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
                XCalificator ayuda a crear, entregar y revisar actividades con IA, pero mantiene las decisiones importantes en manos de las personas.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to={routes.register} className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-sm font-extrabold text-white shadow-lg shadow-brand-600/20 transition hover:-translate-y-0.5 hover:bg-brand-700">
                  Quiero probar XCalificator <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="https://github.com/Andres-back/Calificator" target="_blank" rel="noreferrer" className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface/80 px-6 text-sm font-bold transition hover:bg-surface-2">
                  <Github className="h-4 w-4" /> Ver código en GitHub
                </a>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-muted">
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Registro gratuito</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Revisión humana</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Escritorio y celular</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl">
              <div className="absolute -inset-5 -z-10 rounded-[2.5rem] bg-gradient-to-br from-brand-500/18 to-sky-400/15 blur-2xl" />
              <div className="overflow-hidden rounded-[2rem] border border-brand-200/80 bg-surface/90 p-3 shadow-2xl dark:border-brand-400/20">
                <img src="/branding/hero-login.png" alt="Docente utilizando XCalificator para acompañar el aprendizaje" className="aspect-[4/3] w-full rounded-[1.5rem] object-cover" />
                <div className="grid gap-3 p-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-surface-2 p-4">
                    <div className="flex items-center gap-2 font-bold"><UsersRound className="h-5 w-5 text-brand-600" /> Para docentes</div>
                    <p className="mt-2 text-sm leading-6 text-muted">Ahorra tiempo y conserva la trazabilidad de la calificación.</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface-2 p-4">
                    <div className="flex items-center gap-2 font-bold"><BookOpenCheck className="h-5 w-5 text-sky-600" /> Para estudiantes</div>
                    <p className="mt-2 text-sm leading-6 text-muted">Entrega, comprende tus resultados y sigue practicando.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-surface-2/65 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-300">Tecnología con propósito</p>
              <h2 className="mt-3 font-display text-3xl font-black sm:text-4xl">Más claridad para enseñar y aprender</h2>
              <p className="mt-4 leading-7 text-muted">Diseñamos cada flujo para reducir trabajo repetitivo sin convertir la nota en una caja negra.</p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {benefits.map(({ icon: Icon, title, description }) => (
                <article key={title} className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-300"><Icon className="h-6 w-6" /></span>
                  <h3 className="mt-5 font-display text-xl font-extrabold">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[.85fr_1.15fr] lg:px-8">
            <div>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-600"><HeartHandshake className="h-6 w-6" /></span>
              <h2 className="mt-5 font-display text-3xl font-black sm:text-4xl">Queremos construirlo con docentes reales</h2>
              <p className="mt-4 max-w-xl leading-7 text-muted">El proyecto está en etapa de pruebas. Tu experiencia en el aula nos ayuda a descubrir qué funciona y qué debe simplificarse.</p>
              <p className="mt-4 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm font-semibold leading-6 text-brand-900 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-100">
                Solicitar ser docente no activa permisos automáticamente. Un administrador revisará la solicitud para proteger a estudiantes y datos académicos.
              </p>
            </div>
            <ol className="grid gap-4">
              {steps.map(([number, title, description]) => (
                <li key={number} className="flex gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-600 font-display font-black text-white">{number}</span>
                  <div><h3 className="font-display text-lg font-extrabold">{title}</h3><p className="mt-1 text-sm leading-6 text-muted">{description}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-800 via-brand-600 to-sky-600 px-6 py-10 text-center text-white shadow-xl sm:px-10 sm:py-14">
            <Sparkles className="mx-auto h-8 w-8" />
            <h2 className="mt-4 font-display text-3xl font-black sm:text-4xl">¿Listo para probar una evaluación más transparente?</h2>
            <p className="mx-auto mt-4 max-w-2xl leading-7 text-brand-50">Crea tu cuenta como estudiante o solicita acceso docente desde el mismo registro.</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to={routes.register} className="focus-ring inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-6 text-sm font-extrabold text-brand-800 hover:bg-brand-50">Crear mi cuenta</Link>
              <Link to={routes.login} className="focus-ring inline-flex min-h-12 items-center justify-center rounded-xl border border-white/35 bg-white/10 px-6 text-sm font-bold text-white hover:bg-white/15">Ya tengo una cuenta</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-7">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-center text-sm text-muted sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <p>© 2026 XCalificator · Proyecto educativo de código abierto.</p>
          <a href="https://github.com/Andres-back/Calificator" target="_blank" rel="noreferrer" className="focus-ring inline-flex items-center gap-2 rounded-lg font-semibold hover:text-fg"><Github className="h-4 w-4" /> GitHub</a>
        </div>
      </footer>
    </div>
  );
}
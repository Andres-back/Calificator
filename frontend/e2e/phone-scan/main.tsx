// Standalone manual QA entry, never imported by the application. No API/session.
import { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import { MultiPageEvidencePicker } from '../../src/components/evidence/MultiPageEvidencePicker';
import { EvidenceScanner } from '../../src/components/evidence/evidenceScan';
import type { EvidencePage } from '../../src/components/evidence/evidencePayload';
import { GradeEvidenceViewer } from '../../src/modules/calificaciones/components/GradeEvidenceViewer';
import '../../src/index.css';
import { prepareCornerQuery } from '../../src/components/evidence/cornerAssistance';
import { validScanQuad } from '../../src/components/evidence/scanGeometry';
import type { CornerAssistant } from '../../src/components/evidence/cornerAssistance';

// A short-lived laboratory capability, not a production API key. The normal
// static page has no token and still cannot submit photos or call any API.
const access = new URLSearchParams(location.hash.slice(1)).get('trial') ?? '';
const trialAccess = /^[A-Za-z0-9_-]{43}$/.test(access) ? access : '';

const checks = [
  'La cámara del teléfono abrió a tamaño normal; cancelar no bloqueó la página.',
  'Tomé una foto sin datos personales y ajusté las cuatro esquinas con el dedo y los botones.',
  'Pude girar, comparar natural/suave y volver al original sin perder la foto.',
  'Añadí otra hoja, cambié su orden y quité una sin mezclar las decisiones.',
  'Amplié la evidencia, usé pellizco/desplazamiento y volví a la hoja completa.',
  'El borrador de puntaje siguió igual al abrir y cerrar la ampliación.',
  'Revisé claro/oscuro, horizontal y texto grande sin controles cortados.',
];
const button = 'focus-ring min-h-11 rounded-xl border border-border bg-surface px-4 py-2 text-fg';

function Harness() {
  const [anonymous, setAnonymous] = useState(false);
  const [trialStatus, setTrialStatus] = useState('');
  const [trialRecord, setTrialRecord] = useState<object | null>(null);
  const [trialBudget, setTrialBudget] = useState<{ maximum: number; remaining: number } | null>(null);
  const [pages, setPages] = useState<EvidencePage[]>([]);
  const [checked, setChecked] = useState<boolean[]>(checks.map(() => false));
  const [dark, setDark] = useState(false);
  const [large, setLarge] = useState(false);
  const [draft, setDraft] = useState('0.25');
  const [src, setSrc] = useState('');
  const [measuring, setMeasuring] = useState(false);
  const [measurement, setMeasurement] = useState<object | null>(null);
  const [status, setStatus] = useState('');
  const scanner = useRef<EvidenceScanner | null>(null);
  const epoch = useRef(0);
  const first = pages[0];
  const selectedImage = first?.scan?.decision === 'prepared' ? first.scan.preview : first?.file;
  const suggestCorners = useCallback<CornerAssistant>(async (source, signal) => {
    if (!trialAccess || !anonymous || signal.aborted) return null;
    setTrialStatus('Buscando un borde aproximado con DeepSeek. Una sola llamada por foto nueva…');
    try {
      const image = await prepareCornerQuery(source, signal);
      if (signal.aborted) return null;
      const response = await fetch('/trial/corners', { method: 'POST', credentials: 'omit', signal,
        headers: { 'Content-Type': image.blob.type, 'X-QA-Access': trialAccess, 'X-QA-Anonymous': 'yes',
          'X-Image-SHA256': image.sha256, 'X-Image-Width': String(image.width), 'X-Image-Height': String(image.height) },
        body: image.blob });
      const result = await response.json();
      if (signal.aborted) return null;
      if (Number.isInteger(result.remaining)) setTrialBudget({ maximum: result.max_calls ?? 1, remaining: result.remaining });
      const seconds = typeof result.provider_seconds === 'number' ? result.provider_seconds.toFixed(1) : null;
      const proposed = response.ok && result.state === 'proposed' && validScanQuad(result.corners);
      setTrialRecord({ state: proposed ? 'proposed' : result.state === 'abstained' ? 'abstained' : 'unavailable',
        providerSeconds: seconds, physicalPhone: true, maximumRequests: result.max_calls ?? 1 });
      setTrialStatus(proposed ? `DeepSeek respondió${seconds ? ` en ${seconds} s de modelo` : ''}. Revisa el recorte antes de aceptarlo.`
        : result.state === 'exhausted' ? 'Se agotó el presupuesto autorizado. Puedes seguir ajustando manualmente.'
        : result.state === 'busy' ? 'Hay otras dos fotos en curso. Esta no consumió una llamada; puedes ajustarla manualmente.'
        : 'La prueba no obtuvo un borde fiable. No se repetirá la llamada; la foto sigue disponible.');
      return proposed ? result.corners : null;
    } catch {
      if (!signal.aborted) setTrialStatus('No recibimos la respuesta. No se repetirá la llamada; conservamos la foto.');
      return null;
    }
  }, [anonymous]);
  useEffect(() => {
    if (!trialAccess) return;
    const controller = new AbortController();
    void fetch('/trial/status', { credentials: 'omit', signal: controller.signal, headers: { 'X-QA-Access': trialAccess } })
      .then(response => response.ok ? response.json() : null)
      .then(result => { if (!controller.signal.aborted && Number.isInteger(result?.remaining)) setTrialBudget({ maximum: result.max_calls ?? 1, remaining: result.remaining }); })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!selectedImage) { setSrc(''); return; }
    const url = URL.createObjectURL(selectedImage); setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedImage]);
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);
  useEffect(() => { document.documentElement.style.fontSize = large ? '150%' : ''; }, [large]);
  useEffect(() => () => { epoch.current++; scanner.current?.dispose(); }, []);

  async function measure() {
    if (!first?.scan || measuring) return;
    const current = ++epoch.current;
    const instance = new EvidenceScanner(); scanner.current = instance;
    setMeasuring(true); setMeasurement(null); setStatus('Preparando la medición local…');
    try {
      const start = performance.now();
      const detected = await instance.run(first.file, { mode: 'detect' });
      const coldDetectMs = Math.round(performance.now() - start);
      const groups = [];
      for (const profile of ['natural', 'lectura_suave'] as const) {
        const timesMs = [];
        for (let index = 0; index < 20; index++) {
          const before = performance.now();
          await instance.run(first.file, { mode: 'preview', recipe: {
            width: detected.width, height: detected.height,
            corners: first.scan.decision === 'prepared' ? first.scan.recipe.corners : [[0, 0], [1, 0], [1, 1], [0, 1]],
            rotation: first.rotation, coordinate_frame: 'exif_oriented_source', profile,
          } });
          if (epoch.current !== current) return;
          timesMs.push(Math.round(performance.now() - before));
          setStatus(`${profile === 'natural' ? 'Natural' : 'Lectura suave'}: ${index + 1} de 20`);
        }
        const sorted = [...timesMs].sort((a, b) => a - b);
        groups.push({ profile, timesMs, p95Ms: sorted[18], maximumMs: sorted[19] });
      }
      if (epoch.current === current) {
        setMeasurement({ coldDetectMs, pixels: detected.width * detected.height, groups });
        setStatus('Medición terminada. No se subió ninguna fotografía.');
      }
    } catch {
      if (epoch.current === current) setStatus('La medición no terminó. Conservamos la foto; puedes cancelar y continuar sin escaneo.');
    } finally {
      instance.dispose();
      if (epoch.current === current) { scanner.current = null; setMeasuring(false); }
    }
  }

  function cancel() {
    epoch.current++; scanner.current?.dispose(); scanner.current = null;
    setMeasuring(false); setStatus('Medición cancelada; fotos conservadas.');
  }

  function download() {
    // Deliberately omit file names, image bytes, EXIF, recipes and identifiers.
    const report = { manualPhysicalDeviceReport: true, userAgent: navigator.userAgent,
      secureContext: window.isSecureContext, viewport: [innerWidth, innerHeight],
      checks: checks.map((description, index) => ({ description, passed: checked[index] })),
      measurement, nativeBrowserMemoryMeasured: false, realAiCalls: 0, productionWrites: 0 };
    const finalReport = trialAccess ? { ...report, realAiCalls: null, liveTrial: trialRecord,
      liveTrialStatus: trialStatus, maximumNewAiCalls: 1 } : report;
    const url = URL.createObjectURL(new Blob([JSON.stringify(finalReport, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'prueba-telefono-escaneo.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <main className="mx-auto max-w-6xl space-y-5 p-3 text-fg sm:p-6">
    <header className="space-y-2"><h1 className="text-2xl font-bold">Prueba privada del escáner</h1>
      <p>{trialAccess ? 'Prueba Android con API real: usa una hoja sin nombres ni datos personales. Si no se encuentran bordes locales, se enviará una vista reducida a DeepSeek para proponer las esquinas. No se guardan fotos, notas ni evidencias en producción.' : 'Usa una hoja de ejemplo sin nombres. Las fotos permanecen en este teléfono y desaparecen al cerrar la página. No se califica ni se envía nada.'}</p>
      <p role="status">{window.isSecureContext ? 'Conexión apta para la prueba.' : 'Esta conexión no permite comprobar la cámara de forma fiable.'}</p>
    </header>
    {trialAccess && <section className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">
      <h2 className="font-bold">Encuadre con API real · DeepSeek V4.1 Flash</h2>
      <p role="status">{trialBudget ? `Quedan ${trialBudget.remaining} de ${trialBudget.maximum} llamadas autorizadas en esta fase.` : 'Comprobando presupuesto de la prueba…'}</p>
      <p>La clave nunca llega al teléfono. La llamada se hace solo si hace falta ayuda para el encuadre; no se reintenta aunque la respuesta falle. Una detección local correcta no gasta API.</p>
      <label className="flex min-h-11 items-start gap-3"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={anonymous} disabled={pages.length > 0} onChange={(event) => setAnonymous(event.currentTarget.checked)} /><span>Confirmo que usaré una hoja sin nombres, rostros, firmas ni otros datos personales y autorizo enviar esta foto de prueba al modelo.</span></label>
      <p role="status">{trialStatus || 'Marca la confirmación y después toma la foto.'}</p>
    </section>}
    <div className="flex flex-wrap gap-2"><button className={button} onClick={() => setDark(!dark)}>Cambiar tema</button><button className={button} onClick={() => setLarge(!large)}>Cambiar tamaño del texto</button></div>
    <MultiPageEvidencePicker scanEnabled suggestCorners={trialAccess && anonymous ? suggestCorners : undefined} allowPdf={false} disabled={measuring || Boolean(trialAccess && !anonymous)} pages={pages} onChange={setPages} contextKey="private-phone-qa" />
    {src && <section className="space-y-3 rounded-xl border border-border bg-surface p-3"><h2 className="text-xl font-bold">Comprobar ampliación</h2>
      <label className="block">Puntaje de prueba (no se guarda)<input className="ml-2 min-h-11 w-28 rounded-lg border border-border bg-surface px-2" value={draft} onChange={(event) => setDraft(event.target.value)} /></label>
      <GradeEvidenceViewer src={src} label="Hoja de prueba local" />
    </section>}
    <section className="space-y-3 rounded-xl border border-border bg-surface p-3"><h2 className="text-xl font-bold">Velocidad en este teléfono</h2>
      <p>Con una hoja aceptada: mide 20 vistas por aspecto. Puedes cancelar; no hay llamadas a IA.</p>
      <div className="flex flex-wrap gap-2"><button className={button} disabled={!first?.scan || measuring} onClick={() => void measure()}>Medir vistas previas</button><button className={button} disabled={!measuring} onClick={cancel}>Cancelar medición</button></div>
      <p role="status">{status}</p>
    </section>
    <section className="space-y-3 rounded-xl border border-border bg-surface p-3"><h2 className="text-xl font-bold">Marca solo lo que comprobaste</h2>
      {checks.map((description, index) => <label className="flex min-h-11 items-start gap-3 py-2" key={description}><input className="mt-1 h-5 w-5 shrink-0" type="checkbox" checked={checked[index]} onChange={(event) => setChecked(checked.map((value, position) => position === index ? event.target.checked : value))} /><span>{description}</span></label>)}
      <button className={button} onClick={download}>Descargar resultado sin fotos</button>
    </section><Toaster />
  </main>;
}
createRoot(document.getElementById('root')!).render(<Harness />);

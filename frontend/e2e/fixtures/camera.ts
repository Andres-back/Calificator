import type { Page } from '@playwright/test';

const teacher = { id: 't', nombre: 'Docente prueba', email: 'teacher@example.test', rol: 'profesor', estado: 'activo', permissions: ['subjects.read', 'evaluations.read', 'grading.read', 'grading.grade', 'submissions.read'] };
const students = [{ id: 's1', nombre: 'Estudiante Uno' }, { id: 's2', nombre: 'Estudiante Dos' }];
const subject = { id: 'm1', profesor_id: 't', nombre: 'Lectura', area: 'Lenguaje', grado: '4', estado: 'activa', estudiantes: students };
const evaluation = { id: 'e1', materia_id: 'm1', profesor_id: 't', nombre: 'Prueba cámara', estado: 'publicada', modalidad: 'fisica', nota_maxima: 5, criterios: [], preguntas: [{ numero: 1, enunciado: 'Responde', puntaje: 5 }], respuestas_esperadas: [] };

export async function prepareCameraTest(page: Page, denied = false, simulateVideo = false) {
  await page.addInitScript(({ deny, stubVideo }) => {
    const state = { calls: 0, stopped: 0, audio: true, selected: '', visibility: 'visible' as DocumentVisibilityState };
    Object.assign(window, { __cameraTest: state });
    // Synthetic hardware owns its visibility too: another parallel WebKit window
    // must not masquerade as the user leaving this page. Explicit cases below
    // change this value and dispatch the real event to exercise both lifecycles.
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state.visibility });
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
      enumerateDevices: async () => [
        { kind: 'videoinput', deviceId: 'integrated', label: 'Cámara integrada' },
        { kind: 'videoinput', deviceId: 'usb', label: 'Cámara USB' },
        { kind: 'videoinput', deviceId: 'other', label: '' },
        { kind: 'audioinput', deviceId: 'mic', label: 'Micrófono' },
      ],
      getUserMedia: async (constraints: MediaStreamConstraints) => {
      state.calls++; state.audio = constraints.audio !== false;
      if (deny) throw new DOMException('Denied', 'NotAllowedError');
      const videoConstraints = constraints.video as MediaTrackConstraints;
      state.selected = typeof videoConstraints.deviceId === 'object' && 'exact' in videoConstraints.deviceId
        ? String(videoConstraints.deviceId.exact) : 'integrated';
      const selectedId = state.selected;
      const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 1600;
      const context = canvas.getContext('2d')!; context.fillStyle = 'white'; context.fillRect(0, 0, 1200, 1600);
      context.fillStyle = 'black'; context.font = '30px sans-serif';
      for (let row = 1; row <= 30; row++) context.fillText(`Hoja sintética, respuesta ${row}`, 30, row * 45);
      // Windows WebKit cannot play a canvas MediaStream. Exercise capture UI with
      // a synthetic video source; Chromium below exercises the actual stream.
      if (stubVideo) {
        let source: unknown = null;
        Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', { configurable: true, get: () => source, set: (value) => { source = value; } });
        Object.defineProperties(HTMLVideoElement.prototype, {
          videoWidth: { configurable: true, get: () => 1200 }, videoHeight: { configurable: true, get: () => 1600 },
        });
        HTMLMediaElement.prototype.play = async () => {};
        const draw = CanvasRenderingContext2D.prototype.drawImage;
        CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
          if (args[0] instanceof HTMLVideoElement) args[0] = canvas;
          Reflect.apply(draw, this, args);
        };
        const track = { stop: () => { state.stopped++; }, getSettings: () => ({ deviceId: selectedId }) };
        return { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream;
      }
      const stream = canvas.captureStream(1);
      stream.getTracks().forEach((track) => {
        const stop = track.stop.bind(track); track.stop = () => { state.stopped++; stop(); };
        const settings = track.getSettings.bind(track); track.getSettings = () => ({ ...settings(), deviceId: selectedId });
      });
      return stream;
    } } });
  }, { deny: denied, stubVideo: simulateVideo });
  const writes: string[] = [];
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url()); const path = url.pathname.replace(/^\/api/, '');
    if (route.request().method() !== 'GET' && path !== '/analytics/evento') writes.push(path);
    const json = (body: unknown) => route.fulfill({ json: body });
    if (path === '/auth/me') return json({ user: teacher });
    if (path === '/users/me/authorization') return json({ profile: teacher.rol, permissions: teacher.permissions });
    if (path === '/materias') return json([subject]);
    if (path === '/materias/m1') return json(subject);
    if (path === '/materias/m1/estudiantes') return json(subject);
    if (path === '/materias/m1/evaluaciones') return json([evaluation]);
    if (path === '/evaluaciones/e1') return json(evaluation);
    if (path === '/evaluaciones/e1/revision') return json({ evaluacion_id: 'e1', materia_id: 'm1', total_alumnos: 2, alumnos: [], contadores: { todas: 2, pendientes: 2, alertas: 0, procesando: 0, publicadas: 0 } });
    return json([]);
  });
  await page.goto('/app/calificaciones?materia=m1&evaluacion=e1&estudiante=s1&modo=carga');
  return writes;
}

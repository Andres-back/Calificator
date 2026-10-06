import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AsistenciaDia, AsistenciaDiaInput, AsistenciaEstado } from './asistenciaApi';
import { buildAttendancePatchPayload, type AttendanceDraftRow } from './attendanceModel';

type Save = (payload: AsistenciaDiaInput) => Promise<AsistenciaDia>;
type Row = { draft: AttendanceDraftRow; baseline: AttendanceDraftRow; revision: number; confirmed: number; ready: boolean; error: string | null };
type Snapshot = { id: string; revision: number; draft: AttendanceDraftRow };

const equal = (a: AttendanceDraftRow, b: AttendanceDraftRow) => a.estado === b.estado && a.observacion.trim() === b.observacion.trim();

function createQueue(materiaId: string, fecha: string, send: Save, notify: () => void, onSaved: (day: AsistenciaDia) => void) {
  const rows: Record<string, Row> = {};
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  let active = true;
  let flight: Snapshot[] | null = null;
  const dirty = (row: Row) => row.revision !== row.confirmed;
  const clearTimer = (id: string) => { clearTimeout(timers.get(id)); timers.delete(id); };

  function pump() {
    if (!active || flight) return;
    const snapshot = Object.entries(rows).filter(([, row]) => row.ready && !row.error && row.draft.estado && dirty(row))
      .map(([id, row]) => ({ id, revision: row.revision, draft: { ...row.draft } }));
    if (!snapshot.length) return;
    flight = snapshot;
    snapshot.forEach(({ id }) => { rows[id].ready = false; });
    notify();
    const payload = buildAttendancePatchPayload(fecha, Object.fromEntries(snapshot.map(({ id, draft }) => [id, draft])), {})!;
    void send(payload).then((saved) => {
      if (!active) return;
      snapshot.forEach((sent) => {
        const row = rows[sent.id];
        row.baseline = sent.draft;
        row.confirmed = sent.revision;
        row.error = null;
      });
      onSaved(saved);
    }, (error: unknown) => {
      if (!active) return;
      snapshot.forEach((sent) => {
        const row = rows[sent.id];
        // A correction made after dispatch must still get its own attempt.
        if (row.revision === sent.revision) { row.error = error instanceof Error ? error.message : 'No se pudo guardar'; row.ready = false; }
      });
    }).finally(() => {
      flight = null;
      if (active) { notify(); pump(); }
    });
  }

  function edit(id: string, draft: AttendanceDraftRow, ready: boolean) {
    const row = rows[id];
    if (!row) return;
    if (equal(row.draft, draft) && !row.error) { row.draft = draft; notify(); return; }
    row.draft = draft;
    row.revision++;
    row.error = null;
    row.ready = ready;
    // An unmarked observation was never sent; deleting it needs no save or exit warning.
    if (!draft.estado && equal(draft, row.baseline) && !flight?.some((sent) => sent.id === id)) row.confirmed = row.revision;
    notify();
  }

  return {
    rows,
    receive(day?: AsistenciaDia) {
      if (!day || day.fecha !== fecha || day.materia_id !== materiaId) return;
      let changed = false;
      const activeIds = new Set(day.registros.map((record) => record.estudiante_id));
      for (const [id, row] of Object.entries(rows)) {
        if (!activeIds.has(id) && !dirty(row) && !flight?.some((sent) => sent.id === id)) {
          clearTimer(id); delete rows[id]; changed = true;
        }
      }
      for (const record of day.registros) {
        const value = { estado: record.estado, observacion: record.observacion ?? '' };
        const row = rows[record.estudiante_id];
        if (!row) { rows[record.estudiante_id] = { draft: value, baseline: value, revision: 0, confirmed: 0, ready: false, error: null }; changed = true; }
        else if (!dirty(row) && !flight?.some((s) => s.id === record.estudiante_id) && !equal(row.baseline, value)) {
          row.draft = value; row.baseline = value; changed = true;
        }
      }
      if (changed) notify();
    },
    updateStatus(id: string, estado: AsistenciaEstado) {
      if (!rows[id]) return;
      clearTimer(id);
      edit(id, { ...rows[id].draft, estado }, true);
      rows[id].ready = true;
      pump();
    },
    updateObservation(id: string, observacion: string) {
      if (!rows[id]) return;
      clearTimer(id);
      edit(id, { ...rows[id].draft, observacion }, false);
      timers.set(id, setTimeout(() => { timers.delete(id); rows[id].ready = true; pump(); }, 500));
    },
    flushObservation(id: string) { clearTimer(id); if (rows[id]) { rows[id].ready = true; pump(); } },
    markAllPending() {
      Object.entries(rows).forEach(([id, row]) => {
        if (row.draft.estado === null) { clearTimer(id); edit(id, { ...row.draft, estado: 'presente' }, true); }
      });
      pump();
    },
    retry(id?: string) {
      Object.entries(rows).forEach(([key, row]) => { if ((!id || id === key) && row.error) { row.error = null; row.ready = true; } });
      notify(); pump();
    },
    status(id: string) {
      const row = rows[id];
      if (row?.error) return 'error' as const;
      if (row && dirty(row)) return flight?.some((s) => s.id === id && s.revision === row.revision) ? 'saving' as const : 'pending' as const;
      return row?.draft.estado ? 'saved' as const : 'unmarked' as const;
    },
    hasUnsavedChanges() { return Boolean(flight) || Object.values(rows).some(dirty); },
    start() { active = true; pump(); },
    dispose() { active = false; timers.forEach(clearTimeout); timers.clear(); },
  };
}

export function useAttendanceAutosave(materiaId: string, fecha: string, data: AsistenciaDia | undefined, save: Save,
  onSaved: (day: AsistenciaDia) => void = () => {}) {
  const [, redraw] = useState(0);
  const notify = useCallback(() => redraw((n) => n + 1), []);
  const callbacks = useRef({ save, onSaved });
  callbacks.current = { save, onSaved };
  const queue = useMemo(() => createQueue(materiaId, fecha, (payload) => callbacks.current.save(payload), notify,
    (day) => callbacks.current.onSaved(day)), [materiaId, fecha, notify]);
  useEffect(() => { queue.start(); return () => queue.dispose(); }, [queue]);
  useEffect(() => { if (data?.materia_id === materiaId) queue.receive(data); }, [queue, data, materiaId]);
  return { draft: Object.fromEntries(Object.entries(queue.rows).map(([id, row]) => [id, row.draft])),
    hasUnsavedChanges: queue.hasUnsavedChanges(), errors: Object.values(queue.rows).filter((r) => r.error).length,
    status: queue.status, updateStatus: queue.updateStatus, updateObservation: queue.updateObservation,
    flushObservation: queue.flushObservation, markAllPending: queue.markAllPending, retry: queue.retry };
}

import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GradeEvidenceRegion } from '@/types/api';
import { GradeQuestionEvidence } from './GradeQuestionEvidence';

describe('GradeQuestionEvidence', () => {
  afterEach(() => { vi.restoreAllMocks(); });
  it('consulta todas las hojas asociadas sin cambiar la sección o escribir datos', () => {
    const select = vi.fn();
    render(<GradeQuestionEvidence evidenceUrl="/api/evidencia" pages={3} associatedPages={[2, 3, 2]} activePage={2} onPageChange={select} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/api/evidencia/paginas/2');
    expect(screen.queryByRole('button', { name: 'Hoja 1' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hoja 3' }));
    expect(select).toHaveBeenCalledExactlyOnceWith(3);
  });
  it('sin referencias válidas ofrece selector completo sin inventar una zona', () => {
    render(<GradeQuestionEvidence evidenceUrl="/api/evidencia" pages={2} associatedPages={[0, 4, NaN, 1.5]} activePage={9} onPageChange={vi.fn()} />);
    expect(screen.getByText(/No hay una zona localizada/)).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/api/evidencia/paginas/1');
    expect(screen.getByRole('button', { name: 'Hoja 2' })).toBeInTheDocument();
    expect(screen.queryByText('Ubicación sugerida')).not.toBeInTheDocument();
  });
  const region: GradeEvidenceRegion = { pagina: 2, bbox: [0.1, 0.2, 0.4, 0.1], marco: 'pagina_canonica_orientada', evidencia_version: 'a'.repeat(32) };

  it('explica que conocer la hoja no significa tener localizada la respuesta antigua', () => {
    render(<GradeQuestionEvidence evidenceUrl="/api/evidencia" pages={2} associatedPages={[2]} activePage={2} onPageChange={vi.fn()} />);
    expect(screen.getByText(/No hay una zona localizada/)).toBeInTheDocument();
    expect(screen.getByText(/Puedes ampliar la hoja manualmente/)).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/api/evidencia/paginas/2');
  });

  it('reencuadra cada respuesta de la misma foto y de otra hoja, sin inferencias o escrituras', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, top: 0, left: 0, right: 400, bottom: 300, width: 400, height: 300, toJSON() {} });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const page = String(input).includes('/paginas/2') ? '2' : '1';
      return new Response(new Blob(['synthetic']), { headers: { 'Content-Type': 'image/png', 'X-Evidence-Version': region.evidencia_version, 'X-Evidence-Page': page } });
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValueOnce('blob:page-one').mockReturnValueOnce('blob:page-two');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const upper: GradeEvidenceRegion = { ...region, pagina: 1, bbox: [0.3, 0.2, 0.2, 0.08] };
    const lower: GradeEvidenceRegion = { ...upper, bbox: [0.3, 0.7, 0.2, 0.08] };
    const props = { evidenceUrl: '/api/evidencia', pages: 2, associatedPages: [1], activePage: 1, onPageChange: vi.fn() };
    const view = render(<GradeQuestionEvidence {...props} regions={[upper]} />);
    const expectFocused = async (box: GradeEvidenceRegion['bbox'], src: string) => {
      const image = await screen.findByRole('img');
      expect(image).toHaveAttribute('src', src);
      Object.defineProperties(image, { naturalWidth: { value: 800 }, naturalHeight: { value: 1200 } });
      fireEvent.load(image);
      const centerX = parseFloat(image.style.left) + (box[0] + box[2] / 2) * parseFloat(image.style.width);
      const centerY = parseFloat(image.style.top) + (box[1] + box[3] / 2) * parseFloat(image.style.height);
      expect(centerX).toBeCloseTo(200, 0);
      expect(centerY).toBeCloseTo(150, 0);
      expect(parseFloat(image.style.height)).toBeGreaterThan(300);
    };
    await expectFocused(upper.bbox, 'blob:page-one');
    expect(screen.getByText(/Vista cercana de esta respuesta/)).toBeInTheDocument();
    view.rerender(<GradeQuestionEvidence {...props} regions={[lower]} />);
    await expectFocused(lower.bbox, 'blob:page-one');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    view.rerender(<GradeQuestionEvidence {...props} associatedPages={[2]} activePage={2} regions={[{ ...upper, pagina: 2 }]} />);
    await expectFocused(upper.bbox, 'blob:page-two');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.every(([, options]) => !options?.method || options.method === 'GET')).toBe(true);
  });

  it('solo amplía automáticamente después de verificar versión, hoja y tipo', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Blob(['png'], { type: 'image/png' }), { headers: { 'Content-Type': 'image/png', 'X-Evidence-Version': region.evidencia_version, 'X-Evidence-Page': '2' } }));
    const objectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:verified-synthetic');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const view = render(<GradeQuestionEvidence evidenceUrl="/api/evidencia" pages={2} associatedPages={[2]} regions={[region]} activePage={2} onPageChange={vi.fn()} />);
    expect(await screen.findByRole('img')).toHaveAttribute('src', 'blob:verified-synthetic');
    expect(screen.getByText(/Ubicación sugerida/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(`/api/evidencia/paginas/2?evidencia_version=${region.evidencia_version}`, expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' }));
    expect(objectUrl).toHaveBeenCalledOnce();
    view.unmount();
    expect(revoke).toHaveBeenCalledWith('blob:verified-synthetic');
  });

  it.each([
    ['otra versión', { 'X-Evidence-Version': 'b'.repeat(32), 'X-Evidence-Page': '2', 'Content-Type': 'image/png' }],
    ['otra hoja', { 'X-Evidence-Version': 'a'.repeat(32), 'X-Evidence-Page': '1', 'Content-Type': 'image/png' }],
    ['servidor antiguo', { 'Content-Type': 'image/png' }],
  ])('no señala una región sobre %s y ofrece lectura manual', async (_name, headers) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Blob(['png']), { headers }));
    render(<GradeQuestionEvidence evidenceUrl="/api/evidencia" pages={2} associatedPages={[2]} regions={[region]} activePage={2} onPageChange={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos comprobar');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir hoja sin señalamiento' }));
    expect(screen.getByRole('img')).toHaveAttribute('src', '/api/evidencia/paginas/2');
    expect(screen.queryByText(/Ubicación sugerida/)).not.toBeInTheDocument();
  });
  it('StrictMode descarta su primera lectura cancelada y libera solo la imagen vigente', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(new Blob(['png']), { headers: { 'Content-Type': 'image/png', 'X-Evidence-Version': region.evidencia_version, 'X-Evidence-Page': '2' } }));
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:strict-current');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const view = render(<StrictMode><GradeQuestionEvidence evidenceUrl="/api/evidencia" pages={2} associatedPages={[2]} regions={[region]} activePage={2} onPageChange={vi.fn()} /></StrictMode>);
    expect(await screen.findByRole('img')).toHaveAttribute('src', 'blob:strict-current');
    expect(create).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    view.unmount();
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:strict-current');
  });

  it('una respuesta tardía de otro contexto no crea ni muestra su imagen', async () => {
    const oldReads: Array<(response: Response) => void> = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => String(input).startsWith('/api/old')
      ? new Promise<Response>((resolve) => { oldReads.push(resolve); })
      : Promise.resolve(new Response(new Blob(['new']), { headers: { 'Content-Type': 'image/png', 'X-Evidence-Version': region.evidencia_version, 'X-Evidence-Page': '2' } })));
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValueOnce('blob:new-context').mockReturnValueOnce('blob:latest-a');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const view = render(<GradeQuestionEvidence evidenceUrl="/api/old" pages={2} associatedPages={[2]} regions={[region]} activePage={2} onPageChange={vi.fn()} />);
    view.rerender(<GradeQuestionEvidence evidenceUrl="/api/new" pages={2} associatedPages={[2]} regions={[region]} activePage={2} onPageChange={vi.fn()} />);
    expect(await screen.findByRole('img')).toHaveAttribute('src', 'blob:new-context');
    view.rerender(<GradeQuestionEvidence evidenceUrl="/api/old" pages={2} associatedPages={[2]} regions={[region]} activePage={2} onPageChange={vi.fn()} />);
    await act(async () => { oldReads[1](new Response(new Blob(['latest a']), { headers: { 'Content-Type': 'image/png', 'X-Evidence-Version': region.evidencia_version, 'X-Evidence-Page': '2' } })); });
    expect(await screen.findByRole('img')).toHaveAttribute('src', 'blob:latest-a');
    await act(async () => { oldReads[0](new Response(new Blob(['old']), { headers: { 'Content-Type': 'image/png', 'X-Evidence-Version': region.evidencia_version, 'X-Evidence-Page': '2' } })); });
    expect(create).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:latest-a');
  });

  it('consulta fragmentos y continuaciones en su hoja y versión sin inferencias ni escrituras', async () => {
    const nextVersion = 'b'.repeat(32);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const second = String(input).includes('/paginas/2');
      return new Response(new Blob(['synthetic']), { headers: { 'Content-Type': 'image/png',
        'X-Evidence-Version': second ? nextVersion : region.evidencia_version, 'X-Evidence-Page': second ? '2' : '1' } });
    });
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValueOnce('blob:page-one').mockReturnValueOnce('blob:page-two').mockReturnValueOnce('blob:page-one-again');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const regions: GradeEvidenceRegion[] = [
      { ...region, pagina: 1 }, { ...region, pagina: 1, bbox: [0.1, 0.7, 0.4, 0.15] },
      { ...region, pagina: 2, evidencia_version: nextVersion },
    ];
    const props = { evidenceUrl: '/api/evidencia', pages: 2, associatedPages: [1, 2], regions, onPageChange: vi.fn() };
    const view = render(<GradeQuestionEvidence {...props} activePage={1} />);
    expect(await screen.findByRole('img')).toHaveAttribute('src', 'blob:page-one');
    fireEvent.click(screen.getByRole('button', { name: 'Fragmento 2' }));
    expect(screen.getByRole('button', { name: 'Fragmento 2' })).toHaveAttribute('aria-current', 'step');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    view.rerender(<GradeQuestionEvidence {...props} activePage={2} />);
    expect(await screen.findByRole('img')).toHaveAttribute('src', 'blob:page-two');
    expect(screen.queryByRole('button', { name: 'Fragmento 2' })).not.toBeInTheDocument();
    view.rerender(<GradeQuestionEvidence {...props} activePage={1} />);
    expect(await screen.findByRole('img')).toHaveAttribute('src', 'blob:page-one-again');
    expect(create).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.map(([input]) => String(input))).toEqual([
      `/api/evidencia/paginas/1?evidencia_version=${region.evidencia_version}`,
      `/api/evidencia/paginas/2?evidencia_version=${nextVersion}`,
      `/api/evidencia/paginas/1?evidencia_version=${region.evidencia_version}`,
    ]);
    view.unmount();
    expect(revoke.mock.calls.map(([url]) => url)).toEqual(['blob:page-one', 'blob:page-two', 'blob:page-one-again']);
  });
});

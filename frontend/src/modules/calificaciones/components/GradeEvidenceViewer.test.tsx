import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GradeEvidenceViewer } from './GradeEvidenceViewer';

function loadImage() {
  const image = screen.getByRole('img', { name: 'Hoja 2 de la evidencia' });
  Object.defineProperties(image, { naturalWidth: { value: 800 }, naturalHeight: { value: 1200 } });
  fireEvent.load(image);
  return image;
}

describe('GradeEvidenceViewer', () => {
  it('174 en escritorio la hoja ocupa el alto disponible de la pantalla', () => {
    const view = render(<GradeEvidenceViewer src="/api/evidencia/paginas/2" label="Hoja 2 de la evidencia" sheetView />);
    const frame = screen.getByRole('group', { name: 'Imagen ampliable de la evidencia' });
    expect(frame.className).toContain('lg:h-[clamp(30rem,calc(100dvh-13rem),72rem)]');
    expect(frame.className).toContain('h-[clamp(16rem,45dvh,34rem)]');
    view.unmount();
    render(<GradeEvidenceViewer src="/api/evidencia/paginas/2" label="Hoja 2 de la evidencia" />);
    const answerFrame = screen.getByRole('group', { name: 'Imagen ampliable de la evidencia' });
    expect(answerFrame.className).not.toContain('calc(100dvh-13rem)');
    // 175: el visor de una respuesta también crece con la pantalla, sin tapar la explicación.
    expect(answerFrame.className).toContain('lg:h-[clamp(20rem,calc(100dvh-27rem),44rem)]');
  });

  it('182 una zona de la cuadrícula ya abarca la pregunta: se dibuja ceñida, sin el margen de la Spec 180', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, top: 0, left: 0, right: 400, bottom: 300, width: 400, height: 300, toJSON() {} });
    render(<GradeEvidenceViewer src="/api/evidencia/paginas/2" label="Hoja 2 de la evidencia" region={[0.1, 0.2, 0.4, 0.1]} wholeQuestion />);
    loadImage();
    fireEvent.click(screen.getByRole('button', { name: 'Ver hoja completa' }));
    // 0,4 del ancho más 1 % a cada lado, sobre una hoja de 200 px a 100 %.
    expect(parseFloat(screen.getByTestId('evidence-region-outline').style.width)).toBeCloseTo(84, 0);
    expect(screen.getByText(/el recuadro marca dónde está la pregunta/)).toBeInTheDocument();
  });

  it('175 marca con un recuadro la zona de la respuesta y vuelve a ella cuando el docente la pide', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, top: 0, left: 0, right: 400, bottom: 300, width: 400, height: 300, toJSON() {} });
    const props = { src: '/api/evidencia/paginas/2', label: 'Hoja 2 de la evidencia', region: [0.1, 0.2, 0.4, 0.1] as [number, number, number, number] };
    const view = render(<GradeEvidenceViewer {...props} focusSignal={0} />);
    expect(screen.queryByTestId('evidence-region-outline')).not.toBeInTheDocument();
    loadImage();
    const outline = screen.getByTestId('evidence-region-outline');
    expect(outline).toHaveAttribute('aria-hidden', 'true');
    expect(outline.className).toContain('pointer-events-none');
    const focused = { width: outline.style.width, left: outline.style.left, top: outline.style.top };
    // 178: el enfoque no pasa de 250 %, para que se vea la pregunta con sus opciones y no solo la marca.
    expect(screen.getByLabelText('Nivel de ampliación')).toHaveTextContent('250 %');
    // 180: el recuadro abarca la pregunta con margen: el 70 % del ancho de la hoja.
    expect(parseFloat(focused.width)).toBeCloseTo(350, 0);
    expect(parseFloat(focused.left)).toBeGreaterThanOrEqual(0);

    fireEvent.click(screen.getByRole('button', { name: 'Ver hoja completa' }));
    expect(screen.getByText('100 %')).toBeInTheDocument();
    expect(parseFloat(screen.getByTestId('evidence-region-outline').style.width)).toBeCloseTo(140, 0);

    view.rerender(<GradeEvidenceViewer {...props} focusSignal={1} />);
    const again = screen.getByTestId('evidence-region-outline');
    expect({ width: again.style.width, left: again.style.left, top: again.style.top }).toEqual(focused);
    vi.restoreAllMocks();
  });

  it('176 la barra del visor cabe en una fila: controles con icono y nombre accesible, sin instrucciones a la vista en ordenador', () => {
    render(<GradeEvidenceViewer src="/api/evidencia/paginas/2" label="Hoja 2 de la evidencia" />);
    loadImage();
    const controls = screen.getByRole('group', { name: 'Controles de la imagen' });
    for (const name of ['Alejar imagen', 'Acercar imagen', 'Girar vista 90 grados', 'Ver hoja completa', 'Ampliar evidencia']) {
      const control = within(controls).getByRole('button', { name });
      expect(control).toHaveTextContent('');
      expect(control).toHaveClass('min-h-11', 'min-w-11');
    }
    expect(controls.parentElement).toHaveTextContent('Hoja 2 de la evidencia');
    expect(screen.getByText(/Amplía con dos dedos/).closest('p')).toHaveClass('lg:sr-only');
    // El visor ampliado sigue abriendo la hoja completa.
    fireEvent.click(within(controls).getByRole('button', { name: 'Ampliar evidencia' }));
    expect(within(screen.getByRole('dialog', { name: 'Hoja 2 de la evidencia' })).getByLabelText('Nivel de ampliación')).toHaveTextContent('100 %');
  });

  it('175 sin zona no dibuja recuadro', () => {
    render(<GradeEvidenceViewer src="/api/evidencia/paginas/2" label="Hoja 2 de la evidencia" />);
    loadImage();
    expect(screen.queryByTestId('evidence-region-outline')).not.toBeInTheDocument();
  });

  it('prioriza la hoja en su vista propia y vuelve a evidencia desde el visor ampliado', () => {
    render(<GradeEvidenceViewer src="/api/evidencia/paginas/2" label="Hoja 2 de la evidencia" sheetView />);
    const image = loadImage();
    const controls = screen.getByRole('group', { name: 'Controles de la imagen' });
    expect(image.compareDocumentPosition(controls) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(controls).queryByRole('button', { name: 'Ver hoja completa' })).not.toBeInTheDocument();
    fireEvent.click(within(controls).getByRole('button', { name: 'Girar a la izquierda' }));
    expect(image).toHaveStyle({ transform: 'rotate(270deg)' });
    fireEvent.click(within(controls).getByRole('button', { name: 'Girar a la derecha' }));
    expect(image).toHaveStyle({ transform: 'rotate(0deg)' });
    fireEvent.click(within(controls).getByRole('button', { name: 'Ampliar evidencia' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Volver a la evidencia' }));
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('gira solo la vista, conserva el giro al ampliar y lo restablece al cambiar de hoja', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const view = render(<GradeEvidenceViewer src="/api/evidencia/paginas/2" label="Hoja 2 de la evidencia" />);
    loadImage();
    const rotate = () => fireEvent.click(screen.getByRole('button', { name: 'Girar vista 90 grados' }));
    for (const degrees of [90, 180, 270, 0, 90]) {
      rotate();
      expect(screen.getByRole('img')).toHaveStyle({ transform: `rotate(${degrees}deg)` });
    }
    expect(screen.getByRole('group', { name: 'Imagen ampliable de la evidencia' })).toHaveClass('touch-pan-y');
    expect(parseFloat((screen.getByRole('img') as HTMLImageElement).style.width)).toBeCloseTo(800 / 3);
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar evidencia' }));
    expect(loadImage()).toHaveStyle({ transform: 'rotate(90deg)' });
    fireEvent.click(screen.getByRole('button', { name: 'Volver a la respuesta' }));
    view.rerender(<GradeEvidenceViewer src="/api/evidencia/paginas/3" label="Hoja 3 de la evidencia" />);
    expect(screen.getByRole('img')).toHaveStyle({ transform: 'rotate(0deg)' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  afterEach(() => { vi.restoreAllMocks(); });
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ x: 0, y: 0, top: 0, left: 0, right: 400, bottom: 300, width: 400, height: 300, toJSON() {} }));
  });

  it('permite ampliar, restablecer y mover con teclado la evidencia real sin escribir datos', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<GradeEvidenceViewer src="/api/evidencia/paginas/2" label="Hoja 2 de la evidencia" />);
    expect(screen.getByRole('status', { name: 'Estado de la imagen' })).toHaveTextContent('Cargando');
    loadImage();
    // 176: sin zona, una hoja vertical abre ajustada al ancho del marco, desde arriba.
    expect(screen.getByText('200 %')).toBeInTheDocument();
    expect(screen.getByRole('img').style.top).toBe('0px');
    fireEvent.click(screen.getByRole('button', { name: 'Ver hoja completa' }));
    expect(screen.getByText('100 %')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Acercar imagen' }));
    expect(screen.getByText('125 %')).toBeInTheDocument();
    const canvas = screen.getByRole('group', { name: 'Imagen ampliable de la evidencia' });
    fireEvent.keyDown(canvas, { key: 'ArrowDown' });
    expect(screen.getByRole('img')).toHaveAttribute('src', '/api/evidencia/paginas/2');
    fireEvent.click(screen.getByRole('button', { name: 'Ver hoja completa' }));
    expect(screen.getByText('100 %')).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('amplía en un diálogo sin desmontar el editor que queda debajo', () => {
    render(<><label>Puntaje<input defaultValue="0.65" /></label><GradeEvidenceViewer src="/api/evidencia/paginas/2" label="Hoja 2 de la evidencia" /></>);
    const draft = screen.getByRole('textbox', { name: 'Puntaje' });
    fireEvent.change(draft, { target: { value: '0.75' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar evidencia' }));
    const dialog = screen.getByRole('dialog', { name: 'Hoja 2 de la evidencia' });
    expect(within(dialog).getByRole('button', { name: 'Volver a la respuesta' })).toBeInTheDocument();
    loadImage();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Volver a la respuesta' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(draft).toHaveValue('0.75');
  });

  it('no conserva la imagen o el zoom de otra fuente y permite recuperarse de error', () => {
    const view = render(<GradeEvidenceViewer src="/api/evidencia/paginas/2" label="Hoja 2 de la evidencia" />);
    loadImage();
    fireEvent.click(screen.getByRole('button', { name: 'Acercar imagen' }));
    view.rerender(<GradeEvidenceViewer src="/api/otra/paginas/1" label="Hoja 1 de la evidencia" />);
    expect(screen.getByRole('status', { name: 'Estado de la imagen' })).toHaveTextContent('Cargando');
    expect(screen.getByRole('img')).toHaveAttribute('src', '/api/otra/paginas/1');
    expect(screen.getByText('100 %')).toBeInTheDocument();
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos abrir esta hoja');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar imagen' }));
    expect(screen.getByRole('status', { name: 'Estado de la imagen' })).toHaveTextContent('Cargando');
  });

  it('permite pellizco táctil y arrastre sin desplazar la página entera', () => {
    render(<GradeEvidenceViewer src="/api/evidencia/paginas/2" label="Hoja 2 de la evidencia" />);
    loadImage();
    fireEvent.click(screen.getByRole('button', { name: 'Ver hoja completa' }));
    const canvas = screen.getByRole('group', { name: 'Imagen ampliable de la evidencia' });
    const pointer = (kind: string, pointerId: number, clientX: number, clientY: number) => {
      const event = new Event(kind, { bubbles: true });
      Object.defineProperties(event, { pointerId: { value: pointerId }, pointerType: { value: 'touch' }, clientX: { value: clientX }, clientY: { value: clientY }, button: { value: 0 } });
      fireEvent(canvas, event);
    };
    pointer('pointerdown', 1, 100, 100);
    pointer('pointerdown', 2, 200, 100);
    pointer('pointermove', 2, 300, 100);
    expect(screen.getByLabelText('Nivel de ampliación')).toHaveTextContent('200 %');
    pointer('pointerup', 2, 300, 100);
    const image = screen.getByRole('img');
    const before = image.style.top;
    pointer('pointermove', 1, 100, 130);
    expect(image.style.top).not.toBe(before);
    pointer('pointercancel', 1, 100, 130);
    expect(canvas).toHaveClass('touch-none');
  });
});

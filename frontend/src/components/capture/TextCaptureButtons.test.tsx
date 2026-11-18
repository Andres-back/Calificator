import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextCaptureButtons } from './TextCaptureButtons';
import { mergeCapturedText, TEXT_CAPTURE_ACCEPT } from './textCapture';

const mocks = vi.hoisted(() => ({ captureText: vi.fn(), success: vi.fn(), error: vi.fn(), plain: vi.fn() }));
vi.mock('./textCapture', async (importOriginal) => ({ ...(await importOriginal<typeof import('./textCapture')>()), captureText: mocks.captureText }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(mocks.plain, { success: mocks.success, error: mocks.error }) }));

const file = (name: string, type: string, size = 10) => {
  const value = new File(['x'], name, { type });
  Object.defineProperty(value, 'size', { value: size });
  return value;
};

beforeEach(() => vi.clearAllMocks());

describe('201 llenar un campo desde una foto o un archivo', () => {
  it('ofrece cámara y archivo con los formatos aceptados y recuerda que se puede pegar', () => {
    render(<TextCaptureButtons subject="la lectura" onText={vi.fn()} />);

    const camera = screen.getByLabelText('Tomar una foto de la lectura');
    expect(camera).toHaveAttribute('capture', 'environment');
    expect(camera).toHaveAttribute('accept', 'image/*');
    const upload = screen.getByLabelText('Subir un archivo con la lectura');
    expect(upload).not.toHaveAttribute('capture');
    for (const kind of ['.pdf', '.docx', '.xlsx', '.csv', '.txt', 'image/jpeg']) expect(upload.getAttribute('accept')).toContain(kind);
    expect(TEXT_CAPTURE_ACCEPT).toContain('application/pdf');
    expect(screen.getByText(/También puedes pegar el texto/)).toBeInTheDocument();
  });

  it('entrega el texto leído y avisa de dónde salió', async () => {
    const onText = vi.fn();
    mocks.captureText.mockResolvedValue({ texto: 'Había una vez…', origen: 'Word', advertencias: ['Revisa la tabla.'], paginas: 1 });
    render(<TextCaptureButtons subject="la lectura" onText={onText} />);

    await userEvent.upload(screen.getByLabelText('Subir un archivo con la lectura'), file('cuento.docx', 'application/octet-stream'));

    await waitFor(() => expect(onText).toHaveBeenCalledWith('Había una vez…', expect.objectContaining({ origen: 'Word' })));
    expect(mocks.success).toHaveBeenCalledWith('Listo: se añadió la lectura desde el Word. Revísalo antes de guardar.');
    expect(mocks.plain).toHaveBeenCalledWith('Revisa la tabla.', expect.anything());
  });

  it('una foto sin texto legible no cambia el campo y lo explica', async () => {
    const onText = vi.fn();
    mocks.captureText.mockResolvedValue({ texto: '  ', origen: 'foto', advertencias: ['No se encontró texto legible. Prueba con una foto más nítida o con otro archivo.'], paginas: 1 });
    render(<TextCaptureButtons onText={onText} />);

    await userEvent.upload(screen.getByLabelText('Tomar una foto de el texto'), file('hoja.jpg', 'image/jpeg'));

    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('No se encontró texto legible. Prueba con una foto más nítida o con otro archivo.'));
    expect(onText).not.toHaveBeenCalled();
  });

  it('un archivo de más de 20 MB no se envía', async () => {
    render(<TextCaptureButtons onText={vi.fn()} />);

    await userEvent.upload(screen.getByLabelText('Subir un archivo con el texto'), file('enorme.pdf', 'application/pdf', 21 * 1024 * 1024));

    expect(mocks.captureText).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith('El archivo supera los 20 MB. Usa uno más liviano.');
  });

  it('si el servidor falla, muestra su mensaje y deja reintentar', async () => {
    mocks.captureText.mockRejectedValue({ response: { status: 503, data: { detail: 'No se pudo leer el archivo en este momento. Intenta de nuevo o pega el texto.' } } });
    render(<TextCaptureButtons onText={vi.fn()} />);

    await userEvent.upload(screen.getByLabelText('Subir un archivo con el texto'), file('a.pdf', 'application/pdf'));

    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(screen.getByLabelText('Subir un archivo con el texto')).not.toBeDisabled();
  });

  it('el texto nuevo se añade sin borrar lo que ya estaba escrito', () => {
    expect(mergeCapturedText('', '  Texto leído \n')).toBe('Texto leído');
    expect(mergeCapturedText(null, 'Texto')).toBe('Texto');
    expect(mergeCapturedText('Ya escrito.\n\n', 'Texto leído')).toBe('Ya escrito.\n\nTexto leído');
    expect(mergeCapturedText('12345', '67890', 8)).toBe('12345\n\n6');
  });
});

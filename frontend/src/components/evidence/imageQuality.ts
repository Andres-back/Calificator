export type ImageQualityStatus = 'good' | 'warning' | 'unusable';

export interface ImageQualityResult {
  status: ImageQualityStatus;
  warnings: string[];
  width: number;
  height: number;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo abrir la imagen'));
    };
    image.src = url;
  });
}

export async function analyzeEvidenceImage(file: File): Promise<ImageQualityResult | null> {
  if (!file.type.startsWith('image/')) return null;
  try {
    const image = await loadImage(file);
    const scale = Math.min(1, 384 / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    const luminance = new Float32Array(width * height);
    let sum = 0;
    for (let index = 0, pixel = 0; index < pixels.length; index += 4, pixel += 1) {
      const value = 0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2];
      luminance[pixel] = value;
      sum += value;
    }
    const brightness = sum / luminance.length;
    let squared = 0;
    let edgeSum = 0;
    let edgeCount = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        const delta = luminance[index] - brightness;
        squared += delta * delta;
        if (x > 0) {
          edgeSum += Math.abs(luminance[index] - luminance[index - 1]);
          edgeCount += 1;
        }
        if (y > 0) {
          edgeSum += Math.abs(luminance[index] - luminance[index - width]);
          edgeCount += 1;
        }
      }
    }
    const contrast = Math.sqrt(squared / luminance.length);
    const edgeEnergy = edgeCount ? edgeSum / edgeCount : 0;
    const warnings: string[] = [];
    if (Math.min(image.naturalWidth, image.naturalHeight) < 420) warnings.push('La foto tiene poca resolución.');
    if (brightness < 55) warnings.push('La foto se ve oscura.');
    else if (brightness > 250) warnings.push('La foto tiene demasiada luz.');
    if (contrast < 18) warnings.push('El texto tiene poco contraste.');
    if (edgeEnergy < 4.2) warnings.push('La foto puede estar borrosa.');
    const unusable = Math.min(image.naturalWidth, image.naturalHeight) < 120
      || (contrast < 2.5 && edgeEnergy < 1.2);
    return {
      status: unusable ? 'unusable' : warnings.length ? 'warning' : 'good',
      warnings: unusable ? ['No encontramos detalle suficiente para leer esta foto.'] : warnings,
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  } catch {
    return {
      status: 'unusable',
      warnings: ['No pudimos abrir esta imagen. Selecciona otra foto.'],
      width: 0,
      height: 0,
    };
  }
}

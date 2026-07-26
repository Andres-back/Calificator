import { describe, expect, it } from 'vitest';
import themeCss from '@/index.css?raw';

type Rgb = [number, number, number];

function token(block: string, name: string): Rgb {
  const match = block.match(new RegExp(`--${name}:\\s*(\\d+)\\s+(\\d+)\\s+(\\d+)`));
  if (!match) throw new Error(`Token --${name} no encontrado`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function luminance([red, green, blue]: Rgb) {
  const linear = [red, green, blue].map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(first: Rgb, second: Rgb) {
  const high = Math.max(luminance(first), luminance(second));
  const low = Math.min(luminance(first), luminance(second));
  return (high + 0.05) / (low + 0.05);
}

function themeBlock(selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = themeCss.match(new RegExp(`${escaped}\\s*{([\\s\\S]*?)}`));
  if (!match) throw new Error(`Tema ${selector} no encontrado`);
  return match[1];
}

describe('contraste de tokens semánticos', () => {
  it.each([
    [':root', 'bg'],
    ['.dark', 'surface'],
  ])('mantiene contraste AA de texto en %s', (selector, backgroundName) => {
    const block = themeBlock(selector);
    const background = token(block, backgroundName);
    for (const name of ['fg', 'secondary', 'muted', 'interactive', 'success', 'warning', 'error', 'info']) {
      expect(contrast(token(block, name), background), `${selector} --${name}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
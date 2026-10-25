import { describe, expect, it } from 'vitest';
import { defaultPdfFit, pdfPageWidth, anchoredScrollTop } from './pdfViewport';

describe('125 PDF viewport', () => {
  const page = { width: 595, height: 842 };
  it('fits a complete sheet on desktop without expanding it to the full screen width', () => {
    expect(defaultPdfFit(1440)).toBe('page');
    const width = pdfPageWidth({ availableWidth: 1348, availableHeight: 650, page, mode: 'page', zoom: 1 });
    expect(width / page.width * page.height).toBeLessThanOrEqual(650);
    expect(width).toBeGreaterThan(400);
  });
  it('preserves mobile fit-width and supports zooming out', () => {
    expect(defaultPdfFit(390)).toBe('width');
    expect(pdfPageWidth({ availableWidth: 330, availableHeight: 500, page, mode: 'width', zoom: 1 })).toBe(330);
    expect(pdfPageWidth({ availableWidth: 330, availableHeight: 500, page, mode: 'width', zoom: 0.5 })).toBe(165);
  });
  it('supports landscape pages and 100% physical CSS sizing independently of fit-width', () => {
    expect(pdfPageWidth({ availableWidth: 1200, availableHeight: 600, page: { width: 842, height: 595 }, mode: 'page', zoom: 1 })).toBeLessThanOrEqual(850);
    expect(pdfPageWidth({ availableWidth: 330, availableHeight: 500, page, mode: 'actual', zoom: 1 })).toBeCloseTo(595 * 96 / 72);
  });
  it('bounds zoom and dimensions and preserves the relative reading point inside a sheet', () => {
    expect(pdfPageWidth({ availableWidth: 0, availableHeight: 0, page, mode: 'page', zoom: 0 })).toBeGreaterThan(0);
    expect(pdfPageWidth({ availableWidth: 330, availableHeight: 500, page, mode: 'width', zoom: 99 })).toBe(990);
    expect(anchoredScrollTop({ offsetTop: 1000, pageHeight: 800, fraction: 0.5 })).toBe(1400);
    expect(anchoredScrollTop({ offsetTop: 0, pageHeight: 800, fraction: -1 })).toBe(0);
  });
});

export type PdfFit = 'page' | 'width' | 'actual';

export const defaultPdfFit = (screenWidth: number): PdfFit => screenWidth >= 1024 ? 'page' : 'width';

export function pdfPageWidth({ availableWidth, availableHeight, page, mode, zoom }: {
  availableWidth: number; availableHeight: number; page: { width: number; height: number }; mode: PdfFit; zoom: number;
}) {
  const width = Math.max(1, availableWidth);
  const height = Math.max(1, availableHeight);
  const base = mode === 'actual' ? page.width * 96 / 72
    : mode === 'page' ? Math.min(width, height * page.width / page.height) : width;
  return Math.max(1, base * Math.min(3, Math.max(0.5, zoom)));
}

export function anchoredScrollTop({ offsetTop, pageHeight, fraction }: { offsetTop: number; pageHeight: number; fraction: number }) {
  return Math.max(0, offsetTop + pageHeight * Math.min(1, Math.max(0, fraction)));
}

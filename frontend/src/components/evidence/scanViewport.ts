/** Fit the entire oriented photo; zoom is applied only after this base fit. */
export function fitScanViewport(width: number, height: number, ratio: number) {
  if (![width, height, ratio].every((value) => Number.isFinite(value) && value > 0)) return { width: 1, height: 1 };
  const fittedWidth = Math.min(width, height / ratio);
  return { width: fittedWidth, height: fittedWidth * ratio };
}

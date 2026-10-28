/** Narrow typing of the fixed core/imgproc build, no runtime dependency or global any. */
export interface CvMat {
  rows: number; cols: number; data: Uint8Array; data32S: Int32Array;
  delete(): void;
}
interface CvVector { size(): number; get(index: number): CvMat; push_back(mat: CvMat): void; delete(): void }
type Size = { width: number; height: number };
type Scalar = object;
export interface ScanCv {
  Mat: { new(rows?: number, cols?: number, type?: number): CvMat };
  MatVector: { new(): CvVector };
  Size: { new(width: number, height: number): Size };
  Scalar: { new(...values: number[]): Scalar };
  CLAHE: { new(clip: number, size: Size): { apply(src: CvMat, dst: CvMat): void; delete(): void } };
  CV_32FC2: number; CV_8UC4: number; COLOR_RGBA2GRAY: number; COLOR_RGBA2RGB: number; COLOR_RGB2RGBA: number;
  COLOR_RGB2YCrCb: number; COLOR_YCrCb2RGB: number;
  RETR_LIST: number; CHAIN_APPROX_SIMPLE: number; INTER_LINEAR: number; INTER_AREA: number; BORDER_REPLICATE: number;
  ROTATE_90_CLOCKWISE: number; ROTATE_180: number; ROTATE_90_COUNTERCLOCKWISE: number;
  matFromImageData(image: ImageData): CvMat;
  matFromArray(rows: number, cols: number, type: number, values: number[]): CvMat;
  cvtColor(src: CvMat, dst: CvMat, code: number): void;
  resize(src: CvMat, dst: CvMat, size: Size, fx: number, fy: number, interpolation: number): void;
  GaussianBlur(src: CvMat, dst: CvMat, size: Size, sigma: number): void;
  Canny(src: CvMat, dst: CvMat, low: number, high: number): void;
  findContours(src: CvMat, contours: CvVector, hierarchy: CvMat, mode: number, method: number): void;
  arcLength(src: CvMat, closed: boolean): number;
  approxPolyDP(src: CvMat, dst: CvMat, epsilon: number, closed: boolean): void;
  isContourConvex(src: CvMat): boolean;
  getPerspectiveTransform(src: CvMat, dst: CvMat): CvMat;
  warpPerspective(src: CvMat, dst: CvMat, matrix: CvMat, size: Size, flags: number, border: number, value: Scalar): void;
  rotate(src: CvMat, dst: CvMat, code: number): void;
  split(src: CvMat, dst: CvVector): void;
  merge(src: CvVector, dst: CvMat): void;
}

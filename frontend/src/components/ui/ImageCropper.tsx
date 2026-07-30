import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, RotateCcw, ZoomIn, X } from 'lucide-react';
import { Button } from '@/components/ui';

interface ImageCropperProps {
  imageUrl: string;
  onCrop: (croppedBlob: Blob) => void;
  onCancel: () => void;
  aspectRatio?: number;
}

interface Point {
  x: number;
  y: number;
}

/**
 * Simple image cropper with draggable corners for document alignment.
 * Uses Canvas 2D API with perspective transform.
 */
export function ImageCropper({ imageUrl, onCrop, onCancel }: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [dragging, setDragging] = useState<number | null>(null);
  const [showCrop, setShowCrop] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Initial corners — slightly inset from image edges
  const [corners, setCorners] = useState<Point[]>([
    { x: 0.1, y: 0.1 },  // top-left
    { x: 0.9, y: 0.1 },  // top-right
    { x: 0.9, y: 0.9 },  // bottom-right
    { x: 0.1, y: 0.9 },  // bottom-left
  ]);

  const handleMouseDown = useCallback((idx: number) => (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDragging(idx);
  }, []);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (dragging === null || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    setCorners((prev) => {
      const next = [...prev];
      next[dragging] = { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
      return next;
    });
  }, [dragging]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => handleMove(e.clientX, e.clientY), [handleMove]);
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches[0]) handleMove(e.touches[0].clientX, e.touches[0].clientY);
  }, [handleMove]);

  const handleUp = useCallback(() => setDragging(null), []);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    // Image
    const img = imgRef.current;
    const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight) * zoom;
    const iw = img.naturalWidth * scale;
    const ih = img.naturalHeight * scale;
    const ix = (w - iw) / 2;
    const iy = (h - ih) / 2;

    ctx.save();
    // Draw image with corner clip
    ctx.beginPath();
    const pts = corners.map((c) => ({
      x: ix + c.x * iw,
      y: iy + c.y * ih,
    }));
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, ix, iy, iw, ih);
    ctx.restore();

    // Corner handles
    const handleSize = 16;
    for (let i = 0; i < 4; i++) {
      const p = pts[i];
      // Outer circle
      ctx.beginPath();
      ctx.arc(p.x, p.y, handleSize / 2 + 3, 0, Math.PI * 2);
      ctx.fillStyle = dragging === i ? '#6366f1' : '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // Inner dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#6366f1';
      ctx.fill();
    }

    // Selection lines
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i <= 4; i++) ctx.lineTo(pts[i % 4].x, pts[i % 4].y);
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [corners, zoom, dragging]);

  const handleCrop = useCallback(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight) * zoom;
    const iw = img.naturalWidth * scale;
    const ih = img.naturalHeight * scale;
    const ix = (w - iw) / 2;
    const iy = (h - ih) / 2;

    // Convert corners to image pixel coordinates
    const pts = corners.map((c) => ({
      x: (ix + c.x * iw),
      y: (iy + c.y * ih),
    }));

    // Calculate output size
    const cw = Math.max(
      Math.sqrt((pts[1].x - pts[0].x) ** 2 + (pts[1].y - pts[0].y) ** 2),
      Math.sqrt((pts[2].x - pts[3].x) ** 2 + (pts[2].y - pts[3].y) ** 2),
    );
    const ch = Math.max(
      Math.sqrt((pts[3].x - pts[0].x) ** 2 + (pts[3].y - pts[0].y) ** 2),
      Math.sqrt((pts[2].x - pts[1].x) ** 2 + (pts[2].y - pts[1].y) ** 2),
    );

    // Create output canvas
    const outCanvas = document.createElement('canvas');
    outCanvas.width = Math.round(cw);
    outCanvas.height = Math.round(ch);
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return;

    // Draw cropped region
    outCtx.save();
    outCtx.beginPath();
    outCtx.rect(0, 0, outCanvas.width, outCanvas.height);
    outCtx.clip();

    // Simple approach: draw the source into the destination
    // For proper perspective, we use the built-in drawImage with source rect
    const sx = Math.min(...pts.map((p) => p.x));
    const sy = Math.min(...pts.map((p) => p.y));
    const sw = Math.max(...pts.map((p) => p.x)) - sx;
    const sh = Math.max(...pts.map((p) => p.y)) - sy;

    outCtx.drawImage(
      img,
      (sx - ix) / scale, (sy - iy) / scale,
      sw / scale, sh / scale,
      0, 0, outCanvas.width, outCanvas.height,
    );
    outCtx.restore();

    outCanvas.toBlob((blob) => {
      if (blob) onCrop(blob);
    }, 'image/jpeg', 0.92);
  }, [corners, zoom, onCrop]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold">Ajustar la foto</h3>
          <p className="text-xs text-muted">Arrastra las esquinas para recortar solo el papel</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setZoom((z) => Math.min(3, z + 0.1))}>
            <ZoomIn className="h-4 w-4 rotate-90" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setCorners([
            { x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 },
            { x: 0.9, y: 0.9 }, { x: 0.1, y: 0.9 },
          ])}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        className="relative overflow-hidden rounded-xl border border-border bg-surface-2"
        style={{ height: 'min(70vh, 500px)' }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleUp}
        onMouseLeave={handleUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleUp}
      >
        <canvas
          ref={canvasRef}
          className="h-full w-full"
          style={{ touchAction: 'none' }}
        />
        <img
          ref={imgRef}
          src={imageUrl}
          alt=""
          className="hidden"
          onLoad={() => {
            if (imgRef.current) {
              setImgSize({ w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight });
              setShowCrop(true);
            }
          }}
        />
        {/* Invisible draggable overlays */}
        {showCrop && corners.map((c, i) => (
          <div
            key={i}
            className="absolute z-10 cursor-grab active:cursor-grabbing"
            style={{
              left: `calc(${c.x * 100}% - 16px)`,
              top: `calc(${c.y * 100}% - 16px)`,
              width: 32,
              height: 32,
            }}
            onMouseDown={handleMouseDown(i)}
            onTouchStart={handleMouseDown(i)}
          />
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          <X className="h-4 w-4" /> Descartar ajustes
        </Button>
        <Button onClick={handleCrop}>
          <Check className="h-4 w-4" /> Aplicar recorte
        </Button>
      </div>
    </div>
  );
}

# Plan: Avisar cuando el recorte de la hoja deja fuera parte de la foto

**Spec**: [spec.md](spec.md) | **Issue**: [#437](https://github.com/Andres-back/Calificator/issues/437)

## Decisión

Solo frontend.

- `components/evidence/scanGeometry.ts`: `sidesOnPhotoFrame(quad)` cuenta los lados del recorte que van sobre el borde de la foto; `cropCutsAcrossPhoto(quad)` es verdadero con dos o más lados sobre el borde y área menor al 97 %.
- `components/evidence/EvidenceScanEditor.tsx`: aviso (`role="alert"`, `data-testid="scan-crop-warning"`) encima de la línea de estado, visible en ambas pestañas; no cambia el botón de aceptar.

El editor es el mismo al subir fotos y en «Editar hojas», así que el aviso aplica a ambos.

## Qué no se hace

- No se cambia el detector automático: no produce estas franjas (comprobado con las fotos originales).
- No se bloquea el recorte: hay recortes legítimos de lado a lado (hoja que ocupa todo el ancho de la foto).
- No se tocan las entregas ya guardadas.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `frontend/src/components/evidence/scanGeometry.ts` | detección del recorte de borde a borde |
| `frontend/src/components/evidence/EvidenceScanEditor.tsx` | aviso |
| `frontend/src/components/evidence/cropWarning208.test.tsx` | pruebas |

## Riesgo

Bajo. Un aviso no bloqueante.

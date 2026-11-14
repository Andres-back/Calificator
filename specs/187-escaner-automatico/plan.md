# Plan: La hoja se endereza y gira sola al tomar la foto

**Spec**: [spec.md](spec.md) | **Issue**: [#394](https://github.com/Andres-back/Calificator/issues/394)

## Decisión

- **Backend** (`evidence_scan_suggestion.py`):
  - `CornerContext.kind` (`corners` u `orientation`) da a la orientación sus propias claves, caché y cupo diario. Las de bordes no cambian.
  - `orientation_views` arma cuatro JPEG de hasta 768 px girados en sentido horario. `parse_orientation` acepta solo `{"upright": "A"…"D"|null}`.
  - El flujo común `_advise` sirve a bordes y orientación: reserva, consulta, caché y registro de uso.
- **Ruta**: `POST`/`GET /calificaciones/sugerir-orientacion`, con la misma autorización que la de bordes, incluida la bandera `EVIDENCE_CORNER_ASSISTANCE_ENABLED`.
- **Frontend**:
  - `createOrientationAssistant` comparte el cliente con `createCornerAssistant`.
  - `useEvidenceScanCapability` lo entrega a la par que la ayuda de bordes, y se pasa por `MultiPageEvidencePicker` hasta `EvidenceScanEditor`.
  - El editor pide la orientación y la aplica si no hubo giro manual. Abre en «Ver preparada» cuando hay bordes y marca la pestaña activa.

Descartado:

- **Pedir el ángulo directamente**: falló en la foto real.
- **Forzar vertical**: los exámenes vistos están impresos en horizontal.
- **Detección de texto local**: no distingue arriba de abajo con fiabilidad.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/app/modules/calificaciones/evidence_scan_suggestion.py` | orientación y flujo común |
| `backend/app/modules/calificaciones/evidence_scan_suggestion_router.py` | rutas de orientación |
| `frontend/src/components/evidence/cornerAssistance.ts` | cliente común y de orientación |
| `frontend/src/components/evidence/useEvidenceScanCapability.ts`, `MultiPageEvidencePicker.tsx`, `EvidenceScanEditor.tsx` | giro automático y vista preparada primero |
| `frontend/src/modules/materias/MateriaCalificar.tsx`, `frontend/src/modules/calificaciones/components/GradeReprocessing.tsx` | conexión |

## Riesgos

- La ayuda visual está apagada en producción: el giro automático necesita activar `EVIDENCE_CORNER_ASSISTANCE_ENABLED`, que también enciende la ayuda de bordes. Es decisión del usuario.
- Costo: una consulta pequeña por foto (y otra solo si faltan bordes), con el modelo de la ruta de bordes.

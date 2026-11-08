# Validación: Retroalimentación orientada al siguiente paso y foto siempre adjunta

## PR 1: la foto siempre adjunta

### Pruebas

```
python -m pytest backend/tests/unit -q -k feedback
  201 passed

npx vitest run src/modules/feedback_sharing
  215 passed

npx playwright test e2e/feedback-link-reentry.spec.ts e2e/feedback-share-review.spec.ts e2e/feedback-workspace-responsive.spec.ts e2e/feedback-delivery.spec.ts --project=chromium
  102 passed
```

Antes de la corrección, 9 pruebas de backend fallaban: publicación sin foto, 409 al reutilizar, reemplazo y copia sin foto, y la opción de foto ofrecida a una entrega sin archivo. Las pruebas de integración con PostgreSQL y las de WebKit corren en CI.

### Hallazgo durante la implementación

`evidencia_disponible` solo miraba si existía la entrega, y un 404 de la foto cerraba toda la página con "Este enlace no está disponible". Con la foto siempre activa, un estudiante con entrega en línea habría perdido su nota y su mensaje al tocar el botón. Ahora la opción aparece solo si hay archivo, y un 404 vuelve a consultar el enlace: se oculta todo únicamente si está cerrado de verdad.

### Sin efecto en datos

- La huella de contenido no incluye `evidence_enabled`, así que los enlaces vigentes siguen abriendo.
- Ninguna migración ni escritura masiva. Un enlace vigente cambia solo cuando el docente actúa sobre él, y queda en auditoría como `feedback_evidence_attached`.
- Abrir el panel recupera los enlaces sin cambiar nada: lo cubre una prueba.

### Manual, después del despliegue

1. Generar un enlace de una entrega con foto, sin marcar nada: el estudiante ve **Ver foto de tu entrega**.
2. Generar un enlace de una entrega en línea: no aparece esa opción.
3. Abrir un enlace vigente sin foto: sigue igual hasta que el docente lo copie; después aparece la opción.

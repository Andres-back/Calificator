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

## PR 2: la acción primero y sin textos internos para el estudiante

### Pruebas

```
python -m pytest backend/tests/unit/test_feedback_action_first.py -q
  8 passed

python -m pytest backend/tests/unit -q   (sin test_evidence_scan* ni la versión de fpdf, que fallan solo en este equipo)
  2291 passed, 7 skipped

npx vitest run src/modules/feedback_sharing
  216 passed
```

Antes de la corrección, la importación de `repartition_explanations` fallaba y, con ella resuelta, 3 pruebas de orden seguían fallando: el mensaje empezaba por el error y terminaba con «Siguiente paso». Las pruebas de integración con PostgreSQL corren en CI.

### Hallazgo durante la implementación

El plan preveía tocar `projection.py` para que el aviso «Retroalimentación provisional» no llegara a enlaces nuevos. No hizo falta: `ensure_feedback_coherence` ya rechaza un enlace directo cuyo mensaje empieza por ese aviso, y el texto que se ofrece para aprobar pasa por `delivery_message`, que lo quita. Como la proyección no cambia, la huella de los enlaces vigentes es la misma. Una prueba lo fija.

### Sin efecto en datos

- Ninguna migración ni escritura masiva. Los mensajes y explicaciones guardados conservan su redacción.
- El orden nuevo se ve en las calificaciones nuevas y en los mensajes que se rehacen desde el desglose. La frase del reparto deja de añadirse a la explicación del estudiante en los próximos repartos; la del docente la conserva.

### Manual, después del despliegue

1. En una calificación nueva con una respuesta parcial, el borrador dice «Pregunta N: {qué hacer} Por qué: {motivo}».
2. Tras confirmar un reparto de puntos, la explicación del estudiante no empieza por «Con el reparto confirmado».

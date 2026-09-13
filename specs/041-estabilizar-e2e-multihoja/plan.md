# Plan: Estabilización del E2E de carga multihoja

## Resumen

Hacer determinista el escenario de dos entregas consecutivas sin modificar el producto. El caso esperará a que la navegación por estudiante termine y el panel aislado sea reemplazado antes de cargar un archivo diferente; luego verificará el estado habilitado del botón, de modo que un fallo futuro señale la precondición exacta y no se manifieste como un timeout opaco del clic.

## Alcance técnico

- Modificar únicamente `frontend/e2e/explainable-grading.spec.ts`.
- Mantener los mocks, la respuesta 503 controlada, el reintento y las aserciones de propietario y persistencia.
- Actualizar la trazabilidad de Spec Kit y la línea base de gobernanza.
- No modificar `MultiPageEvidencePicker`, `GradingUploadPanel`, backend, base de datos o configuración IA.

## Implementación

1. Esperar que la URL contenga `estudiante=s2` y que el mensaje de éxito del panel anterior desaparezca para confirmar que finalizó su reemplazo.
2. Sustituir el segundo uso del payload `hoja.png` por `segunda-entrega.png`.
3. Localizar de manera explícita el selector múltiple que corresponde al paquete de evidencia.
4. Esperar con `toBeEnabled()` el botón «Enviar a calificar» después de cargar el archivo.
5. Ejecutar primero el caso específico varias veces y después las verificaciones frontend/gobernanza proporcionales.
6. Abrir PR enlazado al issue #84 y fusionar únicamente con CI verde.

## Seguridad y compatibilidad

No se procesan datos reales, no se invocan modelos y no cambian secretos, permisos ni superficies públicas. El escenario usa un PNG mínimo en memoria y endpoints interceptados por Playwright.

## Criterio de reversión

El cambio puede revertirse eliminando las dos precondiciones adicionales del test; no deja migraciones, datos ni cambios productivos.

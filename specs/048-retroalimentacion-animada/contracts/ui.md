# Contrato de interfaz

## Entrada

`XaliFeedbackStory` recibe un `GradeBreakdownData` ya autorizado y publicado, identificadores canónicos para telemetría y una acción para enfocar/abrir el componente original.

## Salida visible

- Máximo cuatro escenas.
- Siempre ofrece “Ver detalle completo”.
- Nunca presenta una nota distinta ni reemplaza fórmula, evidencia o reclamo.
- Si no hay contenido suficiente, no muestra una historia vacía: conserva el desglose actual.

## Accesibilidad

- Región con nombre “Historia de tu retroalimentación”.
- Progreso textual “Paso N de M”.
- Controles de al menos 44 px, foco visible y etiquetas completas.
- Cambios anunciados de forma no intrusiva; no mover foco automáticamente.
- `prefers-reduced-motion: reduce` y selección estática deshabilitan movimiento no esencial.

## Error

Un error interno devuelve `null` o la versión estática y nunca captura la pantalla completa. El detalle original queda visible.

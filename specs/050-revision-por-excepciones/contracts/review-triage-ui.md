# Contrato de interfaz: resumen de revisión

## Entrada

- Desglose docente activo.
- Componente seleccionado.
- Función existente para seleccionar componente.
- Identificadores de evaluación y calificación para analítica.

## Salida visible

- Tres conteos: “Sin alertas”, “Necesitan atención” y “Bloqueadas”.
- Advertencia global si la cobertura o el desglose tienen bloqueos.
- Razón legible junto a cada excepción.
- Acción “Revisar primera excepción”.
- Acción “Siguiente excepción” cuando corresponde.
- Lista expandible que conserva acceso a respuestas seguras.

## Semántica

- “Sin alertas” nunca se presenta como garantía de corrección.
- “Atención” no cambia puntaje ni estado.
- “Bloqueada” impide mensajes de revisión rápida, pero no reemplaza el flujo manual.
- La acción final continúa siendo “Confirmar nota” o ajuste explícito del docente.

## Accesibilidad

- Región identificada por encabezado.
- Conteos anunciables como texto, no solo por color.
- Botones con nombre accesible y tamaño táctil mínimo.
- Orden de foco: resumen, primera excepción, lista de excepciones, respuestas sin alertas.

# Plan de hotfix 045

Issue #90. El usuario autorizó completar y publicar la reparación; se omite únicamente la pausa de aprobación del plan conforme al proceso de hotfix.

## Implementación y reversión

1. Encapsular la construcción de contexto por pregunta dentro del orquestador de calificación.
2. Ante cualquier excepción, registrar solo `error_type`, usar mapas/listas vacíos y continuar con el flujo ya existente.
3. Exponer en la salida auditable un estado de disponibilidad RAG sin convertirlo en nota ni ocultar otros fallos del pipeline.
4. Reemplazar la regresión que esperaba fallo total por una que exige continuidad y sanitización.
5. Ejecutar pruebas focalizadas, Ruff, gobernanza, PR y CI. Desplegar desde main y repetir la medición no persistente autorizada.

Reversión: revertir el PR mediante otro PR. No interviene datos ni migraciones.

## Constitución

Se preservan la integridad de notas y la revisión humana: la excepción no genera puntos ni publica resultados. Se mejora recuperabilidad e intercambiabilidad de proveedores. La telemetría omite secretos y contenido sensible. La propiedad funcional permanece en 008, 009, 012, 016, 020 y 031; 045 registra únicamente este incidente productivo.

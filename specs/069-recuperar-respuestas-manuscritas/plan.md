# Plan: recuperar respuestas manuscritas antes de calificar

**Rama**: `codex/069-recuperar-respuestas-manuscritas` | **Fecha**: 2026-09-24 | **Spec**: [spec.md](./spec.md) | **Issue**: [#143](https://github.com/Andres-back/Calificator/issues/143)

## Solución

1. Reforzar la preparación y el prompt visual para conservar y buscar escritura tenue a lápiz.
2. Considerar incompleta una lectura que reconoce el impreso pero no recupera respuestas esperadas; probar los modelos de respaldo.
3. Bloquear la creación de un cero cuando todas las lecturas visuales agotan la búsqueda sin respuestas.
4. Hacer que el verificador contraste la imagen independientemente antes de aceptar la ausencia propuesta por la extracción o el evaluador principal.
5. Permitir reencolar una sugerencia pendiente de revisión con evidencia guardada y mostrar la acción en el workspace.
6. Añadir regresiones sintéticas focalizadas y verificar contratos existentes.

## Seguridad y compatibilidad

No hay migración ni endpoint nuevo. Se conserva una sola entrega y calificación. El reintento continúa bloqueado para notas con decisión docente. La fotografía real usada para diagnosticar contiene datos estudiantiles y no se copiará al repositorio.

## Despliegue

Hotfix mediante PR y CI. Después del merge se reanalizará explícitamente la calificación afectada y se comprobará que la nota permanezca como sugerencia pendiente, sin publicación automática.

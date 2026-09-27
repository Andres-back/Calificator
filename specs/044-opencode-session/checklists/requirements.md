# Lista de calidad: sesión estable para OpenCode Go

**Propósito**: validar que el hotfix está acotado, es comprobable y no altera notas.
**Fecha**: 2026-09-16
**Especificación**: [spec.md](../spec.md)

## Calidad de contenido

- [x] Enfocada en valor y recuperación del flujo afectado.
- [x] Todos los escenarios y límites obligatorios están definidos.
- [x] No contiene claves, evidencia ni datos personales.

## Completitud

- [x] No quedan marcadores de aclaración.
- [x] Los requisitos son verificables y están mapeados a tareas.
- [x] Los resultados son medibles.
- [x] La ausencia de cambios de nota, API y datos está delimitada.
- [x] La medición de rendimiento no se presenta como cumplida antes de probar producción.

## Preparación

- [x] El issue de hotfix y la aprobación humana están registrados.
- [x] Existe una prueba de regresión exigida antes del merge.
- [x] El despliegue solo puede proceder desde main mediante PR y CI verde.

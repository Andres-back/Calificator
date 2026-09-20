# Checklist de calidad: Capacidades correctas por etapa de IA

**Propósito**: Validar que el hotfix sea preciso, seguro y verificable.
**Creada**: 2026-09-20
**Especificación**: [spec.md](../spec.md)

## Calidad del contenido

- [x] La especificación se centra en el valor y el comportamiento esperado.
- [x] Todos los escenarios y requisitos son comprobables.
- [x] No quedan marcadores de aclaración.
- [x] El alcance excluye cambios de modelos, notas, permisos y APIs.

## Integridad del hotfix

- [x] La corrección preserva proveedor, modelos, respaldo y permisos.
- [x] La actualización evita cambios repetidos cuando la capacidad ya es correcta.
- [x] Existe un rollback explícito.
- [x] Existe una prueba de regresión para las tres rutas.

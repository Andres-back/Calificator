# Plan: retirar del selector la evidencia ya enviada

**Rama**: `codex/065-retirar-foto-enviada` | **Fecha**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

## Resumen

Consultar las calificaciones existentes al abrir “Añadir entregas”, excluir sus estudiantes del selector y mantener un conjunto optimista por evaluación para retirar inmediatamente una carga aceptada. El componente notificará el éxito al workspace y limpiará la selección; los errores conservarán el estado actual.

## Contexto técnico

**Lenguaje**: TypeScript/React 18  
**Dependencias**: React Query, React Router, Vitest/Testing Library  
**Persistencia**: PostgreSQL existente, solo mediante contratos actuales  
**Restricciones**: sin backend, migraciones ni cambios en la cola

## Comprobación constitucional

- **Roles**: reutiliza `grading.grade` y las rutas docentes existentes.
- **Integridad**: no modifica calificaciones; solo evita iniciar una carga redundante.
- **Recuperación**: los errores mantienen estudiante y evidencia para reintento.
- **Accesibilidad**: conserva el selector buscable y sus controles táctiles.
- **Calidad**: incluye regresiones de éxito y fallo antes del PR.

## Diseño

1. Activar una consulta de calificaciones únicamente mientras el modo de carga esté abierto.
2. Derivar los candidatos eliminando estudiantes presentes en calificaciones persistidas o aceptados durante la sesión actual.
3. Añadir a `GradingUploadPanel` una notificación `onUploadAccepted(studentId)` que se ejecuta solo tras éxito.
4. En el workspace, registrar ese identificador, limpiar el estudiante de la URL e invalidar las consultas ya existentes.
5. Restablecer la exclusión optimista al cambiar de evaluación; la consulta persistente seguirá siendo la autoridad.
6. Mantener el resumen de asistencia dentro del flujo normal en móvil y tableta, reservando su posición fija al ancho de escritorio.

La regla pura de exclusión reside en `submissionCandidates.ts` para mantener el componente compatible con Fast Refresh y permitir una prueba determinista sin montar el workspace completo.

## Riesgos y mitigaciones

- **Respuesta aceptada aún no visible en la consulta**: el conjunto optimista cubre la ventana de consistencia.
- **Error de red**: no se llama el callback de aceptación y se conservan hojas/selección.
- **Reemplazo legítimo**: continúa por el flujo específico de reemplazo, sin duplicar entregas desde la carga general.
- **Panel de asistencia demasiado alto**: una regresión a 390×844 valida posición normal, acceso al reporte y ausencia de desbordamiento.

## Coordinación 131: evidencia docente revisable

Escanear no envía ni crea otra entrega. Se mantiene aceptación confirmada y reemplazo dedicado con historial; un fallo de escaneo permite continuar expresamente con los mismos archivos por la vía habitual. Contratos y validación se registran en [Spec131](../131-escaneo-evidencias/spec.md), [plan](../131-escaneo-evidencias/plan.md) y [tareas](../131-escaneo-evidencias/tasks.md), issue #276. Esta coordinación no certifica cierre, CI, teléfonos físicos ni activación productiva.

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

La regla pura de exclusión reside en `submissionCandidates.ts` para mantener el componente compatible con Fast Refresh y permitir una prueba determinista sin montar el workspace completo.

## Riesgos y mitigaciones

- **Respuesta aceptada aún no visible en la consulta**: el conjunto optimista cubre la ventana de consistencia.
- **Error de red**: no se llama el callback de aceptación y se conservan hojas/selección.
- **Reemplazo legítimo**: continúa por el flujo específico de reemplazo, sin duplicar entregas desde la carga general.

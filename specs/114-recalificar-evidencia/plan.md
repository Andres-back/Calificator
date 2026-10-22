# Plan — recalificación y evidencia

**Rama**: `codex/114-recalificar-evidencia` | **Fecha**: 2026-10-22 | **Spec**: [spec.md](spec.md) | **Issue**: #240
Hotfix autorizado para preparar PR; pausa adicional de plan omitida según constitución. Sin merge/despliegue autorizado.

Actualización de autorización: el usuario pidió «fusion» después de revisar el CI del PR #241. Se autoriza su fusión únicamente tras corregir los fallos y obtener CI verde; no se autorizan bypass ni operaciones manuales del VPS.

## Resumen y contexto técnico
Reutilizar FastAPI/Python, SQLAlchemy/PostgreSQL, Celery y la cola de calificación, React/TypeScript, Query y el selector de evidencia existente. Sin paquetes nuevos. Nueva tabla aditiva de revisiones conserva snapshots sin duplicar la calificación vigente; sin backfill de notas.

## Diseño
1. Modelo/migración `CalificacionRevision`: identidad idempotente, grade/actor, fecha/acción/motivo, huella de solicitud y snapshot de nota/estado/resultado/archivo/entrega. Archivos previos se conservan en su ubicación privada; nunca se eliminan si una revisión los referencia. Downgrade se niega con historial material.
2. Servicio de reproceso: bloquear calificación/entrega, verificar propietario, versión y trabajo no activo; reconocer solicitud ya admitida y rechazar reutilización distinta. Preparar/validar archivos antes de mutar. Snapshot y suspensión de devolución compartida en la misma transacción que la cola persistida. Mantener contenido/versionado del intento y respuestas online.
3. Ruta aditiva multipart `/calificaciones/{id}/recalificar`: sin fotos vuelve a usar evidencia; con fotos reemplaza todo el paquete. Requiere solicitud UUID, versión esperada y confirmación de reapertura cuando corresponde; motivo opcional. GET historial y archivo de revisión solo para propietario autorizado. Conservar rutas técnicas existentes.
4. Componente docente aislado con dos acciones, modal de fotos/confirmación y motivo opcional, reutilizando `MultiPageEvidencePicker`. Integrar acciones visibles en resumen/evidencia e historial; invalidar consultas de nota/libro/revisión e iniciar monitor de cola sin bloquear navegación.
5. Pruebas antes de código: política/snapshot, permisos, versión, idempotencia, rollback, evidencia conservada, suspensión de enlaces; PostgreSQL aislado y migración; Vitest y E2E simulados en 360 px y escritorio. Full regression y gobernanza, PR sin secretos.

## Archivos
`calificaciones/{models,schemas,router,revision_router,revision_service}.py`, `services/evidence_bundle_service.py` (huella estable de archivos originales para reintentos multipágina), migración `202610220001_grading_revisions.py`, `calificaciones/api.ts`, `components/GradeReprocessing.tsx`, `CalificacionesWorkspace.tsx`, pruebas adyacentes, inventario y documentación. El alta general de fotos rechaza sustituir una calificación existente y remite a la nueva acción explícita, evitando una sobrescritura sin archivo histórico.

La comprobación visual se realiza mediante Playwright CLI con APIs sintéticas, sin añadir otro runner. La integración PostgreSQL usa exclusivamente el fixture guardado de CI `127.0.0.1:55417/spec107`. Si Docker local no responde, documentar las pruebas omitidas y exigir que integración, migración real y contenedores pasen en CI antes de cualquier fusión; no probar contra producción ni declarar estas comprobaciones locales como superadas.

Correcciones de convergencia tras CI: opciones avanzadas plegadas después de la navegación principal; guardia de autofoco en `components/ui/Modal.tsx` con regresión de diálogo superpuesto; registro de Spec 114 en la lista base y prueba de feedback fijada a su migración concreta. No se relajan los E2E existentes ni las confirmaciones; no se modifican modelos ni reglas de notas.

## Constitución
Permisos en servidor y UI; historial inmutable privado; una nota vigente y nueva aprobación; cola/idempotencia; migración aditiva recuperable; responsive; sin cambiar modelos o secretos. Issue, spec aprobada por alcance conversado, tareas, regresión, PR y CI obligatorios. No hay excepción a main protegida.

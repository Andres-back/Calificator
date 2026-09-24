# Tareas: base legal, privacidad y aceptación versionada

## Fase 1 — Documentación y contrato

- [x] T001 Registrar auditoría, fuentes, límites y responsables en `specs/067-privacidad-legal/` (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007).
- [x] T002 Actualizar `specs/README.md` y el inventario técnico (FR-001, FR-014).

## Fase 2 — Persistencia segura

- [x] T003 Crear modelo y migración aditiva de aceptaciones sin backfill (FR-010, FR-011, FR-014).
- [x] T004 Validar aceptación en el contrato público y persistirla atómicamente (FR-008–FR-011).
- [x] T005 Añadir regresiones backend para rechazo, éxito atómico y preservación histórica (SC-002–SC-004).

## Fase 3 — Transparencia pública

- [x] T006 Crear layout y contenido versionado de los cinco documentos legales (FR-001–FR-007, FR-013).
- [x] T007 Registrar rutas públicas, enlaces globales y metadatos seguros (FR-012).
- [x] T008 Integrar casillas no premarcadas y contrato actualizado en registro (FR-008, FR-009).
- [x] T009 Añadir pruebas frontend de rutas, enlaces, accesibilidad y registro (SC-001, SC-005).

## Fase 4 — Verificación

- [x] T010 Ejecutar pruebas focalizadas backend/frontend, migración, tipos, lint y `git diff --check` (SC-006).
- [x] T011 Ejecutar Analyze/Converge, abrir PR enlazado al issue #139 y esperar CI verde.

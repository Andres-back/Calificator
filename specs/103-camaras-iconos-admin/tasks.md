# Tareas: selección de cámaras e iconos administrativos

## Fase 1: Preparación

- [x] T001 Registrar aprobación y revisar calidad en specs/103-camaras-iconos-admin/checklists/ux.md; documentar propuesta separada de Xali en propuesta-xali-docente.md (FR-009).

## Fase 2: Fundamentos

- [x] T002 Añadir pruebas de selección/ciclo de vida en frontend/src/components/evidence/CameraCapture.test.tsx (FR-001/FR-002/FR-003/FR-004/FR-005).

## Fase 3: Historia 1 — Cámaras

- [x] T003 [US1] Implementar selección, actualización y limpieza segura en frontend/src/components/evidence/CameraCapture.tsx (FR-001/FR-002/FR-003/FR-004/FR-005).
- [x] T004 [US1] Conservar preferencia efímera y contexto con pruebas en frontend/src/components/evidence/MultiPageEvidencePicker.tsx y MultiPageEvidencePicker.test.tsx (FR-004/FR-005).
- [x] T005 [US1] Extender escenarios sintéticos responsivos en frontend/e2e/camera-capture.spec.ts (FR-001/FR-002/FR-003/FR-008; SC-001/SC-002/SC-004).

## Fase 4: Historia 2 — Administración

- [x] T006 [P] [US2] Generar y optimizar tres iconos transparentes en frontend/public/branding/semantic-icons/; registrar procedencia/pesos (FR-007).
- [x] T007 [US2] Registrar assets/fallback y pruebas en frontend/src/components/ui/EducationalIcon.tsx y EducationalIcon.test.tsx (FR-007).
- [x] T008 [US2] Integrar identidad en frontend/src/config/nav.ts, Topbar y cabeceras administrativas de Usuarios/Roles/Correo sin cambiar permisos (FR-006/FR-008).
- [x] T009 [US2] Comprobar permisos y presentación responsive/claro/oscuro en pruebas administrativas frontend y registrar QA visual (FR-006/FR-007/FR-008; SC-003/SC-004).

## Fase final: Validación

- [x] T010 Ejecutar lint, tipos, pruebas focalizadas y build; registrar resultados y límites en specs/103-camaras-iconos-admin/quickstart.md (FR-001–FR-009).
- [x] T011 Ejecutar Converge y registrar spec en specs/README.md; no afirmar producción ni hardware verificados y conservar aprobaciones de fusión separadas (FR-005/FR-009).

## Dependencias y entrega

T001 → T002 → T003 → T004 → T005. T006 puede prepararse independientemente de cámaras tras T001; T007 depende de T006 y T008 depende de T007; T009 depende de T008. T010/T011 requieren ambas historias completas. No delegación adicional prevista. US1 se prueba independientemente mediante tres cámaras sintéticas; US2 mediante navegación/roles y assets. Implementación incremental con cámara primero e identidad después, sin migraciones ni despliegue manual.

## Fase 5: Convergencia de CI

- [x] T012 Registrar Spec 103 en tests/spec_governance/test_spec_baseline.py, regenerar specs/system-inventory/current.json y repetir tests/spec_governance e inventario --check, conservando validadores sin exclusiones (Constitución VII, plan: gobernanza; partial).

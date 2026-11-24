# Tareas: «Editar hojas» fácil para cualquier edad

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #456. Pedido del usuario el 2026-11-24.

### Pruebas primero (RED)

- [X] T001 `components/ui/Modal.fullscreen217.test.tsx`: un diálogo a pantalla completa abierto dentro de otro queda fuera de él, en el documento, y sigue siendo el de encima; uno normal no cambia de lugar. (FR-001)
- [X] T002 `EvidenceEditDraft.test.tsx`: acciones con texto, «Sin cambios» y «Foto nueva», hoja en grande, «Deshacer» que devuelve la hoja a su lugar y que desaparece con otro cambio. (FR-002, FR-003, FR-004, FR-007)
- [X] T003 `GradeReprocessing.test.tsx`: la frase dice qué falta para guardar y la confirmación usa lenguaje llano. (FR-005, FR-006)
- [X] T004 Prueba de regresión de extremo a extremo `e2e/evidence-edit-usability.spec.ts` a 1440 × 900 (claro) y 390 × 844 (oscuro): acciones con texto y 44 px, hoja en grande, deshacer, «Usar esta hoja» visible y tocable sin desplazar, y la frase de lo que falta. Con el diálogo anterior falla a 1440 px. (FR-001 a FR-007)

### Implementación (GREEN)

- [X] T005 `Modal.tsx`: capa a pantalla completa con `createPortal` en `document.body`. (FR-001)
- [X] T006 `EvidenceEditDraft.tsx`: botones con texto, miniatura grande con visor, deshacer y estados. (FR-002, FR-003, FR-004, FR-007)
- [X] T007 `GradeReprocessing.tsx`: frase de lo que falta y confirmación en dos líneas. (FR-005, FR-006)
- [X] T008 `EvidenceScanEditor.test.tsx` busca el editor en el documento, donde ahora se dibuja.

### Cierre

- [X] T009 «Editar hojas» en la revisión con axe (`e2e/accessibility/wcag-axe.a11y.spec.ts`), con la preparación de datos compartida en `e2e/fixtures/evidenceEdit.ts`. (SC-002)
- [X] T010 Capturas en celular y computador; tipos, lint y pruebas de los módulos afectados. Sin cambios en el servidor ni en lo que se envía. (FR-008)
- [X] T011 Registro en `specs/README.md`, en la línea base de gobernanza y en el inventario del sistema.

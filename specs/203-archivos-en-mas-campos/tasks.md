# Tareas: Foto o archivo también en criterios de aprendizaje e instrucciones

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #425. Aprobados por el usuario el 2026-11-17: pidió facilitar foto, archivo o texto pegado en todos los campos y buscar mejoras de ese tipo (`spec-approved` y `plan-approved` en #425).

### Pruebas

- [X] T001 Variante compacta: dos botones y sin nota de formatos. (FR-003)
- [X] T002 Instrucciones de recursos: botones, texto añadido debajo y tope de 6.000 caracteres. (FR-003, FR-004)
- [X] T007 Indexación: sin servicio el documento queda sin indexar; con servicio, un fragmento por texto. (FR-006)
- [X] T008 Sugerencias: respuesta sin forma reconocible o IA sin respuesta se informan como servicio no disponible; listas unidas en texto; ruta de herramientas. (FR-007, FR-008, FR-009)

### Implementación

- [X] T003 Subida de criterios con `capture_text` y mensajes. (FR-001, FR-002)
- [X] T004 Variante compacta e instrucciones de recursos y presentaciones. (FR-003, FR-004)
- [X] T005 Formatos y textos en la pantalla de criterios. (FR-001, FR-005)
- [X] T009 Indexación tolerante y aviso 503 en la subida de criterios. (FR-006, FR-007)
- [X] T010 Forma de la respuesta, listas y ruta de IA de las sugerencias. (FR-007, FR-008, FR-009)

### Validación

- [X] T006 Pruebas de captura, recursos, presentaciones y materias; tipos, lint, inventario y gobernanza. (FR-001, FR-002, FR-003, FR-004, FR-005)
- [X] T011 Recorrido real en 390 px y 1280 px: botones compactos, texto leído desde archivo y sugerencias de criterios desde una foto. (FR-001, FR-003, FR-004, FR-006, FR-007, FR-008, FR-009)

## Dependencias

Spec 201 → todo. T001 y T002 → T004. T007 → T009. T008 → T010. T006 y T011 al final.

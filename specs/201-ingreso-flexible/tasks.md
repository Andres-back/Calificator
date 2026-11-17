# Tareas: Llenar campos sin digitar, desde una foto o un archivo

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #422. Aprobados por el usuario el 2026-11-17: pidió reparar el ingreso del texto de referencia y aceptar foto, archivo o texto pegado en variedad de formatos (`spec-approved` y `plan-approved` en #422).

### Pruebas

- [X] T001 Tipo por contenido y rechazo de lo que no se lee. (FR-002, FR-004)
- [X] T002 Word con párrafos y tablas; Excel, CSV y texto con tildes. (FR-002, FR-003)
- [X] T003 PDF con texto sin IA; PDF escaneado hoja por hoja con tope; foto con transcripción literal; sin texto legible. (FR-001, FR-002)
- [X] T004 Componente: cámara y archivo, texto entregado, foto sin texto, archivo grande y fallo del servidor. (FR-004, FR-005)
- [X] T005 El texto nuevo no borra el existente. (FR-006)

### Implementación

- [X] T006 Módulo `captura_texto` y registro del punto de acceso. (FR-001, FR-002, FR-003, FR-004)
- [X] T007 `textCapture.ts` y `TextCaptureButtons.tsx`. (FR-005, FR-006)
- [X] T008 Botones en el campo de lectura, edición simple y por secciones. (FR-007)

### Validación

- [X] T009 Prueba real en local con foto, Word, Excel, texto, PDF escaneado, archivo no admitido y sin sesión. (FR-001, FR-002, FR-003, FR-004)
- [X] T010 Prueba en pantalla a 390 px: foto de la lectura al campo. (FR-005, FR-006, FR-007)
- [X] T011 Pruebas, tipos, lint, inventario y gobernanza. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007)

## Dependencias

T001–T005 → T006–T008. T009–T011 al final.

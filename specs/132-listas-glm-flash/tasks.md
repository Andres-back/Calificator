# Tareas: listas GLM

## Fase 1: Preparación

- [X] T001 Registrar diagnóstico, alcance autorizado e interfaces en `specs/132-listas-glm-flash/{spec,plan,research,data-model}.md` y revisar calidad documental. (FR-001–008)

## Fase 2: Fundamentos

- [X] T002 Escribir primero regresión del lector con perfil y revisión de credencial, selección ausente, respaldo separado y error410 en `backend/tests/unit/test_roster_vision_extractor.py`; RED:7 fallos/2 previas verdes antes del código, GREEN:12 casos. (FR-001, FR-002, FR-007)

## Fase 3: Historia 1

- [X] T003 [US1] Corregir selección y credenciales de perfiles en `backend/app/modules/importacion_estudiantes/vision_service.py`, sin modelo retirado de emergencia ni claves cruzadas. (FR-001, FR-002, FR-007)
- [X] T004 [US1] Documentar publicación GLM aislada/versionada después de integración y pruebas de preservación en `specs/132-listas-glm-flash/quickstart.md`; no fusionar ni publicar sobre binario anterior. (FR-003, FR-006, FR-008)

## Fase 4: Historia 2

- [X] T005 [US2] Añadir regresión y clasificación segura en `backend/app/workers/tasks_roster_import.py` y consumidor; no alterar limpieza, estados ni revisión docente. Integración real de worker verifica fallo y repetición sin crear cuentas. (FR-004, FR-006)
- [X] T006 [US2] Añadir mensajes cerrados y neutral legacy en `frontend/src/modules/materias/{rosterImportErrors.ts,RosterImportDialog.tsx}`, unitarias y E2E celular/escritorio.1033 pruebas frontend/14 recorridos Chromium aprobados. (FR-004, FR-005)

## Fase final: Validación

- [X] T007 Ejecutar suites focalizadas, integración aislada, tipos/lint/build; actualizar propietario061, índice, baseline e inventario y registrar evidencia en `specs/132-listas-glm-flash/quickstart.md`. Regresión completa remota obligatoria como gate separado; no se declara verde antes del resultado. (FR-001–007)
- [X] T008 Ejecutar Converge, revisar privacidad y preparar entrega para PR enlazado a277, sin fusionar; resultados remotos se registran en el PR y son obligatorios antes de declararlo fusionable.8 FR/4 SC/6 aceptaciones/8 principios contrastados, sin brechas de construcción; activación productiva es posterior a integración autorizada. (FR-008)

## Fase 6: Mantenimiento de dependencia ya autorizado

- [X] T009 Incorporar únicamente `fpdf2==2.8.8` en `backend/requirements.txt`, actualización compartida previamente autorizada para131, y ejecutar regresiones de PDF/exportación sin importar el escáner;50 pruebas focalizadas y1542 unitarias pasan con2.8.8. Evidencia en `specs/132-listas-glm-flash/quickstart.md`. (FR-009)

T009 precede a publicación del PR; no cambia la autorización de fusión ni las demás rutas de IA.

## Dependencias

T001→T002→T003; T004 sigueT003. T005→T006 usa el contrato de T003. T007 depende deT004/T006; T008 sigueT007. Se ejecuta secuencialmente para evitar edición simultánea del lector. MVP: US1 restaura configuración; US2 evita culpar a la foto. Ninguna tarea declara activación productiva antes de fusión autorizada.

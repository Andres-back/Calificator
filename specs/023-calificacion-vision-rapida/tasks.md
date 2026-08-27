# Tareas: calificacion visual rapida y terminal

- [x] T001 Congelar rutas de vision y grading en el snapshot del job.
- [x] T002 Aplicar el modelo y credencial correctos por etapa en el orquestador.
- [x] T003 Corregir defaults y migrar solo configuracion institucional no editada.
- [x] T004 Marcar como fallido y reintentable todo job que termine sin nota.
- [x] T005 Agregar pruebas de regresion de enrutamiento, compatibilidad y estado terminal.
- [x] T006 Ejecutar pruebas backend y puertas de calidad aplicables.
- [x] T007 Medir el pipeline corregido con la misma evaluacion e imagen sin persistir datos.

Tras el despliegue se repetira la medicion en produccion como verificacion operativa,
sin convertirla en una dependencia circular del PR.

## Cobertura

- FR-001, FR-002 y FR-003: T001, T002 y T003.
- FR-004 y FR-005: T004 y T005.
- FR-006 y FR-007: T005, T006 y T007.

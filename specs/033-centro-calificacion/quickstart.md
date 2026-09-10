# Validación prevista de 033

Diseño creado el 2026-09-09; ninguna prueba funcional 033 se declara ejecutada. Esta guía se completará con resultados al implementar.

## Análisis documental Specify / Clarify / Plan / Tasks / Analyze

- Contexto activo: specs/033-centro-calificacion. Issue #68 y rama codex/033-centro-calificacion; sin extensiones/hook configurados.
- 4 historias, 19 escenarios de aceptación, 16 requisitos funcionales, 8 criterios de éxito y 22 tareas pendientes. Cobertura de requisitos: 16/16 con tareas; criterios de éxito: 8/8 con validación prevista.
- Checklist de calidad de especificación: 12/12 satisfechos; no sustituye aprobación humana del diseño.
- Aclaración: alcance, datos/identidad, UX, fiabilidad, privacidad, dependencias, casos límite, restricciones y terminología claros. Cero preguntas bloqueantes; validación física de navegadores se registra como pendiente cuando no esté disponible.
- Análisis cruzado final: cero conflictos críticos o requisitos sin tareas. Las tareas de preparación/cierre son transversales; no hay funcionalidades ajenas al alcance. La implementación permanece pendiente en su totalidad.
- Incertidumbres técnicas acotadas: forma final de consultas agrupadas, semántica detallada de predicados de filtros y condición de activación de UI se verifican en T003/T013/T021, preservando contrato y permisos. No se requieren nuevas preferencias del usuario para esos detalles.
- Correcciones incorporadas al diseño: bandeja limitada a seis no sirve para filtro exhaustivo; referencia PQRS pierde componente/version; bandera V2 declarada no controla la pantalla; código antiguo no equivale a rutas activas.
- Siguiente paso: revisión del diseño concreto y aprobación registrada antes de ejecutar T003 en adelante; después Implement y Converge con evidencia funcional.

## Datos controlados

Profesor, estudiante y rol docente de lectura; 30 matriculados y dos materias. Evaluación física, online e histórica sin desglose. Más de seis PQRS, una vinculada a pregunta/version anterior; ilegible, cobertura incompleta, cero real, sin entrega, procesamiento y fallo. Datos sintéticos, sin proveedores pagados.

## Recorridos y aceptación

1. Abrir desde evaluación/materia/bandeja/boletín/monitor y enlaces anteriores; contexto correcto sin repetir materia (SC-001/007).
2. Seleccionar pregunta y página, ampliar y editar allí; solo se descargan archivos del alumno elegido (SC-002/008).
3. Borrador: cambiar pregunta/alumno/filtro/modo, query y atrás/adelante; error y conflicto. Conservar o descartar explícitamente, nunca publicar por guardar (SC-003).
4. Guardar y siguiente conserva orden pese a polling; último alumno indica finalización/pendientes (SC-003).
5. Alertas incluyen todas las PQRS del examen aunque superen seis; separar ajenas, desconocidas, históricas y resueltas. Abrir componente vinculado (SC-006).
6. Cargar paquetes de dos alumnos y revisar otro durante cola. Ensayo sintético 30 y fallo aislado sin duplicados (SC-004).
7. Nota manual, reemplazo, confirmar/publicar con fallos parciales; permisos y vista estudiante sin fuga (SC-007).
8. Cinco resoluciones/ambos temas, zoom 200%, teclado/foco/scroll; teclado virtual y Safari/Brave físicos documentados por separado (SC-005).

## Comandos previstos

Desde frontend: `npm run typecheck`, `npm run lint:strict`, `npm run test:run`, `npm run build`; ejecutar suites E2E afectadas con su configuración. Baselines se actualizan solo tras revisión visual.

Desde backend: `python -m pytest tests/unit/test_calificaciones_revision_workspace.py tests/integration/test_explainable_grading_pipeline.py -q` con PostgreSQL de pruebas. Ampliar casos pertinentes de PQRS/proyección/permisos en esas suites.

Desde raíz: `python scripts/build_system_inventory.py --write`, `python scripts/build_system_inventory.py --check`, `git diff --check`. CI obligatorio antes del merge.

## Cierre futuro

Verificar centro servido y compatibilidad real; actualizar propietarios/inventario, registrar resultados y Converge. Reversión por commit si hay regresión. No activar investigación ni atribuir ahorro/latencia sin medición.

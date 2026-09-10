# Validación prevista de 033

Diseño creado y aprobado el 2026-09-09. El apartado histórico siguiente describe la planificación; los resultados de implementación se registran al final.

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

Baseline de código: main 98159a2, diseño 54125e4. Docker disponible el 2026-09-09 con PostgreSQL de pruebas saludable. Los cambios se realizan en codex/033-centro-calificacion, sin llamadas a modelos ni escrituras en producción.

Fixture reutilizable: backend/tests/fixtures/grading_batch.py, synthetic_review_rows: 30 matriculados, ocho reclamos, alumno sin entrega, procesamiento sin nota, cero publicado y legado con resumen desconocido. Se amplía en las pruebas de integración/UI para evidencia física y respuestas online; esos recorridos aún no se declaran verificados.

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

## Resultados locales de implementación

- Proyección real PostgreSQL: 30 alumnos, ocho PQRS, paginación, cero/pendiente/legado y seis consultas agrupadas. Suite focalizada backend: 39 pruebas aprobadas antes de añadir la regresión de lectura sola. Esquema aislado y contenedor de pruebas sin datos reales.
- Frontend: 324 pruebas unitarias aprobadas con `npx vitest run --maxWorkers=2`. TypeScript y lint estricto aprobados; construcción y suite completa final se registrarán al cerrar.
- Chromium: 17 recorridos de explainable-grading aprobados, incluyendo cinco resoluciones y ambos temas, rueda sobre revisión, pregunta 20, 409/borrador/query/atrás/recarga, dos paquetes con fallo y reintento, lectura sola, estudiante denegado, PQRS versionada y publicación parcial sin repetir éxitos.
- Accesibilidad: siete pruebas aprobadas; cinco corresponden a revisión de calificaciones con nombres, foco, área táctil y desbordamiento. No equivalen a auditoría WCAG completa.
- Dos fallos detectados y corregidos durante pruebas: el monitor flotante tapaba el segundo envío móvil; ahora es contextual dentro del centro. Guardar y avanzar podía activar el bloqueo de borrador antes de actualizar React; se limpia la referencia sincrónica solo tras persistencia.
- Revisión visual del agente: capturas locales de 1366 claro y 390 oscuro, ajustadas para evitar respuestas en columnas demasiado estrechas. Resto de capturas y revisión humana permanecen por completar; Safari/Brave físicos no se declaran probados.
- Retiro seguro: búsqueda `rg` de CalificacionesPage, CalificarFotoPage, SalonPage y sus tours no encontró consumidores activos fuera de sus propios archivos/exportaciones. Se eliminaron esas tres páginas; se conserva boletinTour, APIs de salón/lote y gradingFlowModel (consumido por gradebookModel).
- Se elimina GRADING_REVIEW_WORKSPACE_V2_ENABLED del backend y su declaración frontend sin consumidores. El centro se activa por ruta y permisos, no por una bandera inerte. Las banderas de investigación, RAG, recuperación y configuración de modelos no cambian. Reversión por commit; no requiere migración ni borra información.
- Inventario regenerado: 524 superficies. Sin escrituras en producción ni llamadas a proveedores de IA.

## Cierre de comprobaciones locales

- Backend amplio: 692 aprobadas, una omitida (smoke de BD requiere entorno migrado), una prueba falló por el mock antiguo de crear_incidencia. Corregido su contrato; repetición de las suites afectadas, incluyendo permiso docente de solo lectura: 48/48 aprobadas. El CI deberá ejecutar además migraciones y smoke.
- Frontend amplio final: 323 aprobadas y una expectativa de enlace antiguo fallida en MateriaVistaGeneral. Actualizada al centro canónico; repetición de MateriaVistaGeneral y GradingJobMonitor: 10/10 aprobadas. TypeScript/lint sin errores. Build de producción aprobado, con advertencia de chunk global >500 kB ya fuera del módulo de revisión.
- E2E amplio: 57/58 aprobadas; la prueba restante esperaba encontrar las pestañas de materia después de salir al centro. Actualizada para verificar destino y volver a materia; repetición de esa prueba, guardar/terminar sesión y retorno a alumno/pregunta tras cargar otro: 3/3 aprobadas. En total hay 59 casos E2E tras añadir el retorno contextual; no se afirma un único pase completo posterior a todas las correcciones.
- Capturas visuales regeneradas en diez combinaciones resolución/tema, tras revisar la distribución local; la actualización de baseline no sustituye la revisión humana solicitada al usuario. Evidencias en frontend/e2e/visual/__screenshots__. Accesibilidad 7/7 aprobada.
- Converge: cuatro hallazgos parciales, cero cambios en fórmulas o modelos: retorno a revisión tras carga (HIGH), contador de ajustes por sesión (MEDIUM), GradingProgress huérfano (LOW) y cierre humano/CI (HIGH). T023–T025 implementadas y verificadas. Queda el control de entrega T026; no se declara convergencia completa ni despliegue.
- GradingProgress se retiró tras búsqueda global sin consumidores. Es recuperable en Git junto a las tres páginas antiguas; no se borraron archivos de entregas ni tablas.
- Pendiente de promoción: aprobación humana de capturas (T019), CI remoto/PR y cierre documental (T022/T026). El proceso de investigación sigue desactivado, sin afirmar reducción de tiempos antes de medirla.

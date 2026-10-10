# Validación 093

Implementación y verificación local realizadas el 2026-10-10 en `E:/tesis/.worktrees/rag-preflight`, rama `codex/093-recursos-vista-docente`. Solo datos sintéticos; sin acceso a producción, claves reales ni cambios en registros académicos. Fusión y despliegue requieren autorización separada y CI verde.

## Cambios y límites

- Política pura de criterios para los 16 tipos evaluables: separa logro/evidencia/regla de preguntas y soluciones; comprueba nombres, referencias, niveles y pesos antes de convertir. Conserva intención docente explícita; un conflicto pide corrección y no reemplaza criterios silenciosamente.
- Las propuestas inválidas se conservan como borradores corregibles, con advertencia; no regeneran preguntas. Editar únicamente criterios no reconstruye la grilla. Un apoyo no crea evaluación ni exige rúbrica. Un vínculo existente se devuelve sin validación retrospectiva.
- La detección de copia/soluciones es estructural y literal, no una certificación semántica. El docente debe revisar pertinencia, niveles y posibles filtraciones antes de publicar. Sin nuevas llamadas de IA ni cambios del evaluador o fórmula de nota.
- Reclamos vacíos no ocupan una sección ni muestran contador cero. Inconsistencias/errores conservan reintento. Las notas pendientes siguen visibles y aprovechan todo el ancho.
- Asistencia compacta con controles ≥44×44, observaciones desplegables e indicador de texto existente. No cambia la cola, API, estados ni permisos.
- Proyección pública: conserva criterios y elimina metadatos internos `_xcalificator`/`_alineacion`, además del filtrado de soluciones existente. No cambia persistencia.

## Backend y persistencia

Python 3.11 en contenedor y PostgreSQL nuevo `xcalificator-spec093-db` (`pgvector/pgvector:pg16`, enlace exclusivo `127.0.0.1:55493`). Base `spec093_test`, sin volumen de producción. Migraciones existentes aplicadas con `alembic upgrade head`; esta feature no añade migraciones.

Con `DATABASE_URL` y `SPEC085_TEST_DATABASE_URL` apuntando únicamente a esa base, montaje de backend en lectura y `python -m pytest -p no:cacheprovider`:

- `tests/integration/test_attendance_autosave.py`.
- Unitarias: `test_material_evaluation_adapter.py`, `test_material_conversion_service.py`, `test_herramientas_content_quality.py`, `test_material_dba_alignment.py`, `test_material_classroom_assignment.py`, `test_calificacion_breakdown.py`, `test_grading_component_consensus.py`, `test_evaluation_lifecycle_actions.py`.

Resultado: **145 pruebas pasaron**, incluidas tres de persistencia/concurrencia/atomicidad. Conservan una nota y evidencia histórica sintéticas, registros omitidos y ausencia de duplicados. Matriz del adaptador: 16 tipos/modalidades, claves, escala, fuente docente y rechazo 422 sin escrituras.

Después se reforzó la coherencia de criterios con porcentajes y puntajes simultáneos: rechaza valores inválidos o proporciones contradictorias y permite cambiar escala por porcentaje. Adaptador/calidad: **89 pruebas pasaron** en Python 3.13 local; **8 pruebas focalizadas pasaron** en Python 3.11 (criterios inválidos y doble escala). Ruff F401/F821/F822/F823/F841 sin errores.

La proyección pública se probó en `test_material_classroom_assignment.py`, consumidor real del recurso genérico, en lugar de duplicarla en Xali. Desglose, consenso y ciclo de vida pasaron sin cambiar puntuación.

## Frontend

```powershell
npm run test:run -- src/modules/dashboard/DashboardPage.test.tsx src/modules/materias/attendanceModel.test.ts src/modules/materias/useAttendanceAutosave.test.tsx
npm run test:run -- src/modules/herramientas/MaterialContentEditor.test.tsx src/modules/herramientas/StudentResourcePage.test.tsx
npm run typecheck
npm run lint:strict
npm run build
```

**28 + 8 pruebas pasaron**; TypeScript/lint sin errores y build correcto. Bandeja compacta/completa cubre cero, inconsistencias, aparición/desaparición tras recarga y fallo. Editor conserva referencias numéricas ocultas y controles de evidencia/regla. Sin dependencias nuevas.

## Navegadores y evidencia visual

```powershell
npx playwright test --config=e2e/mock/playwright.config.ts grading-review.mock.spec.ts --grep 'flujo docente progresivo|asistencia recupera|asistencia identifica homónimos' --workers=1
npx playwright test --config=e2e/mock/playwright.config.ts grading-review.mock.spec.ts --grep 'flujo docente progresivo 390px light|asistencia recupera' --browser=webkit --workers=1
```

Ejecutados por grupos focalizados: Chromium **360/390/768/1280 px, claro/oscuro**, recuperación móvil, dos casos de nombres largos/homónimos y dos WebKit. Todos los casos finales pasaron. Se corrigieron expectativas para abrir observaciones tras recarga y respetar tres columnas existentes del boletín en tablet; no cambió el boletín.

Medición a 1280×800: primeras ocho filas dentro de 600 px y cuatro estados ≥44×44. Búsqueda por correo entre 100 alumnos, sin coincidencias, marcado masivo, observación colapsada, recarga, error/reintento y reporte conservados. Homónimos distinguibles por correo y nombre largo completo. Apertura por teclado y acceso al alumno 100 comprobados; sin desbordamiento horizontal.

Capturas sintéticas, no versionadas, en `output/playwright/teacher-flow/`: `attendance-1280-light.png`, `attendance-390-dark.png`, variantes y `attendance-long-names-360.png`/`attendance-long-names-1280.png`. Inspección visual de escritorio y celular realizada. WebKit no sustituye una prueba física Android/iPhone o del teclado virtual; se recomienda comprobación en dispositivos antes del piloto.

## Contenedores y gobernanza

`docker build --target test -t xcalificator-spec093-backend-test ./backend` y `docker build -f frontend/Dockerfile -t xcalificator-spec093-web .`: correctos. Advertencia existente no bloqueante de chunk frontend >500 kB; no se ocultó.

Inventario regenerado con `python scripts/build_system_inventory.py --write` (573 superficies). Se añadió 093 a la lista explícita del baseline; sin relajar controles ni editar CI. CI remoto completo obligatorio antes de merge; pruebas locales no equivalen a despliegue.

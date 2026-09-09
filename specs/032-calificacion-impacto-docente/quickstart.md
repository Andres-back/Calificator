# Validación propuesta 032

Guía para ejecución después de aprobación e implementación. No representa pruebas ya realizadas.

## Preparación

Usar checkout de codex/032-calificacion-impacto-docente, resolver primero base 031/#64 y arrancar stack local mediante las instrucciones vigentes del repositorio. Configurar base de pruebas PostgreSQL y Redis aislados, sin conexión a datos productivos. Aplicar migración aditiva allí y comprobar lectura de fixtures históricos.

Crear datos sintéticos mediante fixtures: tres docentes, 30 estudiantes, una evaluación abierta, otra objetiva y evidencia de hasta 10 fotos/20 páginas. Proveedores simulados controlan demoras/fallos; no claves reales ni respuestas estudiantiles en Git. Las referencias pedagógicas se preparan antes de comparar.

## Comandos existentes de verificación

Desde frontend, con dependencias del lockfile instaladas:

~~~powershell
npm run typecheck
npm run lint
npm run test:run
npm run build
npm run test:e2e -- explainable-grading.spec.ts
npm run test:a11y
npm run test:visual
~~~

Desde backend, con entorno de pruebas instalado y configuración aislada:

~~~powershell
python -m pytest tests/unit/test_tasks_grading.py tests/unit/test_vision_extractor.py tests/unit/test_analytics_events.py
python -m pytest tests/integration/test_grading_batch_30.py tests/integration/test_ai_job_leases.py tests/integration/test_explainable_grading_pipeline.py
~~~

Extender esas suites y las pruebas existentes de desglose/impacto; seleccionar las afectadas por incremento. No ejecutar todos los benchmarks en cada edición documental. CI completo aplicable antes de PR. Fallos por infraestructura se distinguen de pruebas aprobadas.

## Escenarios de aceptación

| Caso | Ejecución controlada | Resultado exigido |
|---|---|---|
| Continuidad | Pregunta empieza en hoja 1 y termina en 2; otra distinta en 3 | Una respuesta completa por pregunta, referencias correctas y una nota |
| Entrada extensa | Respuesta relevante después del carácter 5.000 y partición forzada por presupuesto | Se evalúa el final; sin truncado ni omisión silenciosa |
| Extracción sin soluciones | Espiar payload de visión con claves esperadas distintas a manuscrito | Ninguna clave anidada enviada; transcripción conserva lo escrito |
| Reintento | Fallar tras lectura, reintentar, repetir petición y reiniciar trabajador | No repite lectura compatible ni duplica nota; usa claim vigente |
| Prioridad humana | Ajustar/publicar mientras termina un intento antiguo | Resultado tardío no sobrescribe decisión docente |
| Lote | 30 imágenes asociadas a 30 alumnos, un fallo, tres profesores concurrentes | Cada identidad/estado visible, fallido recuperable y éxitos sin repetirse |
| Revisión | Editar pregunta intermedia, simular 409/fallo red, guardar/siguiente | Borrador preservado, fórmula e historial correctos; no publicación implícita |
| Visor | Abrir hoja 17 de PDF de 20, alternar pregunta/evidencia y descargar | Hoja correcta, documento completo, misma posición y borrador |
| Medición | Intervalos conocidos de preparación/revisión/corrección/cierre y pausa | Diferencia <=1 s; preparación grupal una vez; espera IA aparte |
| Concurrencia temporal | Dos pestañas, traspaso, replay, cierre abrupto, lectura de papel sin clics | Sin doble conteo ni pausa inferida; incertidumbre explícita |
| Históricos | Abrir registros sin campos nuevos y nota cero manual auténtica | No pérdida; cero real distinto de pendiente; tiempo ausente no es cero |
| Calidad | Paráfrasis válida, argumento parcial, error conceptual, blanco, ilegible | Criterio explícito y acción de mejora; revisión humana en ambigüedad |
| Fuentes | Material pertinente, sin material y material de otro docente | Procedencia/versiones o ausencia; ninguna filtración |
| Estudio | Importar/repetir lote, fila inválida, revisión, exportar sintéticos | Atomicidad, trazabilidad e indicadores reproducibles |
| Métricas | Ahorro negativo, pareja ausente, categorías Kappa fijas y degeneradas | No recortes; faltantes/degenerados declarados no disponibles |
| Permisos | Alumno, docente ajeno, admin sin concesión y concesión revocada | Sin acceso a sesiones/evidencia/conjunto fuera de ámbito |

Validación visual: 360×800, 390×844, 768×1024, 1366×768 y 1920×1080, claro/oscuro; teclado, objetivos táctiles y scroll en panel de revisión. Usar Chromium y WebKit; prueba manual Safari/iPhone/Brave antes de afirmar compatibilidad física, la emulación no la demuestra.

## Medición de velocidad y calidad

Después de regresiones simuladas, una prueba real acotada requiere autorización para costo/datos. Registrar tamaño/páginas, modelo/configuración, carga/concurrencia, cold/warm, cola/capacidad/etapas y tiempo hasta primer/todos los resultados. No confundir aceptación HTTP rápida con nota terminada ni latencia IA con tiempo humano.

Comparar contra condiciones de 031; publicar mediana/p95 solo con tamaño de muestra y fallos explícitos. No garantizar que <45 s o <90 s se cumplan sin medir. Los objetivos de tesis 40 % y Kappa 0,75 se evaluarán con protocolo y muestra autorizados, no con fixtures.

## Evidencia y reversión

Guardar resultados de pruebas sin secretos ni datos reales; enlazar ejecución en tasks.md/PR. Probar flags apagados y encendidos, lectura de históricos y rollback funcional preservando mediciones. No ejecutar downgrade destructivo ni publicar para validar.

Antes del piloto real faltan institución, unidad de análisis, muestra, instrumentos/categorías, autorizaciones y retención. El sistema debe impedir activación real si faltan aunque todas las pruebas de software pasen.

## Registro incremental 2026-09-09 — recuperación US1

- `python -m pytest backend/tests/unit/test_worker_queue_routing.py backend/tests/unit/test_tasks_grading.py backend/tests/unit/test_vision_extractor.py backend/tests/unit/test_photo_grading_failures.py -q`: 80 aprobadas.
- `python -m pytest backend/tests/unit/test_tasks_grading.py -q`: 20 aprobadas, incluida reutilización de extracción por huella compatible.
- `python -m pytest backend/tests/integration/test_ai_job_leases.py -q` con PostgreSQL local y esquema efímero: 1 aprobada; ejercitó 30 evidencias repartidas entre tres docentes, claim concurrente, lease, recuperación, un fallo aislado y rechazo de escritor obsoleto.
- `npm run test:run -- src/modules/calificaciones/GradingJobMonitor.test.tsx`: 7 aprobadas, incluida recuperación desde servidor sin almacenamiento local.
- `npm run typecheck`: aprobado.

No se usaron proveedores pagados, datos reales ni producción. Continúa pendiente la partición forzada de una entrada que exceda contexto (T010); no se afirma velocidad real del proveedor con esta prueba de infraestructura.

### Cierre posterior de T010

- Se eliminó el último corte de persistencia y el prompt conserva contenido situado después del carácter 5.000.
- El camino habitual no cambia. Solo si la entrada supera `PHOTO_GRADING_CONTEXT_BUDGET_CHARS` se divide por pregunta, se valora y verifica cada parte, y se consolida una vez por clave.
- La partición conserva la respuesta completa, marca ilegibilidad/ambigüedad, mantiene los puntajes de cada pregunta y registra `input_partition_count`.
- `python -m pytest backend/tests/unit/test_photo_grading_failures.py backend/tests/unit/test_vision_extractor.py -q`: 48 aprobadas, incluida consolidación extremo a extremo sin proveedor externo.

## Registro incremental 2026-09-09 — base temporal US4

- `python -m pytest backend/tests/unit/test_analytics_events.py -q`: 20 aprobadas; conserva intervalos de 5 s y 3.700 s, evita duplicar una segunda apertura y declara un cierre incompleto.
- La integración PostgreSQL efímera anterior se amplió con upgrade/downgrade de `202609090001_analytics_work_sessions.py`: aprobada.
- La migración es aditiva, no reconstruye tiempos históricos y no depende de una extensión de generación UUID.
- `npm run test:run -- src/lib/analytics.test.ts`: 10 aprobadas; los eventos individuales ahora incluyen `calificacion_id` canónico.
- `npm run typecheck`: aprobado.

En este punto la tabla existía y su captura opt-in continuaba apagada; el protocolo y el cronómetro todavía estaban pendientes antes del incremento siguiente.

## Registro incremental 2026-09-09 — protocolo temporal US4

- `python -m pytest backend/tests/integration/test_ai_job_leases.py -q` con PostgreSQL local y esquema efímero: 1 aprobada. Además del lote de 30 y tres docentes, comprobó sesión única por actor, dos comandos concurrentes con una sola escritura, replay sin doble conteo, propiedad privada, traspaso explícito, pausa/reanudación, hueco incierto de 60 s y encadenamiento al límite.
- `npm run test:run -- src/lib/analytics.test.ts`: 13 aprobadas; incluye reloj monotónico durante lectura sin clics, aceptación voluntaria y comando de traspaso versionado.
- `npm run typecheck`: aprobado.
- El control visual separa condición manual/asistida, fases, pausa, finalización, tiempo confirmado e incertidumbre. Se recupera desde servidor y permite tomar control en otro dispositivo. Backend y frontend permanecen apagados por flags independientes; no se recopilaron tiempos reales ni se activó un estudio.

## Registro incremental 2026-09-09 — ahorro observado US4

- `python -m pytest backend/tests/unit/test_analytics_events.py -q`: 22 aprobadas; el escenario añadido exige pares manual/asistido, conserva un resultado negativo de −20 % y comprueba el ámbito del ledger de IA.
- `npm run typecheck`: aprobado.
- El dashboard deja de presentar la constante histórica de 180 segundos como evidencia: muestra ahorro observado solo con unidades comparables, cobertura e incertidumbre; de lo contrario explica por qué no está disponible. El campo estimado legado continúa separado para compatibilidad temporal.
- El ledger `/analytics/ai-quality/usage` exige permiso modular y, para profesores, filtra por evaluaciones/calificaciones propias. No se consultaron datos de producción.

## Registro incremental 2026-09-09 — primera sugerencia US4

- `python -m pytest backend/tests/unit/test_breakdown_history.py backend/tests/unit/test_analytics_events.py -q`: 24 aprobadas.
- `npm run test:run -- src/lib/analytics.test.ts src/modules/calificaciones/components/GradeBreakdownHistory.test.tsx`: 14 aprobadas.
- `npm run typecheck`: aprobado.
- Cada versión automática registra `intento_actual`, pero hereda una referencia inmutable a `primera_sugerencia`; los ajustes docentes preservan esa procedencia. El historial identifica visualmente la primera sugerencia sin confundirla con la nota vigente o publicada.

## Registro incremental 2026-09-09 — mesa de revisión US2

- El visor autorizado renderiza una hoja concreta (1–20) y reutiliza el PNG por huella del archivo; la prueba unitaria cubre PDF de 20 páginas, límite real, caché y aislamiento entre estudiantes.
- El editor conserva borradores ante 409/error, ofrece recarga explícita y solo avanza después de guardar una versión correctamente. En el último alumno muestra “Revisión completada” y aclara que no publicó la nota.
- Las hojas citadas por cada respuesta son controles directos al visor. Se prepararon verificaciones en 360×800, 390×844, 768×1024, 1366×768 y 1920×1080, claro/oscuro, teclado, scroll y objetivos táctiles.
- Safari y Brave físicos quedan pendientes de validación manual en dispositivos reales; Playwright Chromium no sustituye esas comprobaciones.
- `npm run test:a11y -- grading-review.a11y.spec.ts`: 5 aprobadas en las cinco resoluciones. Las 10 referencias visuales claro/oscuro fueron generadas con Playwright Chromium.

## Registro incremental 2026-09-09 — calidad y contexto US3

- `python -m pytest backend/tests/integration/test_explainable_grading_pipeline.py backend/tests/unit/test_breakdown_history.py -q`: 13 aprobadas. Los casos sintéticos cubren paráfrasis, interpretación válida, argumento parcial, blanco e ilegible frente a una referencia docente explícita.
- `npm test -- --run src/modules/calificaciones/components/GradeBreakdown.test.tsx`: 6 aprobadas; `npm run typecheck`: aprobado.
- La razón del puntaje y la orientación de mejora son campos distintos. La orientación no altera la fórmula y las preguntas conservan el total sin sumar por segunda vez DBA o rúbrica.
- RAG se recupera después de extraer las respuestas, una vez por trabajo, y se asigna localmente por pregunta. La consulta exige coincidencia de materia y propietario tanto en el fragmento como en su fuente; el `JOIN` excluye fuentes retiradas.
- El docente puede inspeccionar título, versión y fragmento autorizado o la ausencia explícita. El contrato estudiantil no entrega fragmentos privados del docente.
- La interfaz distingue evidencia extraída, valoración objetiva/docente/asistida y comprobación. “Coincidencia” no se presenta como exactitud validada ni como independencia de proveedores.

No se llamó a proveedores externos ni se usaron datos reales. Estos ensayos validan reglas del sistema; no demuestran todavía concordancia pedagógica ni desempeño real del modelo.

## Registro incremental 2026-09-09 — estudio autorizado US5

- Se añadieron `impacto_studies` e `impacto_observations` mediante migración aditiva, verificada con upgrade/downgrade en la base local aislada `xcalificator_spec032_test`: 1 prueba aprobada.
- El módulo permanece apagado por `IMPACT_STUDY_ENABLED=false`. La disponibilidad, el rol administrador, el permiso modular y una concesión vigente se comprueban en servidor; ser administrador principal no evita la concesión del conjunto.
- Todo estudio inicia sintético. La activación real exige protocolo completo, referencia de autorización, retención y concesión explícita de alcance real. La interfaz no ofrece activación real accidental.
- Las importaciones validan máximo 1.000 filas y 5 MiB, digest, instrumento, participantes y revisiones. Un replay devuelve el resultado original aun si la versión avanzó; no crea una observación nueva.
- Exportación y visor omiten nombres, correos, evidencia académica y mapa de identidades. Kappa usa solo referencia independiente no expuesta; ahorro negativo, faltantes y distribuciones degeneradas permanecen visibles.
- La retención desacopla y elimina únicamente filas de `impacto_observations`, registra actor/motivo/conteo y declara que no modificó registros académicos.
- `python -m pytest tests/integration/test_explainable_grading_pipeline.py -q`: 23 aprobadas en contenedor local, incluido el ámbito exclusivo del docente participante.
- `npm run typecheck`: aprobado. Dos E2E de permisos y métricas del estudio: 2 aprobados.

No se activó un estudio, no se incorporaron docentes, no se usaron datos reales, producción ni proveedores externos.

## Cierre de validación 2026-09-09

- Frontend: `npm run typecheck`, `npm run lint:strict`, `npm run test:run` (65 archivos, 323 pruebas), `npm run build` y `npm audit --audit-level=moderate --omit=dev` aprobados; 0 vulnerabilidades reportadas por npm audit.
- Backend: 622 pruebas unitarias y 61 pruebas de integración aprobadas. La integración se ejecutó sobre PostgreSQL local aislado después de aplicar la cadena completa de migraciones hasta `202609090002`.
- Migraciones: upgrade/downgrade de `analytics_work_sessions` e `impacto_studies`/`impacto_observations` aprobados sin datos reales. La reversión funcional también se comprobó dejando los cuatro flags nuevos apagados por defecto; no se ejecutó downgrade destructivo sobre datos persistentes.
- E2E: los 50 escenarios del conjunto completo aprobaron individualmente. La primera ejecución concurrente cerró 49/50 por un único timeout de arranque de Vite en el caso docente 360x800; la matriz responsive se repitió secuencialmente y aprobó 23/23, incluido ese caso en 17,9 s.
- Accesibilidad/visual: 5 resoluciones y 10 referencias claro/oscuro aprobadas en Chromium. Safari/iPhone y Brave físicos continúan como validación manual previa al piloto; no se afirma compatibilidad física basándose solo en emulación.
- Empaquetado: `docker compose --profile production config --quiet`, imagen backend y web de producción aprobados. El inventario se regeneró con 523 superficies.

No se ejecutaron benchmarks con proveedores reales, llamadas pagadas, producción ni datos estudiantiles. Los objetivos de latencia, ahorro del 40 % y Kappa de 0,75 siguen siendo hipótesis por contrastar en un piloto institucional autorizado.

# Validación rápida: Criterios de aprendizaje

## Preparación

1. Aplicar migraciones en una base de datos de prueba con registros DBA, evaluaciones, blueprints y calificaciones existentes.
2. Usar una instancia canary aislada con materias sintéticas. Las banderas actuales son globales por instancia, no segmentables por materia; la instancia de control debe permanecer desactivada.
3. Usar archivos sintéticos sin datos de estudiantes.

## Escenario manual sin IA

1. Entrar como profesor a una materia y abrir “Criterios de aprendizaje”.
2. Continuar sin material ni estándar oficial.
3. Definir intención, crear dos criterios, niveles y pesos que sumen 100 %.
4. Aprobar y aplicar a una evaluación.
5. Confirmar que el blueprint guarda el snapshot y que el estudiante no ve fuentes privadas.

## Escenario asistido desde material

1. Crear un conjunto y cargar dos fotografías ordenadas de un libro más una instrucción docente.
2. Solicitar propuesta y continuar navegando.
3. Ver estado del job hasta finalizar; comprobar una sola versión y una sola propuesta aun tras reintentar.
4. Revisar referencias por página, corregir un criterio, ajustar niveles/pesos y aprobar.
5. Aplicar a un recurso evaluativo y a una evaluación; comprobar que ambos aparecen en la materia.

## Historial e inmutabilidad

1. Calificar una entrega con la versión aprobada y abrir el desglose por respuesta.
2. Ver evidencia, criterio, máximo, otorgado y explicación; la suma debe igualar la nota final.
3. Editar el conjunto: debe crearse una versión nueva, sin modificar evaluación, desglose o nota anteriores.
4. Archivar el conjunto: los históricos siguen visibles.

## Permisos y privacidad

1. Profesor ajeno, estudiante y usuario sin permiso no pueden listar, abrir, descargar ni editar fuentes privadas.
2. Una fuente marcada visible solo aparece al estudiante cuando el recurso/evaluación correspondiente se asigna.
3. Logs, errores y eventos no contienen texto del documento, imágenes, claves ni URLs privadas reutilizables.

## Compatibilidad

1. Con la bandera desactivada, la ruta y contratos DBA actuales siguen funcionando.
2. `/dba` redirige a la experiencia canónica cuando la bandera está activa.
3. Evaluaciones sin `criterios_aprendizaje_version_id` se crean, generan y califican como antes.
4. Datos DBA personalizados se pueden seleccionar como estándares/importar sin duplicarlos ni perderlos.
5. Ejecutar dos veces el backfill: la segunda ejecución no crea versiones, aplicaciones ni eventos adicionales.
6. Comparar antes/después una evaluación publicada/cerrada con nota, desglose y PQRS: UUID, fórmula, puntajes y visibilidad permanecen iguales.

## Rendimiento y UX

1. Guardado manual p95 menor a 500 ms en entorno controlado.
2. Aceptación de propuesta asíncrona menor a 2 s y navegación libre durante el job.
3. Validar claro/oscuro y tamaños 360, 390, 768, 1366 y 1920 px.
4. Confirmar que rueda, gesto táctil y teclado desplazan todo el editor sin áreas bloqueadas.

## Automatización mínima

- Backend: modelos, transición de estados, idempotencia, autorización, compatibilidad, migración y adaptador a blueprint/desglose.
- Backend P0: matriz real `401/403/404/dueño/admin`, aislamiento RAG y versión v1 aplicada → edición v2 sin cambio en históricos.
- Frontend: editor manual/asistido, pesos, estados, alias de ruta, permisos y selectores de evaluación/recurso.
- E2E: manual sin IA, multipágina asistido, nueva versión inmutable y estudiante sin acceso.
- Calidad: Ruff, pytest focal/completo aplicable, TypeScript, ESLint, Vitest, Playwright focal, build y gobernanza Spec Kit.

Comandos previstos desde la raíz del repositorio:

```powershell
docker compose exec backend alembic upgrade head
docker compose exec backend pytest tests/unit tests/integration -q
docker compose exec backend ruff check app tests
npm --prefix frontend run typecheck
npm --prefix frontend run lint
npm --prefix frontend run test:run
npm --prefix frontend run build
npm --prefix frontend run test:e2e -- --grep "criterios de aprendizaje"
python tests/spec_governance/check_spec_governance.py --base-ref origin/main --head-ref HEAD
python tests/spec_governance/generate_system_inventory.py --check
```

Resultado esperado: todos los comandos finalizan en verde; el segundo backfill informa cero cambios; no varían notas históricas; y los escenarios manual, asistido, privacidad y responsividad cumplen este documento.

## Resultado focal: navegación y scroll (2026-09-16)

Alcance autorizado por el usuario: T072–T074, exclusivamente corrección transversal de frontend. La lista de integridad conserva sus 24 pendientes; no se declara completa la especificación 042 ni se autoriza producción con estos resultados.

- `vitest run` sobre `useBodyScrollLock`, `P2Accessibility`, `AppShell`, `RevisionGuide` y `GenerationWizard`: **35 pruebas verdes en 5 archivos**, 15,12 s. Incluye cierres en ambos órdenes, desmontaje del panel con diálogo abierto después, StrictMode, cambios de media query, navegación externa y paso del menú a escritorio.
- `tsc --noEmit`: código de salida 0 sobre el frontend actual.
- ESLint con `--max-warnings=0` sobre los ocho archivos del parche: código de salida 0.
- `git diff --check`: sin errores de whitespace; avisos de normalización CRLF preexistentes en dos archivos backend ajenos a este parche.
- Playwright CLI, Chromium local **390×844**: ensayo aislado montando los componentes reales `Modal` y `useBodyScrollLock`, con diálogo abierto después del panel. Al desmontar ambos, `overflow` y `position` regresan a sus valores originales vacíos, quedan cero diálogos y una rueda de 500 px desplaza `window.scrollY` a 500. Importación del hook desde la misma URL que utiliza Modal para evitar duplicar instancias por HMR de Vite.
- Playwright CLI, Chromium local **1366×768**: `RevisionGuide` real con 20 preguntas dentro de un contenedor principal desplazable. Rueda directamente sobre las respuestas: el principal avanza 600 px; la guía mantiene `overflow-y: visible` y `scrollTop: 0`.

Los ensayos del navegador no crearon archivos ni entidades del producto y se descartaron recargando la página. Se reutilizaron archivos existentes para código y pruebas. No se ejecutó esta comprobación en producción, Brave, iPhone físico ni todos los recorridos de 042; tampoco se midió latencia de IA ni se alteró la fórmula, cola, persistencia o publicación de notas.

## Resultado focal: simplificación guiada (2026-09-27)

Alcance autorizado por el usuario: T075–T081. Esta mejora reorganiza la entrada y edición de criterios sin cambiar contratos backend, registros existentes, fórmula de calificación, publicación ni cola de trabajos. La lista de integridad conserva sus pendientes como puerta de revisión de la especificación integral 042.

- Entrada principal unificada como **«Definir qué voy a evaluar»**, con tres decisiones: material, descripción manual o reutilización de una versión aprobada.
- Tarjetas centradas primero en nombre, evidencia y descripción; pesos, fuentes y niveles quedan en configuración avanzada plegable.
- Distribución automática exacta de pesos: al agregar, duplicar o quitar criterios la suma queda en 100 %, incluido el caso de tres criterios (`33.33 + 33.33 + 33.34`).
- El selector de evaluación muestra título, versión, estado, criterios y pesos antes de aplicar una versión, además de explicar que el vínculo con preguntas será propuesto y revisable.
- En el editor por respuesta, bajar `1/1` a `0.7/1` cambia el estado a **parcial** y actualiza la vista previa de la nota sin confirmar ni publicar automáticamente.
- Ayuda de primera visita reutilizable y botón permanente **«Ver guía»**.
- Vitest focal: **12 pruebas verdes en 5 archivos**.
- TypeScript y build de producción (`tsc --noEmit && vite build`): código de salida 0.
- ESLint focal sobre 11 archivos modificados: código de salida 0 con `--max-warnings=0`.
- Playwright real en Chromium **390×844**: inicia sesión como docente, abre la ruta canónica, muestra las tres decisiones y confirma ausencia de desbordamiento horizontal; **1 prueba verde**.
- Pytest focal del backend: **26 pruebas verdes**, incluidas migración, modelos, autorización, fuentes, generación, contratos API, aplicación a evaluaciones/recursos y desglose.
- Ruff focal del dominio backend, worker, servicio documental y pruebas: sin hallazgos.
- `git diff --check`: sin errores de whitespace; solo avisos de normalización CRLF preexistentes en dos archivos backend ajenos a este alcance.

No se probaron producción, Brave ni un iPhone físico en este bloque, y no se declara completa la especificación 042 fuera de las tareas T075–T081.

## Integración con `main` actual (2026-09-27)

La rama incorporó 63 commits posteriores de `main`. Se resolvieron 13 conflictos conservando como autoridad la fórmula, estados, visión, importación de estudiantes, proveedores y navegación por rol de `main`; criterios permanece aditivo y `CRITERIA_GRADING_AUTHORITY` continúa desactivado.

- Pytest focal posterior a la integración: **95 pruebas verdes** de desglose, persistencia, autorización, configuración IA, visión, importación visual y criterios.
- Vitest focal posterior a la integración: **34 pruebas verdes en 8 archivos** sobre navegación por rol, móvil, accesibilidad, criterios y ajuste parcial de nota.
- Ruff de los ocho conflictos backend: verde.
- ESLint y TypeScript de navegación/rutas: verdes.
- Build completo de producción: verde.
- Playwright Chromium 390×844 sobre la ruta canónica: **1 prueba verde** y sin desbordamiento horizontal.

No se activó autoridad nueva sobre notas ni se realizó despliegue productivo.

## Resultado focal: aplicación a recursos (2026-09-27)

- El creador de recursos ofrece un único enfoque excluyente: libre, criterios aprobados, estándares oficiales o criterios rápidos; conserva el contrato legado únicamente como adaptador interno.
- El selector omite borradores y permite continuar sin una versión guardada. Al aplicar una aprobada envía su identificador y la equivalencia heredada sin crear una segunda rúbrica.
- El detalle devuelve y muestra el título y número de la versión aplicada. Los materiales históricos traducen DBA como **«Estándar oficial»** y continúan abriendo sin metadatos nuevos.
- La herramienta «Rúbrica» permanece fuera del selector de materiales nuevos; los recursos históricos de ese tipo conservan compatibilidad de lectura.
- Pytest focal: **15 pruebas verdes** de asignación de recursos y snapshot aprobado.
- Vitest focal: **14 pruebas verdes en 4 archivos** de generación libre, selección aprobada, estándares y catálogo sin redundancia.
- TypeScript y ESLint focal: código de salida 0. Ruff focal: sin hallazgos después del ordenamiento mecánico de imports.

No se cambió la fórmula de calificación, la autoridad nueva permanece desactivada y no se modificaron recursos o notas existentes.

## Resultado focal: snapshot y paridad de fórmula (2026-09-27)

- La aplicación persiste una copia profunda del snapshot aprobado: una edición posterior del objeto de trabajo no puede modificar la versión ya asociada.
- Evaluaciones y materiales de apoyo usan el mismo servicio de aplicación inmutable y mantienen el adaptador heredado requerido por los consumidores actuales.
- `CRITERIA_GRADING_AUTHORITY` continúa en `false`; los criterios explican la valoración, pero la nota sigue saliendo exclusivamente de la fórmula vigente sobre puntos obtenidos y posibles.
- Pytest focal: **12 pruebas verdes** de aplicación a evaluación/recurso, snapshot exacto, asignación explicativa y paridad matemática.
- Ruff focal: sin hallazgos.

## Resultado focal: compatibilidad DBA y matriz de dominio (2026-09-27)

- Las cinco superficies que el inventario marcaba sin cobertura ya tienen pruebas directas: listado, creación y carga documental de referencias personalizadas, `dba_catalog` y `dba_personalizados`.
- Se comprueba que ambas tablas históricas permanecen separadas y que el adaptador nuevo conserva identificador oficial, clave estable y versión sin crear filas falsas del catálogo.
- La carga documental rechaza tipos no permitidos antes de persistir contenido; listado y creación respetan el ámbito de la materia y su propietario.
- Pytest de la matriz completa: **33 pruebas verdes** de modelos, versiones, autorización, privacidad, fuentes y compatibilidad DBA. Solo se observaron advertencias de dependencias/deprecaciones, no fallos funcionales.
- Ruff del archivo nuevo: sin hallazgos.

## Resultado PostgreSQL: migración y doble backfill (2026-09-27)

La prueba ejecuta el DDL Alembic real en un esquema temporal creado dentro de una transacción; el rollback elimina todo el escenario al finalizar. Se usó PostgreSQL local de Docker y el driver `psycopg==3.2.3` declarado en el proyecto.

- Escenario sintético: referencia oficial, criterio personalizado, evaluación publicada, evaluación cerrada con blueprint, nota publicada `3.5`, desglose con componente `0.7/1` y reclamo abierto.
- Primera importación: tres conjuntos/versiones y dos aplicaciones históricas; ningún componente de calificación nuevo.
- Segunda importación: comparación JSON completa idéntica, incluidos UUID, hashes, fechas y snapshots de las seis tablas nuevas.
- Las ocho tablas históricas conservaron exactamente todos sus campos y UUID antes/después. El snapshot de la evaluación cerrada mantuvo sus criterios y los identificadores oficiales/personalizados originales.
- Prueba PostgreSQL y comprobaciones de estructura: **3 verdes**. Matriz fundacional de criterios: **58 pruebas verdes**. Ruff de migración y prueba: verde.

Para repetir, definir `SPEC042_TEST_DATABASE_URL` con un URL `postgresql+psycopg` local y ejecutar `python -m pytest tests/integration/test_learning_criteria_migration.py -q`. La prueba ejecuta solo tablas de su esquema temporal y termina con rollback.

## Resultado focal: medición de preparación/revisión (2026-09-27)

- Botón opcional «Medir mi tiempo», sin iniciar medición ni asumir consentimiento al abrir el asistente.
- Intervalos monotónicos de preparación, revisión y espera de solicitudes, sin texto, fuentes ni respuestas. Se pausa al ocultar la pestaña y después de 45 segundos sin interacción. Se envían deltas cada 30 segundos y al terminar, sin sumar dos veces al desmontar.
- La analítica conserva separadamente la espera completa del job (cola + procesamiento, fechas del servidor). Nunca suma esa espera al trabajo activo ni la presenta como ahorro demostrado.
- Las mediciones exigen rol docente/admin, permiso de criterios y propiedad de la materia; valores inválidos, estudiantes y contenido sensible se rechazan.
- TypeScript y ESLint focal verdes. Vitest: **20 pruebas verdes** de temporizador, asistente y contratos analíticos. Pytest de analítica: **46 verdes**; con versiones: **50 verdes** antes de añadir el resumen temporal.
- Ruff del dominio, política y pruebas: verde. `analytics/service.py` conserva deuda anterior E701/E712 fuera del bloque modificado; el análisis focal sin esas dos reglas está verde. No se declaró limpio el lint general por esa excepción.

Las solicitudes analíticas son no bloqueantes. Un cierre abrupto puede perder el último intervalo (máximo 30 segundos); estas mediciones son intervalos observados conservadores, no un cronómetro certificado ni una demostración de impacto por sí solas.

## Resultados de navegador y regresión de notas (2026-09-27)

- Chromium real con APIs simuladas: recorrido manual completo, aprobación, consulta de versión inmutable, propuesta asíncrona desde texto privado, edición docente y aprobación en **360×800, 390×844, 768×1024, 1366×768 y 1920×1080**, claro y oscuro.
- Once casos pasaron en la matriz inicial; el caso 1920 oscuro se interrumpió antes de cargar `/login` con `ERR_NO_BUFFER_SPACE` del navegador local y pasó al repetirlo aislado. En total, **12 casos verificados**, incluyendo alias `/dba` con query/hash y bloqueo estudiantil sin solicitar fuentes ni lista administrativa.
- No hay desbordamiento horizontal; el diálogo queda dentro del viewport y los botones de revisión, aprobación y cierre se alcanzan mediante el scroll real. Captura de revisión final inspeccionada visualmente en escritorio oscuro.
- No hubo errores JavaScript del producto durante los recorridos aprobados. Esto no sustituye Brave, iPhone físico ni una prueba integrada con proveedor/worker real.
- Contrato HTTP asíncrono: **202 en 5.36 ms** en TestClient con el servicio de cola simulado; se comprueba explícitamente que la generación no se ejecuta dentro de la petición. No es una medición de latencia productiva ni del modelo.
- Pytest focal de historias 1 y fuentes: **24 verdes**. Regresión de notas/publicación/ajustes/historial/visibilidad/PQRS: **24 verdes**. Cambiar `1/1` a `0.7/1` mantiene una única fórmula (`3.50/5`), versión anterior y relaciones con criterios; conserva el estado publicado y los snapshots aprobados.
- Se añadió comprobación de gestión al endpoint de aplicación antes del servicio de snapshot, para no omitir el permiso efectivo del docente.

## Secuencia canary y reversión segura

PR de implementación: [#157](https://github.com/Andres-back/Calificator/pull/157), enlazado al [issue #19](https://github.com/Andres-back/Calificator/issues/19), con aprobación de especificación y plan. No realizar push directo a `main`.

1. Exigir CI verde antes de fusionar; conservar respaldo verificado de PostgreSQL y evidencia de notas/desgloses históricos de la instancia canary.
2. Aplicar `alembic upgrade head`. La revisión `202609270001` une las dos ramas históricas sin DDL ni cambios de datos; no se reescribieron revisiones existentes. CI ejecuta la prueba real PostgreSQL mediante `SPEC042_TEST_DATABASE_URL`.
3. Arrancar API/worker con todas las banderas 042 desactivadas. Validar login, materias, carga/calificación, ajuste parcial, publicación, historial y PQRS históricos.
4. Solo en la instancia canary: activar `CRITERIA_UI` y `CRITERIA_WRITE`; probar criterios manuales y consulta histórica. Después activar `CRITERIA_GENERATION` y confirmar worker de cola `criteria`, recuperación e idempotencia con material sintético.
5. Activar `CRITERIA_GRADING_CONTEXT` únicamente tras comparar mismos puntos y fórmula con el control. Mantener **`CRITERIA_GRADING_AUTHORITY=false` en todas las fases**; no hay autorización para sustituir la fórmula estable.
6. Ante regresión, apagar UI/generación/contexto; no degradar ni borrar tablas o versiones. Entregas y notas existentes continúan con sus contratos heredados. Los snapshots ya aplicados se conservan.
7. Registrar latencia real de aceptación/cola/proveedor, errores y comprensión docente antes de extender a producción. El canary documentado aquí es una secuencia preparada, **no un despliegue ya ejecutado**.

## Regresión general de cierre técnico (2026-09-27)

- Suite backend unitaria completa: **844 pruebas verdes** (103.96 s).
- Suite frontend completa: **442 pruebas verdes en 89 archivos** (84.20 s).
- ESLint general del frontend, TypeScript y build de producción: verdes. El build informa un chunk mayor a 500 kB como advertencia, sin fallo.
- Ruff con las reglas obligatorias de CI (`F401,F821,F822,F823,F841`) sobre todo `app` y `tests`: verde. Ruff completo sobre las nuevas pruebas, migración de unión y router: verde.
- PostgreSQL focal más validación de una sola cabecera Alembic: **4 pruebas verdes**.
- Inventario regenerado: **600 superficies**; dos comprobaciones consecutivas de vigencia verdes. 042 tiene su inventario generado propio, incluidos jobs de su worker.

Siguen pendientes T064 (comprensión docente y registro UX completo) y T089 (canary integrado API/worker/proveedor y aceptación final). Los E2E descritos arriba usan APIs simuladas: no se presentan como prueba integrada productiva. La lista de integridad es propiedad del revisor y permanece sin marcar. No fusionar mientras el CI o estas compuertas estén pendientes.

## Continuación: regresiones E2E y cola operativa (2026-09-27)

- La ejecución de CI detectó tres pruebas con controles anteriores («Alinear con DBA» y checkbox de rúbrica), reemplazados por estándares oficiales y tarjetas de enfoque. Se actualizaron los selectores sin eliminar las verificaciones; la rúbrica rápida ahora comprueba también el payload de generación con su criterio escrito y listas DBA vacías.
- La prueba de otro estudiante tenía una carrera: el inicio podía almacenar la lista antes de instalar el segundo alumno. El escenario completo se instala antes del login. La prueba de privacidad usa sesiones independientes para no atribuir al estudiante peticiones docentes que aún estaban en vuelo; sigue exigiendo cero consultas a criterios/fuentes y administración de alumnos.
- Los cuatro casos fallidos de CI pasaron juntos en local. La matriz ampliada completó 40 de 42 casos: uno se interrumpió durante la carga del login local y otro detectó la mezcla de sesiones del escenario de prueba. Ambos pasaron aislados después de separar las sesiones. No se presenta esa ejecución como una única corrida de 42 verdes.
- Inspección visual de las capturas de revisión en 360 claro y 390 oscuro: criterios, evidencia esperada, pesos y aprobación son legibles y alcanzables con el scroll del diálogo.
- Se detectó un problema de despliegue real: el productor enviaba propuestas a `criteria`, pero ningún worker de Compose la consumía. El worker general consume ahora `default,celery,criteria`, con regresión sobre el archivo de despliegue. No cambia las colas dedicadas de calificación, digitalización o presentaciones ni su concurrencia. Pytest focal: **9 verdes**; Ruff y ESLint focal: verdes.
- Canary local preparado en la base separada `criteria_canary_042_20260927` y Redis `/12`, con identidades y material sintéticos, puerto ligado a `127.0.0.1:8012` y `CRITERIA_GRADING_AUTHORITY=false`. Todas las migraciones terminaron, incluida la unión de ramas; API y worker arrancaron y el worker anunció las tres colas. No se modificó `.env` ni la base habitual.
- Docker Desktop dejó de responder con `502 Bad Gateway` durante el primer intento; la comprobación integrada se reanudó y se documenta abajo. No se intervino producción.

T064 sigue requiriendo comprobación humana de comprensión (SC-008/SC-011); la aprobación previa del alcance no se convierte en un resultado de usabilidad medido. La compuerta del revisor permanece intacta.

## Canary integrado y correcciones detectadas (2026-09-28)

- Entorno **local y aislado**: PostgreSQL `criteria_canary_042_20260927`, Redis `/12`, API `127.0.0.1:8012`, identidades/material sintéticos y `CRITERIA_GRADING_AUTHORITY=false`. No se modificaron `.env`, notas ni producción.
- Migración Alembic completa hasta la cabecera unificada. La petición de propuesta respondió **202 en 3.026 s**, sin esperar al modelo; el worker consumió la cola `criteria` y el trabajo terminó correctamente en **21.23 s** (cola 3.368 s, ejecución 17.06 s), con tres criterios y revisión humana requerida. Una segunda solicitud reutilizó el mismo job. El proveedor observado fue OpenCode con `deepseek-v4-flash-vision-exp`; estos tiempos son de **una sola muestra sintética**, no una promesa de latencia productiva.
- La fuente privada no se filtró al estudiante: su consulta recibió **404**, sin contenido. El canary generó **un job y cero calificaciones**.
- El primer intento de aprobación guardó la versión, pero respondió 500 al leer un `updated_at` expirado en SQLAlchemy async. Se añadió recarga explícita antes de serializar y una regresión. La lectura posterior respondió **200**; una nueva aprobación respondió **200**, dejó versión 2 activa y la edición de la aprobada respondió **409**.
- La clonación reveló otra inconsistencia: los criterios del nuevo borrador referenciaban IDs de fuentes de la versión anterior. Se remapean a los IDs propios del borrador, se rechazan referencias huérfanas y se añadió regresión. La clonación HTTP posterior respondió **201**: fuentes distintas, tres referencias locales válidas y versión aprobada intacta.
- El E2E móvil de dos paquetes fallaba intermitentemente en CI porque el inicio precargaba el listado antes del segundo alumno simulado. Se instaló el listado completo antes del login; el mismo flujo pasó **cinco veces seguidas** en Chromium 390×844, incluida la conservación de hojas tras un 503 controlado.

La matriz de navegador con APIs simuladas sigue sin sustituir una prueba en iPhone físico ni la valoración humana de comprensión. La autoridad sobre la nota continúa desactivada y esta rama no está desplegada ni fusionada.

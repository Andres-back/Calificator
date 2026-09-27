# Validación rápida: Criterios de aprendizaje

## Preparación

1. Aplicar migraciones en una base de datos de prueba con registros DBA, evaluaciones, blueprints y calificaciones existentes.
2. Activar la bandera de criterios para una materia de prueba y dejar otra desactivada como control.
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

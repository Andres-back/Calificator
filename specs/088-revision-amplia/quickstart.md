# Guía de validación

Estado: alcance y plan aprobados el 2026-10-06; checklist 10/10 revisada con autorización antes de implementar. Implementación local completada y convergencia limpia; PR preparado, pendiente de CI completo y revisión. Sin fusión ni despliegue autorizados.

## Preparación

Usar worktree de la rama `codex/088-revision-amplia`, dependencias del frontend y fixtures sintéticas. Playwright levanta Vite en `127.0.0.1:4175`; no requiere Docker, credenciales ni evaluaciones productivas. Conservar cambios ajenos. Evitar procesos paralelos que compartan/cierren el mismo servidor.

## Comandos de reproducción

Desde `frontend`, después de implementar y añadir los casos nuevos a las suites existentes:

```powershell
npm run test:run -- src/components/layout/AppShell.test.tsx src/modules/calificaciones/CalificacionesWorkspace.mobile.test.tsx src/modules/calificaciones/components/GradeComponentEditor.test.tsx
npm run typecheck
npm run lint:strict
npm run build
node node_modules/@playwright/test/cli.js test e2e/explainable-grading.spec.ts
node node_modules/@playwright/test/cli.js test --config=e2e/mock grading-review.mock.spec.ts --grep '088|abre enlaces|captura contextual|prioriza excepciones|busca y selecciona'
node node_modules/@playwright/test/cli.js test --config=e2e/accessibility grading-review.a11y.spec.ts
node node_modules/@playwright/test/cli.js test --config=e2e/visual grading-review.visual.spec.ts
node node_modules/@playwright/test/cli.js test e2e/explainable-grading.spec.ts --browser=webkit --grep '088|docente llega a la respuesta 20'
```

Reutilizar regresiones existentes; no reejecutar todas las suites por cada ajuste CSS. Inspeccionar imágenes antes de aceptar cambios visuales. CI completo sigue siendo obligatorio.

## Escenarios y resultados esperados

1. 1366×768, 30 alumnos ficticios con nombres ≤40 caracteres: ≥320 px de lista, ≥5 filas completas, cabecera ordinaria ≤112 px. Repetir ancho en 1920×1080.
2. Desplazar hasta pregunta 20 desde dentro del detalle: lista/búsqueda y alumno activo siguen disponibles; rueda sobre lista no mueve detalle. Cambiar alumno sin volver al inicio exterior.
3. Buscar entre 100 alumnos, cambiar filtro y paginar: resultados y contadores correctos; nombres largos consultables sin scroll horizontal.
4. Cinco tamaños × claro/oscuro: sin desbordamiento, contenido cortado o botones tapados. Añadir frontera 1279/1280, zoom 200 %, altura reducida y teclado móvil. Foco/retorno y bloqueo del fondo se restauran al salir.
5. Ajustar una respuesta, intentar cambiar alumno y provocar conflicto 409: protección y borrador conservados. Abrir/scroll/buscar no mutan calificaciones.
6. Carga de entregas, publicación, selector abierto, trabajo en segundo plano, temporizador habilitado, vacío/error y nota cero: acciones alcanzables y significado intacto.
7. Usuario lector, estudiante y módulos ajenos: permisos intactos; expansión del shell no se aplica fuera de revisión docente.

CI completo y autorización de fusión siguen siendo necesarios antes de producción.

## Resultados locales del 2026-10-06

- Unitarias focalizadas: 20/20 (shell 9, contexto/acciones móviles 8, editor 3). TypeScript, lint estricto y build de producción verdes. El build conserva los avisos no bloqueantes de chunks >500 kB y tiempos de plugins; no se actualizaron dependencias.
- Funcional: primera ejecución integrada 25/29; cuatro fallos en expectativas antiguas de scroll exterior, filtro por botones, publicación sin menú y conteo antes de cargar. Se corrigieron las expectativas para medir el flujo aprobado y se repitieron seis casos afectados/nuevos: 6/6. Los 29 casos distintos quedaron cubiertos entre ambas ejecuciones, no se afirma una única corrida completa verde del HEAD final. Caso de 100 alumnos repetido tras añadir selección múltiple y tamaño táctil: 1/1.
- Mock focalizado: 5/5 (contexto/menú, excepciones, enlace profundo/borrador, búsqueda móvil y captura). Caso adicional de lote de 30 elementos con `VITE_TEACHER_WORK_TIMING_ENABLED=true`: 1/1; abrir casos y timer no escribe notas ni reintenta trabajos.
- Accesibilidad: 11/11. Cinco tamaños × dos temas con etiquetas, foco, objetivos de 44×44, feedback por encima de barra y retorno enfocado al alumno; además viewport CSS 683×384 como reflow equivalente a 200 % con editor de pregunta 20. No se afirma una prueba de zoom nativo, teclado físico de iPhone o dispositivo real.
- Visual: revisadas las diez capturas candidatas de 30 alumnos antes de renovar nueve referencias (una sin cambio). Después, 10/10 sin actualizar referencias; tras el último ajuste de botones, humo visual escritorio claro/celular oscuro 2/2. Salidas locales ignoradas en `frontend/output/playwright/088-review-{theme}-{width}.png`.
- WebKit: tres de cuatro casos iniciales pasaron; el cuarto comprobaba la liberación del cuerpo inmediatamente después de resize, antes del evento `matchMedia`. Se usa espera observable, sin cambiar el hook global. Repetición de frontera y cien alumnos: 2/2; los cuatro escenarios distintos pasan entre ambas ejecuciones.
- Gobernanza: registrado 088 en baseline y dominio 008, sin nuevas superficies académicas. Primera corrida 40/41: faltaba registrar 088 en el conjunto de specs. Se añadió al registro sin retirar checks. Al cerrar T013, suite completa 41/41 y `build_system_inventory.py --check` verde, con 573 superficies; inventario regenerado mediante el mecanismo existente.

Las dos regresiones iniciales de geometría/scroll y la unitaria de aislamiento fallaron antes del código correspondiente. El retorno de foco se probó en rojo y luego en verde. Los casos adicionales de menú, lote y tamaño táctil se añadieron durante integración, no se declara TDD estricto para todos los casos. Se interrumpió una invocación npm que eliminó argumentos; otras invocaciones con configuración inexistente/no encontrada no ejecutaron pruebas. Los comandos directos anteriores son los reproducibles.

## Evidencia y límites

SC-001/002: lista de 320 px a 1366 y 360 px a 1920, nombres envueltos, ≥5 filas completas a 1366, cabecera ordinaria ≤112 px comprobada por DOMRect. SC-003: pregunta 20, rueda por panel, búsqueda disponible e identidad visible; cambiar alumno sin mover scroll exterior ni escribir notas. SC-004/005: frontera 1279/1280, foco/restauración, borrador 0.7 conservado al resize; regresiones de 409, ajustes, publicación parcial, procesamiento sin cero ficticio, historial y permisos existentes reutilizadas.

La reorganización usa CSS y estado local, sin medir continuamente tamaños en JavaScript, nueva persistencia, API, migraciones o llamadas IA. Contexto/menú abierto, selección múltiple, publicación, carga, resultados batch, error y temporizador usan flujo exterior; revisión ordinaria de escritorio tiene lista/detalle independientes. El monitor embedded permanece alcanzable en una región de altura limitada; no se ocultan alertas ni se modifica su procesamiento.

Validación sintética local: no sustituye CI completo ni comprobación posterior al despliegue. No se consultaron ni modificaron notas productivas.

## Converge y entrega

Converge ejecutado después de Implement, contra estado presente y solo intención de spec/plan/tasks y constitución. Inventario: 9 FR + 5 SC + 11 escenarios de aceptación = 25; seis decisiones técnicas y ocho principios constitucionales revisados. Cero brechas missing/partial/contradicts/unrequested, de cualquier severidad. No se añadieron fases vacías ni se modificó tasks.md durante Converge. El cierre de T013 y este registro corresponden a la fase posterior de implementación/entrega. Borrador de PR preparado, enlazado a #182 y sin autorización de fusión/despliegue.

# Validación y entrega

Estado: implementación autorizada y terminada en rama 096; alcance/plan aprobados, listas 16/16 y 10/10 revisadas con autorización. Sin fusión ni despliegue autorizados.

## Preparación y comandos

Usar dependencias y fixtures vigentes; borradores v7 sintéticos de las seis etapas, cuentas/materias distintas y referencias reseleccionables. Sin alumnos, credenciales reales ni llamadas LLM.

En `frontend/`, ejecutar unidades de generationWizardModel, GenerationWizard y MateriaEvaluaciones; añadir pruebas del selector/acceso general. Mantener regresiones pertinentes de criterios/visor. Ejecutar `npm run typecheck`, `npm run lint:strict`, `npm run build` y suites aplicables; no atribuir resultados antes de ejecutarlas.

Extender E2E existentes de creación/responsive; filtrar casos afectados primero en Chromium/WebKit. Matriz 360/390/768/1280/1440 claro/oscuro, nombres/enunciados largos y 30 preguntas; capturas sintéticas en `output/playwright/`, ignoradas por Git. CI completo sigue obligatorio.

## Escenarios

1. Entrada IA/foto-PDF/manual, permisos y materia; estudiante sin controles docentes; cancelar sin crear.
2. Tema/nombre sugerido, nombre manual conservado, reparto/presets/límites, mixta/escala/fecha y resumen plegado.
3. Solo criterios elegidos; rúbrica/referencia opcionales; error plegado localizable; Xali aplicado solo tras confirmar.
4. Doble clic genera una solicitud; fallo/espera preservan preparación; éxito abre Revisar sin resumen obligatorio ni publicación.
5. Editar respuestas/puntajes/pesos; guardar mismo ID; payload diferencial/concurrencia. Publicada conserva estado/notas/entregas y advertencia.
6. Abrir formato final/PDF/Word tras guardar; documento coincide con registro, sin representar ediciones locales como persistidas.
7. Recuperar cada etapa v7, TTL, reselección, storage denegado y ID eliminado/revocado; cuenta/materia ajena no recupera contenido.
8. Responsive/foco: scroll principal único, teclado/ayudas/desplegables y acciones visibles; corregir y regresar sin salto. Registrar límites de motor frente a dispositivo físico.

## Cierre

Actualizar propietario 005, índice/baseline/inventario; Analyze antes de código y Converge después. Registrar comandos/resultados reales y CI; no fusionar/desplegar sin controles y autorización, ni probar calificación real para un cambio visual.

## Resultados locales — 2026-10-13

- Analyze: 14 FR, seis SC y 16 tareas; cobertura completa, sin hallazgos críticos ni requisitos huérfanos antes del código.
- `npm run test:run`: 102 archivos/636 casos verdes en la ejecución completa. Tras añadir el caso de aplicación confirmada de Xali y reforzar escala/fecha, las dos suites afectadas se repitieron: 50/50 verdes. CI repetirá la suite completa final.
- Selector/MateriaEvaluaciones: 2/2 y 12/12 verdes dentro de la suite completa; formulario manual compartido, selección de método sin creación inmediata y permisos conservados.
- `npm run typecheck`, `npm run lint:strict`, `npm run build`: correctos en el estado final. Aviso no bloqueante del chunk principal >500 kB; auditoría de build dentro del presupuesto vigente.
- `npm run audit:actions`: 440 botones y 119 enlaces con propósito verificable. `npm run audit:build`: recursos/preloads dentro del presupuesto.
- E2E de creación y visor: 26 casos sin el estrés de 30 preguntas pasaron juntos; el escenario de 30 preguntas recuperadas/tema largo pasó posteriormente en ambos motores (2/2). Total 28 casos distintos: creación/manual/permisos/recuperación, matriz claro/oscuro de cinco tamaños en Chromium, dos tamaños móviles en WebKit y seis regresiones de PDF/Word/solucionario.
- `npx playwright test --config=e2e/mock grading-review.mock.spec.ts --grep 'crea desde una materia'`: 1/1 correcto, sin repetir grado/área.
- `npx playwright test p2-responsive.spec.ts --grep 'criterios guardan y reabren' --project=chromium`: 5/5 correctos, sin reescribir preguntas ni notas.
- Capturas sintéticas revisadas en celular WebKit y escritorio Chromium. Artefactos ignorados en `output/playwright/creation-096/`; no equivalen a prueba en un iPhone/Android físico ni a ensayo con teclado físico.
- La comprobación táctil espera a que termine la animación del diálogo antes de medir. La prueba de 30 preguntas utiliza un borrador sintético recuperado; no es una medición de velocidad de taps consecutivos.
- Inventario regenerado: 573 superficies. Baseline y validador de gobernanza local, además del control completo en CI. No se instalaron dependencias de ejecución ni se llamaron modelos reales.
- Converge funcional: 14 FR/seis SC/11 escenarios de aceptación, diez decisiones del plan y ocho principios constitucionales revisados; sin trabajo de aplicación faltante. T016 se entrega mediante PR/CI, no mediante push directo.

## Entrega

Rama `codex/096-evaluacion-dos-pantallas`, issue #202, etiquetas `spec-approved`/`plan-approved`. PR enlazado mediante `Closes #202`; los controles remotos son obligatorios y no se presentan como completados hasta su ejecución. No se fusiona ni despliega por esta aprobación de implementación. No hubo modificaciones a notas, asistencias, evidencias, claves o configuración de IA.

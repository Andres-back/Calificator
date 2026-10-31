# Guía y registro de validación

**Estado**: implementación autorizada por «aprobado», issue297; código implementado y comprobado localmente, preparado para PR. No producción, datos reales, credenciales de docentes o llamadas IA. Base de diseño main5e32ceb. Los resultados locales no acreditan CI, fusión ni despliegue.

## Preparación realizada

Lista existente16/16 conservada, Tasks19 y Analyze sin brechas de cobertura en16 requisitos/5 criterios construibles; SC-006 es ensayo posterior. Maqueta previa en frontend/output/spec139-design/propuesta.html, capturas384/1440 claro/oscuro e inspección visual antes del código funcional. Se corrigió ancho de nombres móviles y contraste del indicador oscuro. No se confunden estas capturas con implementación.

npm ci instaló el lockfile sin actualizar versiones. Auditoría de producción al umbral moderate: cuatro avisos low preexistentes KaTeX/transitivas, cero moderate/high/critical en producción; la auditoría general informa además avisos de herramientas de desarrollo, por revisar en el cierre. No se ejecutó audit fix ni se declaran esas vulnerabilidades resueltas.

## Preparación

- Fixtures con treinta estudiantes, distintos estados y enlaces sintéticos que no permiten acceso a datos reales.
- Backend local/base aislada solo para permisos, concurrencia e idempotencia; no restaurar copia productiva para esta prueba.
- Maqueta384/1440 antes de código funcional; distinguir de capturas de implementación.

## Recorridos obligatorios

1. Generar → copiar → volver al grupo → salir de evaluación → reentrar al mismo estudiante → copiar: misma URL completa, accessId, versión de credencial y vencimiento. CTA visible sin abrir opciones.
2. Repetir tras desmontar, recargar, borrar sessionStorage/localStorage, reiniciar sesión y segundo contexto de navegador. Ninguna generación/publicación/reactivación por abrir o copiar.
3. Enlace creado por otro dispositivo: recuperar al consultar. Generaciones simultáneas con solo_si_falta: un único acceso compatible nuevo y sin prolongarlo; conflicto si hay ambigüedad.
4. Lista/recuperación fallida: Reintentar, nunca «No existe» ni Generar por un error. Restablecer conexión y recuperar exactamente el anterior.
5. Antiguo sin copia, copia cifrada inválida, vencido, desactivado, suspendido, múltiples vigentes y fallo del primero: causas y acciones distintas, sin sustitución implícita. No usar una clave real ni provocar rotaciones para simularlo.
6. Suspensión por cambio sintético de contenido: aprobar expresamente con mantener_vencimiento mantiene token, fecha y cuota; vencido/revocado rechazado. Contrato antiguo sin opción y sus recibos siguen funcionando.
7. Fallo parcial/generación incierta: recuperar solicitud original, mantener éxitos/selección y reintentar pendientes sin duplicar.
8. Cambio de actor, pérdida de permisos o evaluación durante la operación: no resultados tardíos; sin acceso a copias ajenas. Perfiles solo lectura no reciben acciones de emisión/copia sin permiso.
9. Copia denegada y compartir cancelado: fallback manual/ningún «Enviado». Mensaje solo nombre, evaluación y enlace; lista privada con destinatarios confirmados.
10. Treinta tarjetas/nombres largos a360/384/390/768/1440, dos temas, texto200 %, teclado, zonas seguras, scroll desde contenido y márgenes. Foco/posición/borradores conservados y acción de copia alcanzable.

## Herramientas de comprobación al implementar

- Frontend: `npm run typecheck`, `npm run lint:strict`, `npm run test:run`, `npm run build`, `npm run audit:actions`, `npm run audit:build`; auditoría con el umbral vigente, sin actualizar dependencias automáticamente.
- Nuevas pruebas en `frontend/e2e/feedback-link-reentry.spec.ts`, suites de retroalimentación y regresiones de Spec138 con Chromium/WebKit; tipos de contextos simulados Android/iPhone no acreditan teléfono físico.
- Backend: ampliar suites existentes de feedback y ejecutar en el entorno de pruebas aislado; simular cifrado/tiempo sin secretos reales. Con y sin opciones, errores y concurrencia bajo bloqueo.
- Inventario: `python scripts/build_system_inventory.py --write` y `--check`; después `python -m pytest tests/spec_governance -q`, validador de PR y CI completo sin exclusiones/bypass.
- Converge y capturas reales384/escritorio antes de pedir fusión. Issue y approvals deben estar enlazados en esa etapa.

Registrar resultados reales y comandos exactos después de ejecutar. No sustituir esas mediciones por este listado de expectativas. Ensayo de tres docentes y meta temporal posterior, sin afirmar calidad pedagógica demostrada.

## Resultados locales registrados

- Backend: 1850/1850 pruebas unitarias completas y 104/104 integraciones `test_feedback*.py`, incluidas las catorce nuevas de guardias, con PostgreSQL aislado. Ruff de app/tests con los selectores de CI aprobado. Entorno Docker local `xcal-spec131-tests:fpdf288`, FastAPI0.139, Pydantic2.10.4, SQLAlchemy2.0.36 y pytest9.1.1. Montaje del worktree en solo lectura; base efímera sin volúmenes productivos ni red externa. La primera colección incompleta por fixtures no montados se corrigió montando el worktree completo; no se excluyeron pruebas.
- Frontend completo: 1376/1376 unidades, sin omitidas, con dos workers. Tras añadir la última regresión de foco, el módulo actualizado pasó202/202, incluidos los casos de consulta, recuperación, permisos, copia manual y canales. TypeScript, lint estricto, compilación y auditoría del build aprobados de nuevo. Son ejecuciones solapadas: no se suman como si fueran pruebas distintas.
- Auditoría de acciones: 674 botones y 125 enlaces con propósito verificable. Dependencias de producción: cuatro avisos low preexistentes KaTeX/transitivas, cero moderate/high/critical al umbral vigente. No se cambiaron versiones ni se ejecutó audit fix.
- Distribución remota E2E: 1002 escenarios enumerados, cuatro particiones263/240/249/250, cero faltantes y cero duplicados. Esta enumeración no es una ejecución de esos1002 escenarios.

Las primeras matrices detectaron recorte con texto200 %, foco al regresar y fixtures antiguos sin vencimiento/copia persistida. Se corrigieron los contenedores responsivos, el retorno de foco y los fixtures para modelar el contrato real; no se modificaron workflows, tiempos máximos ni reintentos para ocultar fallos. Las ejecuciones interrumpidas o diagnósticas no cuentan como aprobadas. La geometría tolera exclusivamente un píxel CSS de redondeo y comprueba todos los ancestros que recortan, objetivos44px y ausencia de desbordamiento.

El diagnóstico de posición midió una matriz de escala1.00131 del diálogo: mezclar esas coordenadas visuales con scrollTop generaba un desfase de7px. Se quitó la escala solo en este panel, sin cambiar Modal global. El foco vuelve después del commit de React, no a un botón de la vista anterior aún montada; la consulta al recuperar foco conserva el control y reconfirma sus metadatos. Las dos regresiones de foco se reprodujeron primero en RED y después pasaron.

El retorno conserva la comprobación anterior de desplazamiento mínimo/restaurable, con el mismo límite de1px, selección y cabecera del mismo estudiante visibles. No se impone una coordenada exacta de la fila al cambiar el viewport o añadir botones. La prueba grupal mantiene selección, ratón, teclado, copia manual, permisos y solicitudes; el texto móvil se amplió de150 % a200 %. La navegación de entrada de los casos nativos usa teclado; creación, edición y copia conservan la cobertura de puntero y el límite anterior de30s.

## Entorno y reproducción

Worktree aislado `E:/tesis/.worktrees/envio-retroalimentacion-simple`, dependencias propias instaladas con npm ci y TEMP/TMP en `E:/tesis/tmp/spec139-runtime`. Servidor único loopback4185 con harness ignorado `frontend/output/spec139-local-vite.config.ts`, caché propia y exclusión del watch de artefactos; no se publica ese harness ni se cambia la configuración de producción. Informes locales ignorados en `E:/tesis/output/spec139-tests/`.

Desde frontend: unidades completas con `node node_modules/vitest/vitest.mjs run`; módulo final con `... run src/modules/feedback_sharing`; scripts typecheck/lint:strict/build/audit:actions/audit:build; `npm audit --audit-level=moderate --omit=dev`; `node scripts/verify-e2e-shards.mjs 4`. Playwright usa `PLAYWRIGHT_TEST_PORT=4185`, dos workers y los proyectos existentes Chromium/WebKit. Registrar abajo los informes finales de cada suite, sin sumar repeticiones del mismo escenario.

No se afirma reproducción del enlace real reportado ni validación física Android/iPhone en esta entrega. SC-006 queda como ensayo humano posterior con tres docentes/treinta destinatarios, antes de afirmar facilidad validada. Treinta días institucionales, extensión, QR y aperturas siguen fuera del alcance aprobado.

## Cierre de E2E y convergencia

Los informes son locales/ignorados. Se contrastaron por proyecto+archivo+título, sin sumar repeticiones como casos nuevos:

| Informe | Resultado de esa ejecución | Interpretación |
| --- | --- | --- |
| reentry-responsive-final.json |143 aprobados/5 fallidos| Primera regresión, incluye impresión y privacidad heredadas; fallos de navegación investigados, no acreditados como verdes. |
| share-context-verified.json |168 aprobados/4 fallidos| Contexto138, revisión136 y aprobación135; los casos fallidos se repitieron tras corregir foco/flujo. |
| reentry-workspace-final.json |80 aprobados/4 fallidos| Los54 casos nuevos de reentrada/estados pasaron; los cuatro fallos restantes eran una precisión adicional de anclaje móvil, retirada al restablecer la comprobación original de posición/restauración, selección y cabecera visibles. No se amplió su tolerancia de1px. |
| group-errors-release.json |32/32 aprobados| Repetición completa del grupo y errores: treinta casos mixtos,105 destinatarios, permisos, foco, texto200 %, copia manual y ambos motores. Sin omitidos ni reintentos configurados. |

Cobertura acumulada:296 escenarios distintos; el último resultado registrado de cada uno es aprobado. No es una ejecución única de296 escenarios ni equivale al CI remoto completo. Los primeros fallos y las ejecuciones interrumpidas permanecen identificados arriba. Las capturas de errores se repitieron situando el botón Reintentar dentro del viewport y comprobándolo; [evidencia visual](visual/README.md) inspeccionada, sin datos reales.

Converge contrastó16FR,5 criterios construibles,22 escenarios de aceptación,7 decisiones y8 principios: cero brechas funcionales, contradicciones o ampliaciones fuera del alcance. No añadió una fase vacía y no cambió tasks.md durante esa comprobación; después Implement cerró los marcadores de las19 tareas. Sin hooks de extensión configurados. El inventario conserva682 superficies. El PR se publica para revisión/CI; la fusión y cualquier despliegue requieren otra autorización.

Cierre documental: inventario vigente y gobernanza completa61/61, sin exclusiones. Capturas inspeccionadas en384/1440 claro/oscuro, texto200 %, resultado parcial y errores con acción visible. Las fuentes y dependencias de producción no se modifican fuera del alcance descrito.

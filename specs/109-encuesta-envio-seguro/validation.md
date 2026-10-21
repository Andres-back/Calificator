# Evidencia de implementación · 2026-10-20

## Alcance y aprobación

El usuario autorizó corregir firma/recepción, conservar respuestas y asegurar producción. Amplió explícitamente a versionado, minutos numéricos y entregas, proporción de abiertas, legibilidad/cámara, entrega/respaldo y duración por comprobar. Se archiva 4.0 y se publica 5.0; no se presume aprobación ni ejecución de una preprueba humana.

## Evidencia local

- 59 pruebas unittest de recepción, firma, consentimiento, permisos, persistencia, contexto 4.0, resumen 5.0, 24 preguntas numeradas y exportaciones: PASS.
- Node: tres grupos, firma mínima/longitud, confirmación completa/ajena, timeout, fallo de red y respuesta no JSON: PASS.
- Python Ruff F401/F821/F822/F823/F841 y compilación; JS sintaxis: PASS.
- Docker encuesta-docente:qa109 construido. Recepción sin red, base temporal, misma constancia y una fila tras dos envíos; huella y acceso administrativo denegado sin autorización: PASS.
- Playwright CLI/WebKit móvil: firma de 11 puntos demasiado corta detenida antes de cualquier POST. Firma válida, pérdida de respuesta después de persistir, estado pendiente y reintento recuperado: una sola fila sintética. Confirmación a 360 px sin desbordamiento. No es prueba de iPhone físico.
- Playwright CLI/Chrome escritorio 1280 px: sesión privada, recuento 5.0, 1.3 minutos por entrega del caso ficticio (32.5/25) y métricas del formulario, sin desbordamiento. Capturas revisadas en output/playwright/qa109/.
- Copia archivada de 4.0 y versiones previas sin reescribir datos productivos. Inventario académico vigente: 596 superficies, sin cambios.
- Gobernanza: 49/49 pruebas PASS (12.98 s, ejecución con permisos de Windows para Bash). Lista de calidad 16/16 revisada, cobertura FR-001 a FR-013 y 13 tareas completadas de implementación/preparación. Sin extensiones/hook configurados. La verificación productiva sigue condicionada a CI/merge.

## Dependencia de CI

main todavía contiene follow-redirects 1.16.0, cuyo bloqueo alto ya fue diagnosticado en el PR #225. Se incluye solo el mismo parche transitorio 1.16.1 (tres líneas de lockfile), no los cambios de cuentos de ese PR. npm ci offline reproduce el lockfile; auditoría online moderada/de producción: exit 0, cuatro avisos bajos heredados de KaTeX. No se cambia el umbral ni la excepción 503. Typecheck, lint:strict y build (3123 módulos, Vite 3.94 s): PASS. El aviso de chunks grandes es heredado. CI remoto debe ser verde antes de merge.

## Procedimiento de producción preparado, aún no ejecutado

1. Conservar imagen vigente, snapshot SQLite privado y huellas agregadas/por registro, sin exportar identidades.
2. Únicamente con el commit de main aprobado, construir la encuesta desde una copia de release aislada; no cambiar el checkout académico ni fusionar la antigua rama de encuesta.
3. Mantener .env, nombres de bases, volumen y red. Arrancar únicamente encuesta-docente con la nueva imagen y posibilidad de volver a la anterior.
4. Verificar health público, versión 5.0/release y módulos JS; rechazar acceso sin sesión al resumen. Validar recepción con imagen y base temporal, nunca con fixtures en la muestra real.
5. Leer resumen privado real y comparar integridad de todas las constancias previas. Anotar recuentos por versión y commit/imágenes. No afirmar recepción de docentes que no tengan una constancia almacenada.

## Pendiente de entrega

PR/CI/merge y verificación productiva no se consideran realizados por completar el código. La preprueba humana de duración requiere docentes y se realizará posteriormente; no se sustituye por los tiempos de automatización.

## Prioridad nombre único · release 5.0.1

El usuario indicó arreglar el nombre repetido antes del CRUD. Se elimina signature-name del DOM y se deriva la firma del único identity.name. Nombre mostrado como texto y botón de corrección al primer paso; si cambia tras dibujar, se limpia firma/autorización en memoria y se exige firmar de nuevo. Se mantiene la validación de consistencia del backend para clientes externos. Ninguna constancia previa se edita.

59 pruebas WSGI PASS (2.456 s); Node 4/4 (139 ms), incluida regresión de nombre único, actualización, ausencia de segundo campo y firma; sintaxis JS y diff check PASS. Prueba WebKit móvil de diagnóstico: nombre con tildes, corrección tras firmar, nueva firma y confirmación real en base sintética local. Se comprobó en SQLite que identity.name y signature.name coinciden y existe una sola constancia de ese caso. Confirmación a 360 px sin desbordamiento. Prueba Chrome del piloto: alta con nombre inicial único, confirmaciones y firma, constancia guardada y nombres coincidentes. Capturas sintéticas en output/playwright/qa109/single-name-confirmed.png y pilot-single-name-confirmed.png. No son pruebas de hardware físico ni se usó la muestra real.

CRUD solicitado queda como borrador pendiente, no implementado ni anunciado en producción. El PR #227 obtuvo en su HEAD anterior encuesta/gobernanza/contenedores/frontend quality en verde; backend bloqueado por 8 vulnerabilidades de Pillow 12.3.0 cuyo arreglo indicado es 13.0.0. No se cambia esta dependencia mayor sin autorización adicional; no se elude el control y no se despliega. Los controles deben volver a ejecutarse sobre el nuevo HEAD de nombre único.

## Continuación autorizada: dependencia de imágenes

El usuario autorizó expresamente actualizar Pillow y probar el 2026-10-20. El HEAD e7ed9e9 pasó encuesta, gobernanza, frontend quality y contenedores. Backend falló antes de ejecutar pruebas, en pip-audit: ocho CVE de Pillow 12.3.0 con solución 13.0.0. No se modifica la auditoría. Dos casos WebKit de tablas fallaron al cerrar el editor y uno de menú docente al devolver foco; los tres pasaron al repetir los casos exactos localmente sin cambiar código ni expectativas (2/2 en 23.2 s y 1/1 en 40.0 s). Esto no sustituye CI ni demuestra que el fallo intermitente esté resuelto.

Compatibilidad revisada frente a [notas oficiales de Pillow 13](https://pillow.readthedocs.io/en/stable/releasenotes/13.0.0.html): producción y CI usan Python 3.11; no se encontraron usos de fromarray con cambio de tipo, ImageCms ni guardado PNG en modo I en las rutas de la aplicación. Solo se cambia el pin de Pillow; no los modelos ni la lógica de calificación.

Prueba Windows/Python 3.13 con Pillow 13 instalado únicamente en tmp/qa109/pillow13, sin cambiar dependencias globales: 199 pruebas PASS, 2 omitidas en la selección de 12 archivos de fotos/evidencia, visión, digitalización, almacenamiento/render/transporte de recursos visuales, exportaciones y planificación de presentaciones. Se usan imágenes y API simuladas, sin datos productivos ni llamadas a proveedores. La primera ejecución sin permisos para hilos de Windows quedó bloqueada y se interrumpió; ambas ejecuciones posteriores con permisos completaron 11 PASS (1.86 s) y 188 PASS/2 omitidas (20.38 s). La imagen de encuesta 5.0.1 se reconstruyó y volvió a superar recepción idempotente, firma, huella y permisos en SQLite temporal, sin red.

Pendiente: terminar comprobación Linux/Python 3.11, auditoría y CI sobre el nuevo commit antes de merge. Producción sigue intacta.

Ampliación local completada: suite unitaria íntegra del backend con el mismo Pillow 13 aislado: **1142 PASS, 2 omitidas, 63.31 s**. Omisiones: render real PDF requiere WeasyPrint del entorno Linux y creación de enlaces simbólicos no disponible en Windows. Ruff de backend PASS; gobernanza 49/49 PASS (14.49 s). Se conservan los avisos heredados de deprecación, sin ocultarlos ni convertir omisiones en pruebas superadas.

## Hotfix de cierre de ventanas autorizado

El usuario autorizó el arreglo tras consultar los fallos de 70df096: backend (incluida auditoría y pruebas Linux), encuesta, gobernanza, frontend quality/build y contenedores ya verdes; contextual 103 PASS/2 FAIL en tablas WebKit. Se consultaron únicamente artefactos sintéticos de CI. En el caso IA hubo PATCH antes de fallar la expectativa de cierre; no se interpreta esta expectativa por sí sola como pérdida de guardado ni se alteran registros reales.

Regresión determinista añadida a Modal.test.tsx: detener requestAnimationFrame y cerrar con movimiento normal/reducido, conservar borrador subyacente y comprobar foco, scroll y Escape. Antes del cambio fallaban dos casos porque AnimatePresence retenía el diálogo cerrado. Se elimina la espera de salida de Modal, conservando entrada animada y reducción de movimiento. No se cambia el contrato de guardado ni mocks, expectativas, retries o timeouts de E2E. Esto corrige el bloqueo reproducible; todavía exige confirmar el resultado en el runner Linux de CI.

Primeras validaciones: 42/42 unitarias de Modal/QuestionVisualEditor/GenerationWizard PASS (22.83 s), casos WebKit nativa manual/IA tabla 1440 repetidos tres veces: 6/6 PASS (24.2 s). Typecheck, lint:strict y build 3123 módulos PASS; aviso heredado de chunks grandes sin ocultar. Las pruebas del wizard emitieron avisos de red simulada/heredados, sin fallar aserciones. Suite completa de frontend y contextual en curso; no se presume terminada ni se despliega este estado local.

Suite contextual idéntica a CI (`grading-review.mock.spec.ts` y `evaluation-visuals.mock.spec.ts`): **105/105 PASS (6.7 min)** en Chromium/WebKit. Incluye 360/390 px y escritorio, evidencias, tablas/gráficas manuales y generadas por API simulada, borradores y ajustes de calificación. No prueba cámara física ni se emplearon servicios de IA o datos productivos. La comprobación unitaria completa se reinició con registro de progreso porque la primera ejecución con salida capturada no permitió diagnosticar su espera; no se cuenta la ejecución interrumpida como superada. La matriz de CI debe ejecutarse sobre el commit nuevo antes de fusionar.

Comprobación completa terminada: **122 archivos / 791 pruebas unitarias de frontend PASS (259.14 s, dos workers)**. Gobernanza local 49/49 PASS (18.19 s). CI del commit db6b9c0 detectó posteriormente deriva del digest del inventario técnico al cambiar Modal: se regenera con el script oficial, sin cambiar sus validaciones ni excepciones. Esta actualización documental exige un nuevo commit y CI vigente, no se ignora el fallo anterior.

Inventario regenerado y `--check` PASS: las mismas 596 superficies, solo cambia source_digest. Validador de especificación contra el cuerpo/etiquetas reales del PR #227: PASS. No hay hooks de extensión configurados. El cambio queda preparado para nuevo CI; sin merge ni despliegue manual.

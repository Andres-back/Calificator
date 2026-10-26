# Validación prevista: digitalización con secciones

**Estado**: implementación y validación local de las cuatro historias completas, PDF/Word revisados,27 tareas verificadas y Converge sin pendientes. Paquete de PR/CI preparado, sin validación ni activación de producción. CI remoto sigue siendo obligatorio antes de una fusión que no está autorizada en este alcance. El plan ampliado está aprobado mediante «aprobe» después de la pausa solicitada.

## Entorno

- Workspace `E:/tesis/.worktrees/motivos-ci`, rama `codex/130-digitalizacion-secciones`, base main `341dcca591c16eb251ecd1538c555b7d18ac17b0`.
- PostgreSQL aislado y variables de prueba dedicadas de los contratos101/128; comprobar que nunca apunten a producción. Credenciales sintéticas solamente. No montar `.env`, datos de alumnos o uploads reales.
- Runtime Python/Node del proyecto, navegadores Playwright Chromium/WebKit y dependencias de render PDF/Word. Revisar skills de navegador/PDF/documentos antes de la verificación visual aplicable.
- Proveedores simulados. No se autoriza ni requiere enviar documentos reales o nuevas llamadas pagadas para comprobar el contrato.

## Muestras sintéticas mínimas

1. Documento de tres páginas con seis secciones: inicio con cuatro preguntas, lectura sin pregunta, comprensión con subsecciones literal/inferencial y seis preguntas, reflexión con tres, actividad de debate sin nota y conclusión con tres. Números reiniciados y un recuadro educativo. Tema/texto inventado, independiente de la transcripción real.
2. Documento plano legacy sin lectura y otro con lectura general; ninguno recibe organización inventada.
3. Instrucciones intercaladas, sección vacía, texto que continúa en otra página, figura compartida revisada y material visual pendiente.
4. Fallos deliberados: encabezado omitido, lectura truncada, referencia de pregunta duplicada/desconocida, ciclo/padre inexistente, respuesta manuscrita indebidamente propuesta y exceso de contexto.
5. Evaluación legacy con entrega/nota, revisión textual sin visuales y revisión con figura; cada una con marcadores privados de prueba que no deben publicarse.

## Recorrido de aceptación

### Digitalización y conservación

Simular las respuestas de extracción y estructura del flujo real de cola, completar trabajo y reintentar con la misma solicitud. Comparar inventario y documento después de guardar/reabrir: seis secciones, dos subsecciones, dieciséis preguntas, lectura/debate íntegros y total de puntos invariable. El orden visible y etiquetas originales no son las claves internas.

Introducir omisiones/asociaciones inválidas: conservar borrador/avance y avisos localizados; no permitir cobertura completa o publicación pendiente. Comprobar el fallback de proveedor de texto sin inventario: texto conservado y revisión pendiente, no éxito plano silencioso.

### Edición, estudiante y versiones

Editar una instrucción, mover una pregunta entre secciones, duplicar/agregar/eliminar de forma explícita y guardar. Verificar identidades/claves, conflictos409, recarga y borradores de navegador. No perder el documento al usar un guardado de impresión o un cliente sin el campo nuevo.

Probar permisos propietario, administrador autorizado, otro docente y estudiante. El alumno ve contenido público y sus controles de respuesta, no soluciones/procedencia privada. Fijar una versión, editar un borrador posterior y comprobar que entrega/calificación/ayuda anterior no adoptan el documento vivo.

### PDF y Word

Generar ambos formatos a partir del mismo documento validado y renderizarlos para revisión visual. Verificar título/subtítulo, lectura intermedia, instrucciones, debate y numeración, cero duplicación de lectura y cero soluciones en copia estudiante. Probar compacta/media/amplia, texto largo, título próximo a final de hoja y figura compartida. Confirmar que todos los contenidos permanecen y los modos no prometen un número de páginas imposible.

### Contexto y privacidad

Capturar prompts simulados: principal, segundo evaluador y confirmador contienen el mismo contexto educativo de la versión y ningún contenido queda truncado. El scaffold mantiene exactamente dieciséis preguntas. Xali y devoluciones nuevas reciben proyección pública revisada, sin claves no liberadas. Publicaciones y enlaces legacy conservan payload/fingerprint y funcionamiento.

### Puntaje opcional por sección

Comenzar con opción apagada y comprobar valores originales intactos. Activarla sobre una muestra con tres grupos de distinto tamaño y presupuestos2+2+1 sobre5. Revisar/confirmar el reparto proporcional y comprobar sumas exactas por sección y evaluación; subtotales de respuestas1,5+1+0,5 deben producir3 sobre5, sin multiplicación o suma adicional de presupuestos.

Probar pesos internos iguales/desiguales, entrada con coma, redondeos de tercios, cambio repetido de presupuesto sin deriva, monto no representable y suma incompleta/excedida. Padre e hijo no pueden contribuir dos veces; una lectura/debate sin preguntas no recibe puntos. Cambiar pregunta de sección, añadir/quitar preguntas o cambiar nota máxima exige revisar la propuesta antes de guardar. Probar desactivación con vista previa/restauración confirmada de pesos base.

Guardar, reabrir, copiar, PDF/Word y prompts de los tres evaluadores deben usar los mismos máximos canónicos. Las versiones/entregas previas mantienen sus valores. Recuperar organización no activa ni modifica pesos por sección sin una acción posterior expresa sobre la copia.

### Recuperación y copia

Consultar transcripción sintética autorizada, preparar organización y confirmar una copia en la misma materia bajo intención de recuperación. La copia normal hacia otra materia mantiene sus reglas. Repetir solicitud, simular timeout después de guardar, cambiar fuente y revocar permiso. Comprobar como máximo un borrador, errores claros y cero alteración del original/notas/evidencias/enlaces.

Sin archivo original, devolver procedencia de texto y faltantes; no declarar figuras recuperadas ni generar una URL de original inexistente. El caso real queda pendiente hasta código y controles, sin persistir su contenido en fixtures ni CI.

### Responsividad

Playwright Chromium/WebKit a360/390/768/1440 px, ambos temas, texto ampliado y altura de viewport reducida. Verificar índice/sección/pregunta actuales, lectura accesible, movimiento por botones, foco/restauración, scroll del contenido y acciones de guardar. Capturas de fixtures únicamente; no son prueba de dispositivo físico.

## Comandos de cierre previstos

Desde `frontend`: `npm run typecheck`, `npm run lint:strict`, `npm run test:run`, `npm run build`, E2E nuevo y regresiones de digitalización/editor/visuales/impresión/copia. Verificar particionado efectivo y ejecución de los casos nuevos en ambos navegadores.

Desde `backend`: migración en base aislada, `python -m pytest tests/unit -v` y `python -m pytest tests/integration -v` con configuración de test explícita; regresiones dirigidas de documento, lectura, visuales, versiones, publicación, contexto y copias. Verificación real de PDF/Word sin red/credenciales.

Regenerar/verificar inventario, gobernanza y baseline aplicables. Ejecutar Analyze antes de implementar y Converge al terminar; registrar comandos, totales, versiones y limitaciones reales. PR enlazado a #274, sin fusión ni despliegue antes de autorización y CI verde.

## Avance verificado — fundamentos (2026-10-26)

- Aprobación nueva del diseño ampliado, dos listas completas (16+10 criterios de calidad) y Analyze:20 FR/8 SC cubiertos por25 tareas, sin bloqueos. No son resultados de funcionamiento.
- RED inicial: faltaba módulo documental; luego faltaba campo opcional; regresiones escritas antes del código.
- Unitario: `python -m pytest tests/unit/test_document_structure.py tests/unit/test_evaluation_reading.py tests/unit/test_evaluation_visual_contract.py -q`: **69 aprobadas**,3,31s. Contrato, jerarquía, cobertura, DTO público y compatibilidad visual/lectura.
- Integración: `python -m pytest tests/integration/test_document_persistence.py -q --maxfail=2`: **5 aprobadas**,33,91s. Migración sin backfill, snapshot textual sin visuales ficticios, reapertura/proyección, versión previa inmutable, conflicto, bloqueo legacy con entregas y borrado/huérfanos rechazados.
- Entorno: Python local3.13 para esta primera tanda; PostgreSQL16 pgvector temporal `xcal-spec130-document-db`, puerto dedicado loopback55418, sin volúmenes ni datos reales. Runtime3.11 de contenedor, regresiones completas, editor, recuperación, puntajes, PDF/Word y CI todavía pendientes. No se afirma entrega completa ni producción actualizada.
- US1: primera tanda de digitalización/documento+regresiones56/56; segunda tanda de digitalización, worker y cola56/56,4,61s. Incluye numeración reiniciada, referencias no ambiguas, transcripción literal de lecturas/actividades en vez de resúmenes, rescate de contenido omitido para revisión, identidades deterministas, una sola petición simulada y cierre atómico sin commit tras perder el lease. Los totales se solapan; no sumarlos como pruebas únicas. Nuevas escrituras protegidas por bandera apagada por defecto; jobs antiguos conservan su estrategia. Sin pruebas de reconocimiento real o gasto de IA.

## Cierre local verificado — 2026-10-26

Las tandas siguientes sustituyen los pendientes técnicos de la primera tanda, salvo las limitaciones explícitas. No sumar pruebas solapadas ni interpretar fixtures como una evaluación de precisión OCR con documentos reales.

| Comprobación | Ejecución efectiva y resultado |
| --- | --- |
| Backend completo | Python3.11.15 en imagen QA, código montado de solo lectura, red desactivada: `python -m pytest tests/unit -q --disable-warnings --maxfail=2 -p no:cacheprovider`: repetición final **1.532 aprobadas**,79,33s, cinco avisos de deprecación; incluye la regresión adicional de fórmula |
| Regresión adicional de fórmula | Después de añadir la comprobación del scaffold y la suma real2+2+1: `python -m pytest tests/unit/test_document_grading_context.py tests/unit/test_section_scoring.py tests/unit/test_document_exports.py -q --disable-warnings -p no:cacheprovider`: **23 aprobadas**,4,78s, Python3.11, red desactivada |
| Persistencia y copias | `python -m pytest tests/integration/test_document_persistence.py tests/integration/test_document_recovery.py tests/integration/test_evaluation_copy.py -q --disable-warnings --maxfail=1 -p no:cacheprovider`: **22 aprobadas**,212,08s; solo PostgreSQL16 sintético loopback55418 y esquemas temporales. Incluye migración aditiva, protección del downgrade, conflictos, permiso revocado, pérdida de lease, idempotencia y remapeo de presupuestos |
| Frontend completo | Repetición final `npm.cmd run test:run -- --maxWorkers=2 --reporter=dot`: **1.020 aprobadas**,165 archivos,218,35s. Incluye los dos casos nuevos de navegación. Una tanda con Docker y cuatro navegadores simultáneos agotó los10s de un caso de rúbrica: pasó aislado en3,29s y después pasó la batería completa sin cambiar límites, pruebas ni workflows. La consulta de capacidades del test de materia quedó simulada; repetición dirigida13/13 |
| Navegador | `$env:PLAYWRIGHT_TEST_PORT='4186'; npx.cmd playwright test e2e/evaluation-document-structure.spec.ts --workers=2 --max-failures=1 --reporter=line`: **28 aprobadas**,14 Chromium+14 WebKit,4,7min. Tras corregir también el contexto inicial general, repetición íntegra con `--fully-parallel --workers=4`, mismo límite y cero reintentos: **28 aprobadas**,3,4min.360/390/768/1440 px, dos temas, texto18 px, altura560 px; edición, confirmación, capítulos con subsecciones, copia y respuestas por número académico. Capturas sintéticas revisadas; sin prueba de teléfonos físicos |
| Calidad y compilación | `python -m ruff check --select F401,F821,F822,F823,F841 app tests`, `npm.cmd run build` (incluye TypeScript) y `npm.cmd run lint:strict`: aprobados. Vite avisa del chunk mayor de500kB, sin fallo de compilación |
| Contenedores | `docker build --target runtime -t xcal-spec130-backend:qa backend` y `docker build -f frontend/Dockerfile -t xcal-spec130-web:qa .`: aprobados. Solo imágenes locales; no se iniciaron servicios. La prueba inicial con `--network none` no tenía todas las capas en caché y falló al resolver paquetes; la construcción normal terminó sin modificar Dockerfiles o dependencias |
| Inventario | `python scripts/build_system_inventory.py --write` y `--check`: **663 superficies**, sin deriva; `git diff --check` sin errores |

Las regresiones de PDF/Word comprueban contenido, etiquetas reiniciadas, lectura/debate íntegros, figura compartida única, ausencia de soluciones/procedencia y subtotales derivados de puntos canónicos. `backend/scripts/qa_document_structure.py` genera tres PDF y tres DOCX con la aplicación real, sin base de datos ni IA. PDF se renderizó y revisó en sus3/3/4 páginas (compacta/media/amplia): lectura continua, títulos y tabla legibles, sin contenido cortado o repetido.

**Word verificado**: el primer intento con el runtime de documentos falló con `LibreOffice soffice.exe was not found on PATH`. El usuario autorizó expresamente usar un contenedor QA local; no se usó su LibreOffice de escritorio. Imagen temporal `xcal-spec130-word-renderer:qa`, LibreOffice25.2.3.2, Poppler25.03 y pdf2image1.17.0. La instalación descargó dependencias únicamente para ese conversor, fuera del código y de las imágenes de aplicación; el primer chequeo detectó que faltaba pdf2image y se añadió solo allí. Conversión con el `render_docx.py` empaquetado, usuario1000, raíz/entradas de solo lectura, `--network none`, sin privilegios, memoria1GB y `/tmp` temporal. Solo se montaron muestras sintéticas y el renderer.

Los tres Word generaron3/3/4 páginas (compacta/media/amplia); se inspeccionaron las diez PNG. Conservan seis secciones, dos subsecciones, lectura, debate, tabla única, dieciséis preguntas y sus puntos, con títulos acompañados de contenido y sin recortes, superposiciones o glyphs ausentes. La lectura larga continúa en la hoja siguiente cuando corresponde. No se modificaron los DOCX ni el exportador para acomodar la muestra. Las páginas y PDF del renderer son QA interna, no entregables finales ni prueba de cada versión de Microsoft Word.

Regresiones adicionales de edición: una selección explícita de un capítulo con subsecciones podía ser sustituida por el padre inmediato de la primera pregunta; una pregunta de contexto general podía abrir inicialmente otra sección. Ambos casos RED reproducidos en `EvaluationDocumentOutline.test.tsx`; corregida la sincronización entre selección de sección y navegación externa por pregunta y la distinción entre padre null y pregunta no seleccionada. Se añadió recorrido de navegador390/1440 en ambos motores. No cambia datos académicos ni el reparto de puntos.

**Gobernanza histórica durante implementación**: `python -m pytest tests/spec_governance -q --disable-warnings --maxfail=2` dio60 aprobadas y un fallo del baseline mientras130 conservaba tareas pendientes. Una primera ejecución restringida falló además al crear temporales de Windows; la repetición con acceso al temporal eliminó esos errores de entorno, no el control legítimo de tareas. No se excluyó esta especificación ni se rebajó el control: la revisión Word y las regresiones se completaron realmente antes de volver a validar. CI remoto debe verificarse después de publicar el PR; no se afirma fusión, despliegue ni activación de130.

`node scripts/verify-e2e-shards.mjs 4` comprobó**564 casos**, particiones151/143/132/138, cero casos ausentes y cero duplicados; el workflow ya instala Chromium y WebKit. La primera revisión Converge evaluó20 FR+16 criterios de aceptación+8 SC, siete decisiones del plan y ocho principios constitucionales. Encontró dos pendientes parciales: F1(HIGH), revisión visual Word; F2(MEDIUM), cierre de validación y preparación de PR/CI tras F1. Añadió únicamente T026/T027 bajo Phase8; ese primer resultado no declaró convergencia completa. Sin hooks de extensión registrados.

**Cierre final**: gobernanza **61/61**,16,31s, con el mismo baseline y tareas realmente completas; inventario663 sin deriva y revisión de whitespace aprobados. Converge final revisó20 FR,16 escenarios de aceptación,8 SC,7 decisiones y8 principios constitucionales: **cero pendientes**, sin añadir otra fase y con `tasks.md` byte a byte sin cambios durante esa revisión. El PR preparado enlaza274, exige las aprobaciones existentes y CI; no incluye permiso de fusionar, activar bandera ni desplegar. No se cambió ningún timeout para cerrar las pruebas.

## Operación y reversión

`EVALUATION_DOCUMENT_STRUCTURE_ENABLED=false` por defecto controla admisión y edición nuevas; la API de capacidades comunica `documento` al editor. Solo habilitarla después de migración y despliegue coordinado de backend, workers y frontend desde un commit aprobado. No requiere cambiar proveedores, modelos ni fórmulas de nota.

Para revertir admisión, apagar esa bandera y conservar columna, documentos, snapshots y archivos. La migración impide un downgrade destructivo. Un ejecutable antiguo no se considera compatible para editar documentos nuevos. No se hizo backfill, recuperación real, recalificación ni alteración de evidencias o publicaciones históricas.

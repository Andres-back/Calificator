# Investigación y decisiones: escaneo de evidencia

**Fecha**: 2026-10-26; ampliación de acercamiento2026-10-27. Inspección del repositorio y documentación primaria; no prueba de estudiantes, hardware, exactitud de OCR o producción.

## Diagnóstico comprobado en main0f4a336

**Enmienda de alcance2026-10-27**: las decisiones originales sin llamadas extra describen el modo local; historia6 añade únicamente ayuda geométrica visual opcional después de abstención. Esta excepción no se aplica a zoom, calificación o reconstrucción. MiMo no está todavía medido en este flujo. Documentación primaria: [comprensión de imágenes MiMo](https://mimo.mi.com/docs/en-US/quick-start/usage-guide/multimodal-understanding/image-understanding) admite imágenes base64 y la familia2.6; [OpenCode Go](https://docs.opencode.ai/docs/go/) publica MiMo2.6Flash. Usar el perfil/base efectivos configurados, no asumir que cualquier endpoint histórico sigue vigente. Validación estricta, un solo intento y manual/original prevalecen sobre automatismo. Se descarta generación de imágenes porque no puede garantizar conservar respuestas observadas.

**Preflight de la prueba autorizada**: consulta de solo lectura al catálogo configurado encontró `mimo-v2.6-flash` activo, pero capacidades `[text]` y perfil de transporte vacío. No se realizó ninguna inferencia ni se extrajo la credencial del servidor; presupuesto consumido0/3. El control de seguridad rechazó suplir el perfil por un formato supuesto: no se ejecutó ese cambio ni un camino alternativo. Antes de enviar las copias reales hace falta autorizar una verificación sintética del formato documentado, contando dentro de las tres llamadas, sin modificar catálogo/routing de producción. T038 sigue pendiente; no se declara latencia o calidad de esquinas MiMo medidas.

1. `nativeCapture.ts` solicita la cámara del dispositivo en móviles; `CameraCapture.tsx` captura webcam hasta2560px. Conservarlo y añadir revisión después de recibir la foto, no volver al recuadro de cámara móvil.
2. `MultiPageEvidencePicker.tsx` mantiene fuentes `File`, calidad, giro y contexto/epoch. Ejecuta análisis de las adiciones con `Promise.all`; el modo de escaneo debe compartir una cola acotada de calidad/preview, no decodificar diez fuentes simultáneas.
3. `imageQuality.ts` reduce la muestra a384px, pero primero carga una imagen completa. Esa reducción no elimina el riesgo de decodificar una foto enorme. Sus avisos no demuestran que un lápiz sea legible.
4. `evidence_bundle_service.py` reduce a2600px y aplica autocontraste/enfoque antes de construir JPEG/PDF. `router.py` guarda el bundle; no se observa conservación individual garantizada de las fuentes nuevas en esa ruta. `image_preprocessing.py` y `agents.py` pueden volver a preparar las páginas para modelos a2200px. `vision_extractor._pages` y `_one` añaden otros puntos de preparación de la imagen, incluidas orientaciones alternativas; el nuevo resolvedor debe cubrir ambos consumidores, no solo `agents.py`.
5. Metadatos del bundle actual incluyen nombres, giros y cantidad; `visual_text_json` se limpia al admitir/procesar. Un manifest de fuentes no debe depender únicamente de ese campo.
6. `revision_service.py`, `evidence_service.py` y `storage_service.py` ya ofrecen historial, lectores autorizados y almacenamiento privado: ampliar esos mecanismos, no crear otra aplicación de evidencias ni exponer claves de archivos.

## Decisión A — Propuesta geométrica revisable

### Resultado de la muestra visual autorizada (2026-10-27)

Se consumieron exactamente3 llamadas, sin reintentos ni escritura productiva. Credencial solo en memoria del servidor, consultas del catálogo en transacción de solo lectura, fotos de prueba sin EXIF y sin identificadores. DeepSeek V4.1 Flash: imagen artificial1.744s de proveedor, geometría válida dentro del límite inclusivo original0.025; el cálculo binario inicial comparó0.025000000000000022 como mayor y se conserva ese informe, con revisión decimal exacta separada, sin repetir la llamada o ampliar el umbral. MiMo2.6Flash: imagen artificial2.961s; observa la hoja pero devuelve coordenadas cercanas a0..1000 en lugar de0..1, por lo que el contrato normalizado la rechaza, sin convertir unidades silenciosamente.

La tercera llamada, solo a DeepSeek tras la comprobación, usa una copia real ya anónima:2.233s de proveedor y9.400s totales del laboratorio incluyendo SSH/inicio de Python, no latencia móvil medida. Propuesta válida; auditoría local con el preparador real conserva21/21 zonas anotadas en natural y21/21 en lectura suave, fuente SHA intacta y revisión visual sin cortes de respuestas. No es una comparación representativa de modelos, precisión de OCR/calificación o garantía de esquinas exactas; la muestra ya tenía una franja anonimizada y bordes recortados. Tres llamadas agotadas, no hay presupuesto para más sin autorización.

OpenCode informó `usage.cost=0` y cargo a cupo Go en los tres resultados; coste de lista agregado indicado por el proveedor0.00038209USD, no un cobro adicional demostrado. Informes/respuestas/fotos permanecen privados en `tmp/spec131-private-real-20261027/vision-corners/`, fuera de Git/CI. El experimento no publica pruebas de compatibilidad ni modifica modelos/rutas productivas. Para activar la nueva etapa se mantiene la comprobación administrativa del perfil exacto y su credencial; no convertir un ensayo local en comprobación guardada ficticia. [Visión DeepSeek](https://api-docs.deepseek.com/guides/vision/) y [control de razonamiento](https://api-docs.deepseek.com/guides/thinking_mode/) respaldan el formato experimental; la documentación de [OpenCode Go](https://dev.opencode.ai/v2/docs/console/go/) lista ambos modelos.

**Elección**: contornos y aproximación cuadrilateral, abstención ante ambigüedad y ajuste manual; corrección proyectiva desde cuatro esquinas no degeneradas. Sin requisito A4 o selección automática incondicional del mayor contorno.

**Motivo**: hojas y tiras de respuestas tienen proporciones distintas; una tabla interior puede ser el rectángulo más contrastado. La geometría no certifica que todo el contenido esté dentro.

**Alternativas descartadas**: recortar todo rectángulo detectado; obligar a cuadrar manualmente todas las fotos; usar una imagen generativa como evidencia mejorada. Descurvado de cuadernos queda fuera del primer alcance.

Fuentes: [contornos](https://docs.opencv.org/4.13.0/d5/daa/tutorial_js_contours_begin.html), [aproximación](https://docs.opencv.org/4.13.0/dc/dcf/tutorial_js_contour_features.html), [perspectiva](https://docs.opencv.org/4.13.0/dd/d52/tutorial_js_geometric_transformations.html). La interpolación cambia píxeles: no llamarla copia idéntica del original.

## Decisión B — Preservación antes que papel blanco

**Elección**: perfil natural en color y lectura suave opcional, con parámetros acotados sobre luminancia y comparación. Umbralización solo para detectar, nunca como evidencia final predeterminada.

**Motivo**: la umbralización reduce los niveles de los píxeles a clases; inferimos riesgo de perder lápiz, color o trazos finos. CLAHE puede amplificar ruido. La idoneidad de un perfil debe medirse sobre marcas, no deducirse de la documentación.

**Descartado**: blanco/negro duro, limpieza de manchas sobre respuestas, morfología que borre trazos, enfoque fuerte o completar partes ilegibles.

Fuentes: [umbrales](https://docs.opencv.org/4.13.0/d7/dd0/tutorial_js_thresholding.html), [CLAHE](https://docs.opencv.org/4.13.0/d2/d74/tutorial_js_histogram_equalization.html). No hay inferencias pagadas para preparar la imagen; CPU, descarga del módulo y almacenamiento siguen teniendo coste operativo.

## Decisión C — Preview local y derivado canónico reproducido

**Elección**: OpenCV.js en Worker único, versión/hash fijados, con detección pequeña y preview; OpenCV headless en worker servidor valida/reproduce desde la fuente. Preferir una implementación geométrica compartida conceptualmente y contrastada por fixtures, no confiar en un JPEG arbitrario suministrado como derivado.

**Motivo**: preview sin ida/vuelta con la fotografía, CPU de servidor para la salida controlada y original verificable. La preparación final es una etapa corta del job existente, antes de la IA. No prometer igualdad binaria entre runtimes o mejora de velocidad hasta medir.

**Alternativas**: Pillow admite perspectiva y sigue siendo útil para validación/EXIF/codificación, pero no incluye el detector de contornos. Añadir una solución lineal propia y filtros no contrastados solo para evitar una dependencia aumentaría el riesgo de incoherencia. Escaneo solo en servidor añade una subida/espera para cada ajuste; solo en cliente no aporta reproducción validada independiente. Ninguna alternativa justifica borrar el original.

Fuentes: [transformación Pillow](https://pillow.readthedocs.io/en/stable/reference/Image.html#PIL.Image.Image.transform), [Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers), [decodificación en Worker](https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/createImageBitmap), [OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas).

## Decisión D — Memoria, CSP y formatos son parte del gate

**Elección**: carga diferida local monohilo; una fuente decodificada; liberar buffers y matrices; perfil inicialmente limitado a16MP. Verificar build OpenCV.js con CSP sin `unsafe-eval`; permitir solo `wasm-unsafe-eval` donde resulte indispensable y esté aprobado/probado. Sin COOP/COEP globales por este cambio.

Un búfer RGBA de4000×3000 ocupa48.000.000 bytes; varias matrices y canvas pueden coexistir. Es aritmética de memoria, no medición de un teléfono. No usar `thumbnail` como excusa para ignorar la decodificación inicial, ni desactivar globalmente avisos de bombas de descompresión.

**Formatos**: JPEG/PNG/WebP actuales. Safari puede soportar HEIC, pero eso no implica soporte del pipeline instalado o de Android/Windows; no anunciarlo sin validar ni convertir mediante un tercero.

Fuentes: [liberación OpenCV](https://docs.opencv.org/4.13.0/de/d06/tutorial_js_basic_ops.html), [transferibles](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects), [seguridad Pillow](https://pillow.readthedocs.io/en/stable/handbook/security.html), [CSP para WASM](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src#unsafe_webassembly_execution), [pthreads](https://emscripten.org/docs/porting/pthreads.html), [Safari17/HEIC](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/).

## Decisión E — Fuente privada, versión de lectura y cero doble filtrado

**Elección**: manifest independiente nullable, archivos originales privados, derivado preparado una vez y hashes/receta/versión guardados. Recalificar usa el mismo manifest; cambiarlo genera una revisión expresa de evidencia. Roles de IA consumen páginas preparadas directas, no reconstruidas a partir del PDF de consulta.

**Motivo**: conservar contexto probatorio y eliminar degradación evitable JPEG/PDF/raster/JPEG. No se aumentan las imágenes/calls del prompt. Legacy queda en su ruta; no se inventan originales pasados ni se recalifican notas.

La retención de originales y derivados aumenta disco: medirlo y comprobar los lectores y limpiadores de toda referencia histórica. Fallo de fs/DB/cola no autoriza borrar un archivo que un job confirmado podría usar.

## Decisión F — Colores derivados del estado, no otro evaluador

**Origen**: el usuario indicó «adelante» y solicitó correctas verdes, revisión amarilla e incorrectas rojas en el plan. Inspección local: `GradeBreakdown.tsx` usa morado para selección, badges incorrectos neutros y símbolo de acierto para toda explicación sin aviso; `Badge.tsx` ya dispone de success/warning/error.

**Elección**: helper puro de presentación por componente, prioridades explícitas y tono compartido entre botón, badge y tarjeta. Conservar la selección mediante contorno y `aria-current`, sin ocultar el color académico. Textos/iconos hacen comprensible el resultado sin depender solo de color.

**Límites**: cero escrituras o inferencias nuevas; no inferir corrección desde una nota cero, no confundir foto ilegible con respuesta incorrecta ni reabrir avisos históricos resueltos. Amarillo identifica también parciales/incompletas con etiquetas propias, sin añadir bloqueos académicos. No necesita otra librería o migración, y puede verificarse independientemente del escáner.

## Decisión G — Fragmento real por pregunta con referencia opcional de ubicación

**Origen**: el usuario pide ampliar el área de la respuesta seleccionada en el desglose. Inspección local: `ExtractedAnswer` conserva `page`/`source_pages` sin coordenadas; `breakdown_policy.py` guarda páginas en `evidencia_json`, `breakdown_service.py` proyecta `evidencia_paginas` y `ComponenteRead`/`GradeComponentData` no definen regiones. `CalificacionesWorkspace.tsx` selecciona primera hoja asociada y abre evidencia completa; `GradeBreakdown` solo ofrece «Ver hoja N». No existe hoy una ubicación exacta que baste conectar a un botón de zoom.

**Elección**: zoom manual/hoja completa compatible y fragmento sugerido cuando una región opcional de la extracción existente está asociada a la identidad canónica, página y versión verificadas. Reutilizar JSON/instantáneas de componentes y proxy autorizado. Acercamiento cerca de la respuesta, visor amplio por gesto, continuaciones disponibles y edición de puntaje preservada; ninguna foto nueva enviada ni otro calificador. La ampliación no requiere OpenCV.

**Límites**: la validación geométrica no acredita que el modelo eligiera bien la respuesta; mantener «Ubicación sugerida» y hoja completa. No forzar ubicaciones, llamadas adicionales o backfill de entregas viejas. Marco, orientación y versión explícitos: no aplicar cajas de páginas preparadas sobre originales o sobre una evidencia reemplazada. Un PDF permite ampliar su página existente sin incorporarlo al alcance de preparación fotográfica. No reutilizar `procedencia.region` del material de evaluación como si localizara escritura de un alumno.

**Alternativas descartadas**: ampliar solo la transcripción; recortar las imágenes que reciben los modelos a la respuesta seleccionada; guardar y compartir otro archivo con cada fragmento; pedir una inferencia nueva cada vez que el profesor navega; estimar una banda según número/orden de pregunta. Estas opciones no verifican la evidencia completa o añaden precisión ficticia, gasto y exposición innecesarios.

## Estado de investigación

### Adaptación comprobada del Worker y del editor —2026-10-27

El artefacto upstream usa un envoltorio UMD que no funciona directamente como ESM. Se conserva `opencv.js` intacto y se deriva `opencv-module.js` mediante `scripts/evidence-scan/adapt-opencv-module.mjs`: cambio mínimo de raíz a `globalThis`, `locateFile` relativo al módulo y exportación de la promesa; sin eval o fuentes nuevas. Hash del adaptador generado `40e274e69b5e0be2500bf7af56c4be3cf3ff74dd4d51797335206c59e4bf6c98`,134768 bytes; manifiesto y SHA256SUMS lo fijan. Verificación de las dos variantes en Chromium149/WebKit26.5: cuatro combinaciones aprobadas, cero infracciones CSP. Vite sirve ese ESM fijo sin reescribirlo. Nginx permite `wasm-unsafe-eval` exclusivamente en el asset Worker, no en HTML o JavaScript general; la cámara sigue reservada a las páginas, no al Worker.

WebKit26.5 de Playwright ofrece `createImageBitmap` pero no `OffscreenCanvas` dentro del Worker. Se verificó esa capacidad, no se infiere de la marca o UA. El puente de compatibilidad comprueba cabecera/píxeles antes de decodificar, reduce a1600px y transfiere RGBA; la detección/perspectiva/luminancia siguen en el Worker. Canvas/bitmaps se liberan y la cola del puente es serial incluso entre montajes cancelados, porque una decodificación nativa en curso no se puede cancelar instantáneamente. El JPEG de preview se codifica en el navegador cuando falta ese lienzo. Chromium usa la vía Worker completa. No confundir esta medición de escritorio con compatibilidad o memoria de un iPhone físico.

La detección rechaza bordes ondulados, oscuridad sin contraste geométrico, varias hojas comparables y encuadres ambiguos; una propuesta mantiene un pequeño margen exterior y exige revisión. Banco congelado sin ajustes de composición:24 propuestas y6 abstenciones por motor;20/20 casos automáticos conservan dentro de la propuesta las regiones/márgenes anotados. Es una comprobación geométrica, no fidelidad de todos los trazos ni precisión de OCR. Reflejos pueden conservar un borde claro y haber perdido texto: el editor avisa del límite y nunca promete recuperar respuestas. La validación completa de perfiles sigue abierta.

### Gate de artefacto iniciado el2026-10-27

El paquete candidato OpenCV.js4.12.0-release.1 falla al prohibir ejecución dinámica de cadenas: dos `new Function` y `EvalError` durante inicialización. Se rechazó sin relajar CSP. Build mínimo del tag oficial4.13.0, etiqueta anotada `2e1f8da65e4f9fa1a98423e6ac223187438a4db8` y commit de código comprobado `fe38fc608f6acb8b68953438a62305d8318f4fcd`, obtenido mediante `scripts/evidence-scan/Dockerfile.opencv-js`:3.25MB JS/WASM, hashes y licencia en `frontend/public/vendor/opencv/4.13.0-csp1/manifest.json`, sin dependencia npm. Contornos/perspectiva pasan en Worker Chromium/WebKit con permiso WASM solo en la respuesta del Worker y sin ejecución dinámica JS; memoria inicial128MiB y máximo compilado512MiB. Faltan captura/preparación integrada, límites de fotos reales y teléfonos físicos. La documentación de [Emscripten DYNAMIC_EXECUTION](https://emscripten.org/docs/tools_reference/settings_reference.html#dynamic-execution) describe el modo sin `eval/new Function`; el [script oficial4.13.0](https://github.com/opencv/opencv/blob/4.13.0/platforms/js/build_js.py) admite flags y módulos acotados. Resultados completos y límites en `quickstart.md`.

Decisiones de diseño resueltas, incluidos colores y acercamiento contextual solicitados. Aprobación, issue276, tareas y análisis registrados antes de código. Captura, lectores y almacenamiento/historial canónico ya tienen implementación y pruebas locales con admisión apagada; quedan abiertas conservación integral, reconciliación de archivos, recursos finales y dispositivos. Imágenes reales y comparación con modelos requieren autorización separada y presupuesto explícito. Banco congelado antes de calibrar para evitar seleccionar solo resultados favorables.

### Memoria nativa: fallo reproducido y corrección sin ampliar presupuesto

Una foto16MP válida fallaba al materializar un RGB completo adicional mediante `np.asarray(PillowImage)`; su `tobytes` construía bloques y otra unión completa. El límite de512MiB es de espacio virtual, no de RSS. Además, el contexto de archivo no liberaba por sí solo todos los píxeles decodificados del primer fotograma.

Se conserva la misma decodificación/orientación y se llena una matriz RGB contigua por franjas de64 filas con la conversión exacta y composición alfa blanca anteriores. Se cierran los fotogramas antes de CV y se libera la entrada al terminar la perspectiva. Sin cambiar algoritmo geométrico, codificación,512MiB/CPU5s/pared8s o modelos.60 comparaciones del banco confirman salida binaria idéntica a la conversión previa y27 preparaciones16MP terminan dentro del límite. Por esa equivalencia no se cambia la versión de receta/algoritmo; el detalle reproducible y sus límites se registran en `quickstart.md`.

### El motor del navegador no define por sí solo el marco EXIF

Comparación cruzada del banco detectó que WebKit26.5 no orientaba los PNG eXIf5–8 mientras Chromium y Pillow sí. La receta previa usaba dimensiones de bitmap no normalizadas; servidor la rechazó correctamente, sin calificar una orientación distinta. Se cambió la decodificación del escáner (no fuentes persistidas) para retirar EXIF de una copia local codificada y aplicar una única transformación explícita en canvas. Se conservan chunks de píxeles/color y se comprueban límites antes de abrir el bitmap. El soporte JPEG/PNG/WebP tiene pruebas de bytes y los ocho marcos; se respetan estructura RIFF, tamaño y flag de metadatos de la [especificación WebP](https://developers.google.com/speed/webp/docs/riff_container).

La nueva comparación de120 previews/canónicos coincide en dimensiones en ambos motores; métricas de píxeles/contraste se registran sin convertirlas en afirmación de exactitud de OCR ni retención integral de cada signo. Por ser corrección del marco EXIF declarado, no otro filtro/perfil, no se modifica la versión canónica del servidor o recetas previamente fijadas.

### Cierre de fidelidad observable y codificación de primera entrega

Empaquetado previo a publicación28 de octubre: `git diff --cached --check` detectó líneas vacías con espacios en los wrappers generados de OpenCV. El adaptador reproducible ahora normaliza únicamente esas líneas y el LF final, conserva código ejecutable/WASM/licencia y regenera manifiesto y SHA256SUMS. Los hashes históricos descritos arriba corresponden al artefacto anterior a esa normalización, no al paquete final. Hash final clásico153aad5d3c265eed6335c69923db0a3cf8b3c85c3ef48d9ee5728732b5739aee; ESM368e0c20957c40ba1fe7056b1b520e196fa7274d954cbed339a74707573bb9e6 (134758 bytes); WASM inalterado13d3ffa6f38f25744e0e8aed6072e0bcbe1d1c7f0476a0b8f31034a95b69d7fa. Se repitieron las cuatro combinaciones de contornos/perspectiva/Worker/CSP y hashes, aprobadas sin infracciones. No es cambio de algoritmo fotográfico ni ampliación de permisos CSP.

Resultado posterior de FR-032/033: permitir una caja exterior conservadora para bordes curvos añade una propuesta al banco, sin cambiar las referencias congeladas ni los umbrales de conservación. Los tres ensayos nuevos de la fase15 responden, pero la geometría remota del caso03 era demasiado interior. Por ello se separa «respuesta geométricamente válida» de «contenido conservado»: el cliente agrega caja exterior/margen6%, vista de fuente completa y confirmación humana. La muestra corregida retiene37 zonas; no respalda el uso automático sin revisión. Los informes negativos/raw se conservan en privado y no se gastan nuevas llamadas para ocultar ese resultado. Detalle reproducible y límites en quickstart.

La auditoría por signo fija NCC≥0.90, relación de contraste local≥0.50 y desviación de crominancia p95≤15/255 antes de evaluar. Controles negativos detectan la desaparición de un solo punto decimal aun con MAE global<0.13, cambio de tinta y recorte; las marcas ya ilegibles de la foto se cuentan por separado, nunca como restauradas. Se añaden casos nativos independientes con lápiz gris210, fracciones/barra, exponentes, VF azul, tachón rojo y dibujo fino sin retirar casos del banco congelado.

El prototipo de JPEG92 falló el criterio de color en signos pequeños, especialmente la preview del navegador con subsampling. Antes de la primera entrega se adoptó preview PNG sin pérdida y canónico JPEG96 sin subsampling, respetando2200px/2.5MB; se incrementó el algoritmo a `opencv-4.13.0-scan2`. El informe negativo se conserva. La repetición completa usa exactamente los bytes de fuente exportados y verifica SHA; generadores Linux/Windows tenían distinta serialización PNG pero todos los píxeles RGB orientados de las30 fuentes eran idénticos, comprobados antes de vincularlos.

Resultado Linux/OpenCV4.13.0.92/Pillow13/NumPy2.4.6:3065 referencias observables retenidas y46 ya no observables por cada combinación motor/perfil/salida; cero pérdidas/recortes en24.520 comprobaciones observables. Comparación120/120 con dimensión igual y MAE máximo0.429/255. Esto demuestra conservación sintética dentro de criterios anotados; no certifica una transcripción humana/OCR ni exactitud de nota o teléfonos. Informes y reproducción en quickstart.

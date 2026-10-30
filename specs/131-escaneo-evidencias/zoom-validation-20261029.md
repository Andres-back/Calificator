# Comprobación del acercamiento por respuesta —29 de octubre de2026

**Seguimiento**: [#289](https://github.com/Andres-back/Calificator/issues/289), continuación de US5/FR-022–026/SC-010 del alcance aprobado en [#276](https://github.com/Andres-back/Calificator/issues/276). No amplía el escáner ni cierra su seguimiento físico285.

## Hallazgo y reparación acotada

El visor ya admite regiones versionadas, verifica la hoja y centra la imagen al seleccionar una pregunta. La consulta productiva de diagnóstico fue de solo lectura y exclusivamente agregada:2292 componentes activos sin regiones;197 extracciones con2288 respuestas, ninguna con regiones. No se descargaron fotos ni respuestas para esa consulta.

El prompt anterior mencionaba ubicaciones opcionales, pero no incluía `regions` en su ejemplo JSON. El cambio pide ese campo por respuesta visible y la identidad exacta disponible, describe el marco superior izquierdo/anchura/altura y admite `[]` cuando no hay ubicación fiable. Se mantiene la transcripción literal como prioridad y no se deduce una nota o error desde la presencia/ausencia de una caja.

La política de extracción sigue en versión3: los checkpoints son por trabajo, y una lectura de un trabajo nuevo utiliza el prompt nuevo. Elevar la versión invalidaría innecesariamente recuperaciones en curso. No se cambian límites, proveedores, intentos, fórmulas o estados; las calificaciones históricas no se localizan ni recalifican automáticamente.

En frontend se distingue «Vista cercana de esta respuesta» tras verificar versión/hoja de «No hay una zona localizada… Puedes ampliar la hoja manualmente». Conocer la página no se presenta como conocer la ubicación. La ausencia de coordenadas no bloquea revisar, editar o compartir.

## Regresiones locales

- RED inicial: el ejemplo del prompt no contenía regiones; la vista con página conocida no explicaba que faltaba la zona. GREEN de extracción, sanitización, asociación por identidad, proyección docente y selección entre números repetidos; respuestas/puntajes conservados y regiones ausentes en el DTO del estudiante.
- Frontend focalizado:41 pruebas de visor, región, geometría y desglose correctas. Una regresión mide el centro real de la caja en pantalla al pasar de una respuesta superior a otra inferior de la misma foto, y después a otra hoja. Cambiar de caja en una misma página verificada no añade otra lectura de imagen; ninguna navegación invoca IA ni escribe datos académicos.
- `npm run check`:1214 pruebas/188 archivos, lint, TypeScript, compilación, auditorías de acciones y build correctos. Se conserva el aviso conocido de red simulada de jsdom y el aviso de chunks grandes; no se omitieron pruebas.
- Backend final sin red, secretos ni datos reales:1803 pruebas correctas en136.24s; Ruff con los selectores del CI correcto. El primer pase paralelo tuvo1 fallo de temporización en la prueba de20 entregas (ratio1.170,0.502ms extra por entrega); el mismo test aislado pasó con1.058 y0.061ms extra, y la suite completa repetida sin carga paralela pasó. No se tocaron sus umbrales, retries o aserciones. Un pase intermedio todavía incluía una prueba provisional de cambio de política; el pase final1803 corresponde al código conservador que no la cambia.
- Navegador local con aplicación compilada, Edge/Chromium y API sintética:390×844 y1440×1000 sin desbordamiento horizontal; selección1→2 desplaza el enfoque en la misma foto,3 abre la hoja2,4 sin región vuelve a100% y conserva zoom manual. Ampliar y volver mantiene un borrador0.75; descartarlo exige la confirmación existente antes de navegar. No se guardó ninguna nota. El primer intento de navegar con el descarte pendiente fue bloqueado por el diálogo, que se respetó sin forzar el click.
- Inventario técnico:670 superficies vigente; no se crean rutas, migraciones o almacenamiento de recortes. Gobernanza local61/61 correcta, sin modificar sus validadores ni workflows.

## Dos llamadas reales autorizadas, no recalificación

El usuario autorizó expresamente «Sí, hasta2 llamadas de prueba». Se usaron dos fotos locales previamente anonimizadas y revisadas de nuevo, sin identificadores de estudiantes ni EXIF de captura, no archivos nuevos de producción. Un registro duradero reservó cada intento antes de la red; errores inciertos también habrían consumido presupuesto. Dos de dos consumidas, sin reintentos, fallback, generación de imágenes o cambios de configuración.

La ruta institucional vigente se leyó mediante transacción de solo lectura: `calificacion.extraccion`, OpenCode/GPT‑6 Luna,60s/10000tokens. Se usó el mismo perfil/destino y la revisión de credencial configurados; la clave permaneció en memoria del servidor. La petición llevó el prompt nuevo y la copia anónima completa. Se guardó cada respuesta local antes de analizarla. El experimento no ejecutó el pipeline académico ni persistió notas, evidencias, jobs o configuraciones en producción.

| Muestra anónima | Respuestas/ubicaciones válidas | Tiempo del proveedor | Tokens de salida |
| --- | --- | --- | --- |
| Lectura con respuestas manuscritas |5/5|8.347s|878|
| Quince filas ABCD |15/15|14.113s|1489|

Las20 identidades devueltas coinciden con las del contexto de laboratorio. La comprobación usa las anotaciones de referencia congeladas previamente, trasladadas por el recorte geométrico registrado a los píxeles de cada foto preparada; no se ajustaron para encajar con las propuestas del modelo. Las funciones reales `focusEvidenceRegion`/`evidenceImageLayout` dejan las20 zonas de referencia visibles en ambos lienzos264×256 y680×320 (40 comprobaciones). Informe HTML y superposición revisados visualmente; fotos, respuestas e identificadores internos permanecen únicamente bajo `output/` privado ignorado, no en Git/CI.

**Límite importante**: algunas cajas crudas están desplazadas respecto a la escritura, especialmente hacia la parte baja de la hoja. Que la respuesta quede visible con el margen/contexto del visor no significa que la caja sea exacta ni que20/20 ubicaciones coincidan píxel a píxel. Se mantiene «Ubicación sugerida», desplazamiento/zoom y hoja completa; no se dibuja un recorte definitivo sobre la nota ni se envía ese fragmento como sustituto de las páginas de calificación. La muestra no acredita precisión universal, calidad de nota, iPhone físico o mejora del rendimiento académico.

## Entrega

Código y pruebas locales, no despliegue. PR y CI vigentes deben aprobarse antes de fusionar; no se ha autorizado una fusión nueva ni un despliegue manual. Calificaciones antiguas o proveedores que no entreguen coordenadas conservan la hoja y el zoom manual. El acceso al informe por `file:` fue rechazado por la CLI; la revisión se completó mediante un servidor temporal limitado a un solo informe anónimo en127.0.0.1, sin listado de directorios, claves o API.

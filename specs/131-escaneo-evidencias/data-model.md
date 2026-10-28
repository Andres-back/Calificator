# Entidades y transiciones propuestas

Diseño aprobado con implementación local parcial. La migración se comprobó en PostgreSQL sintético desechable, no en producción. No se añaden datos a entregas antiguas.

## Presentación de estado por respuesta

Derivación local sin persistencia nueva: estado efectivo, `requiere_revision` y disponibilidad del puntaje del componente actual → tono, etiqueta e icono. Verde/correcta, amarillo/revisión o situación parcial/incompleta explícita, rojo/incorrecta; el aviso propio vigente tiene prioridad. Identidad/selección/foco son independientes del estado académico. No inferir error de un cero, una foto borrosa o una clasificación histórica; no crear campos o estados académicos para representar colores.

## Estado local por página

- Identidad: ID de página, revisión de selección/archivo y epoch del contexto docente/evaluación/estudiante.
- Fuente: `File` recibido en memoria, dimensiones/orientación admitidas y huella local solo como indicio; el servidor calcula las huellas de autoridad.
- Propuesta: cuatro esquinas normalizadas en el marco EXIF orientado y giro manual, perfil natural/lectura suave, revisión aceptada o pendiente.
- Preview/diagnóstico: Blob temporal, advertencias y estado; no persistir fotografías en almacenamiento del navegador.
- Estados: seleccionada → analizando → propuesta/revisión → aceptada/original → enviando. También cancelada/error recuperable; todo resultado compara ID/revisión/epoch antes de aplicarse.
- Reemplazar, quitar, girar o restablecer invalida la preview anterior; no invalida silenciosamente las otras páginas. Una propuesta pendiente se resuelve o se envía esa página como original explícitamente.

## Ubicación opcional de una respuesta

### Sugerencia temporal de borde (ampliación aprobada)

Solo cuando falla el detector local y existe capacidad autorizada. Intención con UUID, actor/evaluación/estudiante, SHA256 del derivado orientado sin EXIF, dimensiones y giro, epoch local y revisión de edición. Registro compartido temporal15min: pending/completed/failed, geometría validada o abstención, versión de configuración y contadores no sensibles. Nunca foto, base64, nombre o texto académico; no es entrega ni otro archivo académico. Reservar antes de la única llamada impide duplicados concurrentes o por acuse perdido; contexto/huella distintos con la misma intención se rechazan. Resultado no recuperable conserva manual/original sin crear otra llamada silenciosa. La receta final aceptada usa el manifiesto ya definido; sugerir no guarda ni califica evidencia.

### Referencias académicas de lectura (sin cambio)

Reutilizar `CalificacionComponente.evidencia_json` con un bloque cerrado de regiones y mantenerlo en las instantáneas de revisión existentes. No crear otra tabla de recortes ni modificar componentes históricos. `evidencia_paginas` continúa siendo el fallback compatible.

- Asociación: ID/clave canónica del componente, entrega y versión de evidencia. El servidor vincula estas identidades al resultado de su job; no confiar en un estudiante, versión o hash que proponga el modelo.
- Por región: página1-based, `bbox=[x,y,ancho,alto]` normalizada entre0 y1 sobre el marco canónico orientado de esa página; anchura/altura positivas y caja completa dentro de la imagen. Dimensiones, huella privada del activo y transformación de marco registradas por servidor.
- Procedencia: sugerida durante la extracción existente, no validada por docente automáticamente. Una respuesta admite varias regiones/hojas, con orden de lectura; no usar solamente el número impreso de pregunta.
- Validez: página existente y correspondencia de contexto/versión/marco. Metadatos ausentes, inválidos, de otra ejecución o con orientación desconocida se omiten sin invalidar la respuesta/puntaje; no generar una caja estimada por defecto.
- Contrato docente: proyectar solo página, caja, marco y referencia opaca de versión; no serializar el JSON privado completo, claves de almacenamiento, huellas internas o fuentes de evaluación. Los DTO familiares/estudiante no reciben nuevas regiones por este incremento.
- Mapeo de variante: el manifiesto conserva orientación/transformación fuente→preparada; usar inversa verificada para original, que puede producir un cuadrilátero. Si no existe correspondencia verificable, mostrar esa variante completa sin trasladar la caja.

La versión debe identificar los bytes de lectura también en evidencia legacy/PDF sin manifiesto nuevo, mediante el resolvedor de evidencia/revisión y su fingerprint de servidor. Cambiar evidencia invalida la ubicación anterior para la nueva versión; recalificar no traslada cajas entre revisiones sin asociación comprobada. No hacer backfill, llamadas nuevas o escrituras por abrir el visor.

## Estado temporal del visor de respuesta

Actor/contexto/epoch, componente seleccionado, versión opaca, página/región activa, escala, desplazamiento, modo fragmento/hoja y elemento de retorno de foco. No es estado académico persistido. Seleccionar una pregunta reinicia la geometría para su región sin borrar la edición de puntaje; abrir/cerrar conserva el borrador y selección.

Un resultado de imagen solo se aplica si coinciden contexto, versión, página y solicitud; la caché es acotada y privada por actor. Contabilizar el área real renderizada sin bandas/padding al convertir coordenadas; mantener proporciones al ampliar, girar el viewport o mostrar páginas de PDF. Zoom no produce un nuevo archivo ni reemplaza evidencia enviada a IA.

## Manifest canónico de entrega

Campo propuesto `entregas.evidencia_manifiesto` JSONB nullable, `schema_version=1`. Separado de `visual_text_json`, cuyo ciclo de vida no gobierna archivos.

- ID/version de preparación y perfil de algoritmo, actor/contexto admitidos y fecha.
- Páginas en orden con ID propio; hash SHA256, MIME real, bytes, dimensiones de fuente y referencia privada del original.
- Receta validada: orientación normalizada, giro, esquinas, perfil/valores acotados y decisión docente. Matriz calculada por servidor, no aceptada como autoridad del cliente.
- Derivado canónico: clave privada, SHA256, dimensiones, MIME, perfil de codificación y advertencias; en modo original sigue distinguiéndose la fuente de una eventual normalización de lectura.
- Referencia al consolidado de consulta si se mantiene; no utilizarlo para recrear el input del modelo.
- Fingerprint de fuente/orden/receta/versión y vínculo a solicitud/job. Cambiar el archivo o parámetros bajo el mismo ID de solicitud produce conflicto, no otra ejecución silenciosa.

DTO de lectura docente con IDs/estado y URLs de proxy autenticadas, nunca rutas internas. DTO público de familia/alumno sin claves originales o EXIF de ubicación. No guardar como "original" una reexportación que ya pasó por los filtros legacy.

El algoritmo fijado para la primera entrega es `opencv-4.13.0-scan2`: preview PNG local y canónico JPEG96 sin subsampling, hasta2200px/2.5MB. El formato del manifiesto sigue en1; no existían manifiestos productivos de este incremento. El recibo privado de admisión usa su propia versión2, contexto/ID de entrega determinista, fingerprint y fuentes/recetas comprobadas, sin derivados no verificados ni fecha variable. Se publica antes de las fuentes y permite repetir una transacción fallida sin crear otra identidad.

La reconciliación de recibos es manual y conservadora: bloqueo compartido de admisión, lectura posterior de referencias en entregas/revisiones/jobs/publicaciones y gracia de7 días para staging inicial. Cualquier entrega superviviente protege la intención completa, incluso sin manifiesto; también los jobs terminados. Solo activos conocidos y temporales con identidad comprobada pasan a cuarentena privada recuperable, recibo al final y fsync antes de retirar el enlace de origen. No hay borrado definitivo/expiración automática; desconocido, alterado, enlazado simbólico o commit incierto se conserva. La cuarentena no reemplaza la política de retención académica.

## Persistencia y revisión

- Entrega legacy: manifest null, mantiene evidencia, lector y comportamiento anteriores.
- Preparación nueva: fuentes validadas/guardadas privadas → job admitido con versión/fingerprint → derivados canónicos/checkpoint → llamadas a IA → resultado. El job no cambia de versión si se modificó otra entrega.
- Recalificar: vuelve a usar ese manifest y sus derivados verificados; no recorta ni cambia filtros de nuevo.
- Cambiar evidencia: nueva versión admitida, original/derivados anteriores referidos por la instantánea de revisión y permisos existentes. No modificar notas confirmadas/publicadas ni sus enlaces sin el flujo actual y su autorización.
- La migración añade columna nullable sin backfill. La instantánea nueva de revisión conserva el manifest anterior en un campo privado cerrado; no editar snapshots pasados ni serializarlos completos al cliente.

## Archivos y recuperación

- Claves UUID creadas por servidor bajo almacenamiento privado y resueltas con validación de raíz; ningún campo de receta admite paths/URLs.
- Original inmutable por hash y relectura. Derivado materializable desde fuente+receta+versión fijadas; si falla su huella se detiene la ejecución y muestra estado recuperable, no se califica otra imagen por sustitución silenciosa.
- Estados de activos: temporal con lease, referenciado, candidato a huérfano y retirado según política vigente. Solo recolectar cuando no hay referencias en entrega, revisión, publicación autorizada o job, y el resultado transaccional es conocido.
- Cancelación del editor libera recursos locales; no borra fuentes persistidas ni historial. Un resultado de commit incierto conserva los activos hasta reconciliar.
- Telemetría solo de tiempos/tamaños/estado/códigos de fallo sin fotos, EXIF, nombres, URLs privadas o texto de respuestas.

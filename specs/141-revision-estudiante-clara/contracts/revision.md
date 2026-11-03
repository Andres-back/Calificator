# Contratos de revisión y edición de hojas

Diseño propuesto, aún no implementado. Mantener compatibilidad de clientes y rutas actuales.

## Cálculo, comentario y enlaces existentes

- El detalle de calificación y su desglose siguen siendo la fuente de nota/escala/ajustes y procedencia. No consultar los pesos actuales para explicar una nota anterior.
- Las consultas y operaciones de preview, revisión, generación, recuperación/copia, vigencia, impresión y publicación conservan sus contratos. Se cambia su composición visual, no permisos ni elegibilidad.
- No recuperar tokens mediante URLs o nombres de estudiante. Las copias se revalidan en el servidor, se mantienen en memoria de ese actor/contexto y se descartan al cambiarlo. Copiar no emite un acceso nuevo.

## GET propuesto `/api/calificaciones/{id}/evidencia/edicion`

Requiere permiso de edición/calificación y propietario autorizado o administrador, no basta permiso de lectura del estudiante. Evaluación/materia activas. Rechazo cruzado como en las rutas actuales.

Respuesta segura: identificador de calificación, versión esperada, fingerprint del paquete, metadatos del paquete y límites vigentes. Por hoja: referencia opaca acotada al paquete, orden, tipo fuente, original disponible, receta actual si es reeditable, marco y dimensiones para edición, y preview autorizado temporal sin paths privados.

El preview debe declarar su marco geométrico. El servidor conserva/resuelve los bytes originales; el cliente no asume que el endpoint actual de página original devuelve fuente exacta. Legado sin metadatos suficientes se identifica y se permite conservarlo/añadir hojas sin fabricar coordenadas o recetas antiguas.

No contiene claves, rutas absolutas, tokens de enlaces públicos ni datos de alumnos ajenos. No cambia notas, manifiestos ni llama IA.

## Extensión opcional de `POST /api/calificaciones/{id}/recalificar`

Conservar el contrato multipart actual y sus campos: solicitud idempotente, versión esperada, confirmación de reapertura, motivo opcional y aceptación explícita de pesos actuales cuando proceda.

Nuevo modo opcional de edición de hojas: manifiesto declarativo ordenado y fingerprint base. Cada posición referencia una hoja existente autorizada, o un archivo nuevo del multipart; las recetas identifican el marco correcto y no reciben rutas de archivos. Este modo es mutuamente exclusivo con los paquetes completos legacy/fotos/escaneo para evitar dos fuentes de verdad.

Validaciones antes de mutar: actor y propiedad; estado editable; versión/fingerprint; capacidad/límites; paquete no vacío; referencias pertenecientes a la entrega/base; orden sin ambigüedad; archivos utilizables; receta/dimensiones/marco/giros; coherencia de la versión de puntajes. No aceptar referencias caducadas, rutas, contenido de otro usuario o dimensiones no comprobadas.

Éxito: mismo 202 y consulta de progreso actuales. Una solicitud repetida idéntica devuelve su aceptación previa sin duplicar snapshot, archivos ni jobs. Cambiar contenido con el mismo UUID debe producir conflicto. Los activos se validan/admiten completos y quedan relacionados con snapshot anterior y nueva reapertura; la preparación posterior reutiliza checkpoints y locks.

Errores: 401 sesión, 403/404 no autorizado/contexto ajeno, 409 versión o trabajo/conflicto, 422 receta/paquete/capacidad inválidos; sin escrituras académicas parciales. Los límites de archivo mantienen los códigos existentes. Fallo de almacenamiento no debe cambiar el puntero vigente ni encolar. Fallo posterior de worker queda observable y con historial conservado.

No se añade guardar evidencia sin recalificar. Mostrar/rotar el visor es solo frontend; guardar una modificación requiere «Guardar y volver a calificar» y la confirmación actual de reapertura. Los avisos deben describir que el resultado anterior queda en Historial y que los enlaces se suspenden según el comportamiento vigente, no prometer que seguirá publicada una nota nueva.

## Contratos de UI

- Lista: búsqueda/filtros/selección y Añadir entregas pertenecen a la evaluación. El regreso desde el estudiante conserva posición, filtro y selección.
- Individual: una cabecera, cuatro pestañas, un regreso. Ninguna barra de grupo/contador seleccionado dentro de Retroalimentación.
- Retroalimentación: una zona principal según estado: generar, copiar, reintentar o revisar una causa concreta. Editar, imprimir y gestionar enlace secundarios. Durante una edición no compartir borrador por accidente.
- Grupo: una selección estable y una zona generar/copiar de opción 1, recuperando los enlaces existentes. Informar fallos parciales sin afirmar que todos fueron copiados.
- Evidencia: giro de vista independiente del recorte guardado; editor de pantalla completa en móvil con cancelación protegida y reintento conservando borrador. No desplazar el viewport de pregunta usando cajas de otra versión.

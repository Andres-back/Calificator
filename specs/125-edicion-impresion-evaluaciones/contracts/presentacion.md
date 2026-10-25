# Contratos propuestos: edición y presentación

Extensiones aditivas bajo permisos actuales; nombres concretos se fijarán con las tareas antes de implementar, sin retirar contratos existentes.

## Lectura y guardado

- `EvaluacionRead` incorpora `configuracion_impresion` opcional; no añade claves privadas a serializaciones de estudiante.
- `PATCH /evaluaciones/{id}` admite configuración tipada junto con las precondiciones existentes de fecha y versión. La vía de solo presentación sigue [data-model.md](../data-model.md); la vía mixta mantiene las comprobaciones académicas actuales. Respuesta contiene la nueva versión/fecha efectivas;409 conserva el borrador,422 describe el ajuste inválido en lenguaje sencillo.
- Las descargas actuales PDF y Word siguen funcionando sin parámetros nuevos. Al pedir `version_id`, todas las partes, incluida la presentación, provienen de ese snapshot; un campo ausente no se obtiene del estado actual.

## Preparar impresión sin guardar contenido

- Nueva operación autenticada de preparación crea o recupera un trabajo con evaluación/versiones esperadas, borrador permitido y configuración candidata. Reutiliza estado/cola privada y descargas autorizadas existentes; no es un servicio público de HTML/PDF arbitrario ni acepta URLs remotas para descargar imágenes.
- La huella de deduplicación incluye propietario, evaluación, versión/base, borrador, ajustes y destino de exportación; nunca reutilizar un archivo de otro docente o de solucionario en la salida del estudiante.
- Resultado: estado, configuración propuesta, `paginas_reales`, `meta_alcanzada`, advertencias y archivo final privado. Máximo cuatro renders; cancelación/expiración limpia temporales. Cero llamadas a LLM o generador de imágenes.
- Rutas concretas: `POST /evaluaciones/impresion/preparar` recibe evaluación, fecha/versión esperadas, `configuracion` y `borrador` opcional tipado. Devuelve202 con `job_id`; consulta/cancelación por `/jobs/{id}` y `/jobs/{id}/cancelar`. `GET /evaluaciones/impresion/{job_id}/pdf` exige usuario propietario del trabajo y autorización vigente de edición, base no modificada, éxito y vigencia24h. El resultado público nunca contiene rutas de archivos o el borrador.
- Aplicar la configuración exige confirmar y guardar con las mismas precondiciones; el resultado de una base desactualizada no sobrescribe la nueva evaluación. No guardar contenido o publicar al abrir una previsualización.
- El número de páginas corresponde al PDF efectivamente entregado, no a estimaciones por longitud de texto. Word reutiliza el diseño lógico y declara que puede repaginar.

## Material de pregunta

- Los ajustes de presentación admiten tamaño proporcional y disposición apilada/lateral dentro del bloque de una pregunta. El modo lateral no acepta capas, posiciones arbitrarias ni recorte implícito del original. PDF y Word deberán consumir la misma decisión lógica; los materiales detallados conservan una alternativa a ancho completo.
- Conservar caminos actuales de biblioteca, carga, recorte y generación propuesta. Ampliar la solicitud con propósito y estilo de impresión explícitos, conservando límites, ruta institucional y revisión docente antes de asociar.
- Ilustración: una figura aislada sin encabezados, consignas o respuestas; salida comprobada contra tamaño/formato y transparencia real. Si la ruta no admite alpha, informar capacidad ausente y ofrecer biblioteca/archivo sin fingir transparencia o cambiar de proveedor.
- Tabla/gráfico: datos estructurados y render determinista existentes; no convertirlos en un dibujo generativo para ganar decoración.
- Privacidad, origen y revisión visual no se omiten por elegir un motivo. Error o cancelar conserva original, pregunta y borrador; no hay reintento pagado automático.

## Autorización y errores

- Propietario y administrador competente: permisos equivalentes al contrato de edición/exportación actual. Otro docente, estudiante o anónimo: sin escritura ni acceso a propuestas/archivos privados o soluciones.
- Mensajes: «La evaluación cambió; conservamos tu edición», «Con estos espacios necesita3 páginas», «Este modelo no ofrece fondo transparente; puedes elegir una figura de la biblioteca». No mostrar trazas, claves ni textos internos de proveedores.
- Eventos operativos solo con identificadores técnicos, estado, cantidad de hojas y tiempos, sin preguntas, respuestas, imágenes o datos personales.

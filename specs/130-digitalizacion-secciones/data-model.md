# Modelo: estructura editorial de evaluación

## Fuente de verdad y compatibilidad

`Evaluacion.estructura_documento`: JSONB nullable. Migración aditiva sin backfill. `null` conserva exactamente la semántica plana actual. Snapshot académico incluye el campo solo en nuevas revisiones; nunca se rellenan snapshots antiguos. No aumentar `schema_version=1` de la tabla de versiones por un contrato opcional que tiene su propio `schema_version`.

La representación editorial y las preguntas se guardan atómicamente. Los puntajes máximos efectivos y las claves pertenecen a `preguntas/respuestas_esperadas`; el documento solo puede conservar la configuración opcional que produce esos máximos, validada en la misma transacción, nunca otra nota de autoridad. No persistir una copia mutable del documento dentro de `reglas_feedback`. Lectura legacy es fallback cuando no hay documento; una proyección derivada para compatibilidad no es otra fuente editable.

## Documento versión1

- `schema_version`: literal1.
- `nodos`: secuencia de hasta5.000 nodos con IDs únicos y orden de documento explícito.
- `puntuacion_secciones`: configuración opcional, null por defecto; contiene modo `por_seccion`, `presupuestos` por UUID de sección, `pesos_base` por UUID de pregunta, `ajustes` internos opcionales por UUID y `confirmado`. Presupuestos/ajustes positivos admiten dos decimales y los pesos base hasta seis. Si hay ajustes, deben cubrir todas las preguntas y sumar cada presupuesto. Sus datos son máximos y configuración académica, no notas obtenidas de estudiantes. Null conserva el reparto por pregunta.
- `revision`: metadatos privados de cobertura/revisión, proyectados fuera del DTO público: inventario detectado/conservado, asociaciones pendientes, confirmaciones y fuente comprobable. No contiene claves, rutas, tokens ni bytes.

### Nodo común

`id` UUID propio; `padre_id` UUID de una sección del mismo documento o null; `orden` entero no negativo, único entre hermanos; `tipo` discriminador cerrado. La serialización canónica usa el orden validado, no el orden de claves JSON. Profundidad máxima8, sin ciclos, padres inexistentes ni subárboles intercalados fuera de su recorrido.

### Tipos admitidos

| Tipo | Contenido | Regla |
| --- | --- | --- |
| `seccion` | título y etiqueta opcional del encabezado | Puede no contener preguntas; no añade puntos por sí misma. El presupuesto opcional se declara en la configuración de reparto |
| `texto` | propósito instrucción/lectura/actividad/recuadro y texto íntegro | No contiene campos de soluciones; no se convierte en pregunta |
| `pregunta` | referencia `pregunta_id` a `contenido_id`; etiqueta original visible | Exactamente una referencia por pregunta académica; no duplica enunciado, clave o puntaje |
| `material` | referencia a bloque del manifiesto visual existente | Recurso, estado de publicación y propiedad se verifican con el mecanismo actual; no acepta URL ni archivo de página original como material público |

Títulos hasta500 caracteres y etiquetas hasta40; textos individuales hasta60.000 y suma total dentro del presupuesto de lectura configurado. Rechazar, no truncar. La API tiene DTO estricto de entrada: campos como respuesta_correcta, storage_key, configuración IA o HTML no forman parte de un nodo educativo. La semántica se confirma contra el original/inventario antes de publicar; una lista blanca por sí sola no demuestra que un texto sea público.

## Identidad académica

`numero` permanece global único en la evaluación y en cada revisión. `contenido_id` identifica establemente la pregunta y se conserva al moverla. `etiqueta_original` es visible y puede repetirse entre secciones; no se usa como clave interna de respuestas, calificaciones o índices del arreglo.

Importación nueva: el servidor asigna números internos por orden de preguntas e IDs deterministas en el ámbito de la solicitud. La IA usa alias de origen y no elige UUID, seguridad o propietarios. Las respuestas esperadas se enlazan antes de normalizar, por identidad de origen, no por el número impreso repetido. Una asociación ambigua conserva la pregunta y deja clave/revisión pendientes.

Edición: reordenar nodos no reasigna número académico ni borra claves. Añadir/eliminar una pregunta exige actualizar documento y lista de preguntas de forma explícita y atómica. Mover/eliminar una sección con contenido requiere decisión de mover/conservar/eliminar; no eliminar descendientes silenciosamente. Duplicar recibe nuevas identidades y nueva entrada de clave. Si el reparto por sección está activo, los cambios de pertenencia o cantidad requieren nueva propuesta y confirmación de valores antes del guardado académico.

## Presupuestos opcionales y compilación de puntajes

En modo desactivado, no calcular ni modificar presupuestos o puntajes. En modo activo, los IDs de sección con presupuesto forman grupos no solapados que cubren cada pregunta calificable exactamente una vez; seleccionar padre y descendiente como sumandos simultáneos es inválido. Los padres no seleccionados tienen subtotal derivado. Secciones sin preguntas no aceptan presupuesto positivo.

Cada presupuesto es decimal positivo representable en la escala actual con precisión de0,01. La suma de los grupos debe coincidir exactamente con `nota_maxima`. Los pesos base positivos de las preguntas son referencias para el reparto proporcional, conservadas independientemente de los máximos ya compilados. Resolver cuotas, redondear por mayores restos con desempate estable y verificar máximos positivos, suma por grupo y suma global exactas; rechazar una configuración no representable en lugar de asignar ceros o compensaciones negativas.

El servidor valida y compila a los puntajes canónicos en una transacción con documento/clave/revisión, tras confirmación explícita. No almacenar dos notas calculadas ni pedir al modelo que determine los pesos. Editar repetidamente un presupuesto no usa los puntajes redondeados anteriores como pesos nuevos. Cambios de escala, grupos o preguntas requieren nueva confirmación. Desactivar propone recuperar pesos/puntajes base y verifica compatibilidad con la escala, sin modificar datos retroactivamente.

Snapshots y copias conservan la configuración y sus referencias remapeadas junto con las preguntas. No añadir presupuestos a snapshots existentes. En recuperación solo organizativa mantener máximos originales; su modificación es una acción posterior explícita sobre el borrador copiado.

## Cobertura y versión

Inventario por página/bloque de origen antes de estructurar; el estructurador asocia esos elementos a nodos/preguntas. Cada omisión conocida o asociación dudosa tiene aviso con referencia localizable. `completa` exige inventario cubierto, referencias consistentes, textos revisados y material visual listo; no suma sus puntos ni sustituye el criterio docente.

La cobertura documental y la visual se validan por separado y ambas participan en la publicación. Una imagen faltante del original no se representa como recuperada mediante una descripción textual. El avance de un trabajo se conserva incluso si falla la estructura o cambia el proveedor.

`revision.exclusiones` conserva decisiones explícitas de retirar elementos: `elemento_id`, `motivo` y `confirmado`. Solo admite elementos detectados, no conservados ni asociados a nodos. Una exclusión sin confirmar sigue siendo una omisión pendiente. El editor pide confirmación antes de retirar contenido y no elimina secciones con preguntas silenciosamente. Estas decisiones y la procedencia nunca forman parte del DTO del alumno.

`confirmar_puntuacion_secciones` es un booleano estricto transitorio de creación/actualización, apagado por defecto: autoriza aplicar la propuesta cambiada en esa transacción, no se persiste como permiso permanente. La configuración confirmada sí queda en el snapshot. Desempates de redondeo usan el número académico estable, no la posición visual, para que mover una pregunta no cambie sus centésimas por accidente.

## Concurrencia y datos históricos

- Requerir `expected_updated_at` y, cuando exista, `expected_content_version_id`; bloquear la evaluación durante el guardado y rechazar409 en conflictos.
- Incluir documento, preguntas, clave y manifiesto en la nueva revisión/hash de contenido.
- Entrega conserva su versión; consulta, calificación, verificación y ayuda usan ese snapshot. No completar datos ausentes de una versión vieja usando la evaluación viva.
- Legacy con entregas no adquiere secciones/lectura mediante edición retroactiva. Recuperar en un borrador independiente.
- Cambiar solo formato de impresión no cambia documento, claves o revisiones académicas pendientes.

## Recuperación y copia

Fuente identificada por evaluación, propietario, revisión/updated_at y fingerprint de transcripción autorizada. No aceptar un job arbitrario ni usar configuración/secretos históricos como fuente.

Estado de propuesta: disponible para revisión / incompleta por faltantes / revisada. Estado durable al confirmar copia: queued → processing → success o error recuperable. Mismo `request_key` y fingerprint reutiliza la operación; payload diferente con el mismo ID devuelve409.

La intención `recuperacion_documental` autoriza solamente misma materia activa del mismo propietario con fuente comprobada y propuesta revisada; reutilización normal mantiene destino distinto. La copia recibe evaluación, nodos, preguntas, recursos y revisión nuevos. No hereda entregas, notas, alumnos, enlaces o conversaciones. Fuente sin archivo conserva procedencia de texto, con `source_resource_id=null`; nunca fabrica un original.

## Migración y despliegue

Probar esquema aditivo y registros/versiones legacy en PostgreSQL aislado. Código lector debe tolerar campo null y snapshot sin campo. Activar admisión de escrituras estructuradas solo cuando todos los consumidores estén actualizados. Reversión operativa deshabilita admisión y conserva columna/datos; no ejecutar downgrade destructivo ni permitir edición mediante un binario viejo que no comprenda el documento.

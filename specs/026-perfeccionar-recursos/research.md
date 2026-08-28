# Investigación: calidad y consolidación de recursos

## Decisión 1: consolidar sin borrar contratos históricos

**Decisión**: ocultar `ficha` y `unir_columnas` de nuevas creaciones, mantener sus contratos de lectura, edición, descarga y asignación, y dirigir las nuevas intenciones equivalentes a `taller` y `emparejar` respectivamente.

**Rationale**: evita duplicidad para el docente y no requiere migrar ni invalidar materiales ya guardados.

**Alternativas consideradas**:
- Eliminar tipos, rutas y renderizadores: rechazada por riesgo de romper enlaces y materiales históricos.
- Conservar todas las tarjetas con explicaciones más largas: rechazada porque mantiene la decisión redundante.

## Decisión 2: contratos pedagógicos distintos y aditivos

**Decisión**: ampliar las estructuras de guía, lectura, taller y plan de refuerzo con secciones específicas; los campos actuales permanecen válidos y los nuevos son aditivos.

**Rationale**: permite mejorar generaciones nuevas sin una migración de datos y mantiene la visualización de contenido anterior.

**Alternativas consideradas**:
- Reemplazar el JSON completo de cada material: rechazada porque obligaría a migrar contenido libre y aumentaría el riesgo de pérdida.
- Usar un único contrato genérico de bloques: rechazado porque debilita la validación pedagógica y vuelve a mezclar los formatos.

## Decisión 3: validar contenido, cantidad y respuestas

**Decisión**: extender la normalización por formato para comprobar secciones obligatorias, cantidad solicitada, numeración, tipos de pregunta y presencia de respuesta, evidencia o criterio de logro.

**Rationale**: la comprobación actual solo detecta listas vacías y acepta materiales formalmente presentes pero pedagógicamente incompletos.

**Alternativas consideradas**:
- Confiar exclusivamente en el prompt: rechazada porque los proveedores pueden omitir campos o devolver estructuras parciales.
- Completar silenciosamente todo en la interfaz: rechazada porque produciría divergencia entre vista, persistencia y PDF.

## Decisión 4: recuperación local especializada

**Decisión**: proporcionar una plantilla completa por cada formato prioritario cuando el proveedor configurado usa la recuperación local, y conservar el rechazo explícito si incluso el segundo resultado incumple el contrato.

**Rationale**: evita materiales vacíos y mantiene disponible la creación básica sin ocultar fallos de calidad.

**Alternativas consideradas**:
- Persistir el resultado parcial con advertencia: rechazada porque traslada al docente un borrador engañoso.
- Reintentos ilimitados: rechazados por latencia y consumo impredecibles.

## Decisión 5: paridad entre editor, vista y PDF

**Decisión**: cada campo pedagógico persistido tendrá representación editable y visible; las soluciones se mostrarán solo en el contexto docente o en la exportación con soluciones.

**Rationale**: evita que la mejora del generador se pierda al revisar o descargar el material.

**Alternativas consideradas**:
- Guardar campos docentes ocultos sin editor: rechazada porque impide la revisión humana exigida.
- Exportar el JSON sin diseño específico: rechazado por legibilidad y accesibilidad.

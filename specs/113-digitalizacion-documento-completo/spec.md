# Especificación: Digitalizar y conservar la evaluación completa

**Rama**: `codex/113-digitalizacion-documento-completo` | **Creada**: 2026-10-21 | **Estado**: Aprobada | **Issue**: #233

## Escenarios de usuario y pruebas

### Historia 1 - Conservar y editar la lectura (Prioridad: P1)

La docente digitaliza una evaluación acompañada de una lectura y necesita verla, corregirla y entregarla junto a las preguntas. El estudiante y el calificador deben disponer del mismo texto de apoyo, separado del solucionario privado.

**Razón de prioridad**: La profesora Marcela identificó que conservar solo las preguntas vuelve incompleta su evaluación de Hidrografía.

**Prueba independiente**: Digitalizar una muestra sintética con lectura y preguntas; guardarla, volver a abrirla, editar la lectura y comprobar pantalla, impresión y contexto de calificación. Las soluciones siguen siendo exclusivas del docente.

**Aceptación**:
1. **Dada** una evaluación con lectura, **cuando** se digitaliza, **entonces** el borrador contiene la lectura separada de preguntas y respuestas correctas.
2. **Dado** un borrador propio, **cuando** la docente corrige la lectura y guarda, **entonces** la lectura actualizada reaparece en la previsualización y exportaciones.
3. **Dada** una entrega ligada a una versión, **cuando** se cambia una evaluación, **entonces** su calificación conserva el contexto de la versión original.
4. **Dado** un estudiante u otro docente sin permiso, **cuando** consulta o intenta editar, **entonces** no obtiene soluciones privadas ni puede modificar la evaluación ajena.

### Historia 2 - Imprimir con menos espacio desperdiciado (Prioridad: P1)

La docente imprime lectura, preguntas y opciones completas. Las preguntas ABCD cortas y V/F usan una distribución compacta, manteniendo espacio de respuesta en las preguntas abiertas.

**Prueba independiente**: Exportar una muestra de 17 preguntas, lectura, figura, abiertas, ABCD cortas y largas y V/F en PDF y Word. Comparar integridad y espacio con el formato anterior.

**Aceptación**:
1. La lectura aparece antes de las preguntas y no se recorta.
2. Opciones breves pueden compartir fila; las extensas se mantienen legibles sin estrechar columnas indebidamente.
3. La numeración, figuras, opciones y espacios necesarios permanecen completos; no se incluye el solucionario en la copia del alumno.
4. Esta organización de impresión no impone columnas pequeñas a la vista del celular.

### Historia 3 - Digitalizar todas las hojas desde el celular (Prioridad: P1)

La docente añade varias fotos sin preparar un PDF externo. Antes de enviar puede ordenarlas, girarlas, quitarlas o repetir una foto, y obtiene un solo borrador.

**Prueba independiente**: Desde una pantalla de 360 px añadir tres fotos, girar una, reordenar, quitar y reemplazar otra; enviar una vez y comprobar el orden y el único trabajo resultante. Probar también un PDF y un Word individuales.

**Aceptación**:
1. Hasta diez fotos y 20 MB en total se pueden revisar antes de una sola digitalización.
2. No se mezclan fotos con un PDF/Word en el mismo envío; el error explica cómo continuar y conserva la selección válida.
3. Al cerrar o cambiar de materia no aparecen resultados de una selección anterior en el nuevo formulario.
4. Permisos, errores de cola y reintentos conservan el documento fuente y no duplican evaluaciones.

### Casos límite

- Lectura no recuperable o documento sin lectura: campo vacío, sin inventar contenido ni tomar respuestas manuscritas como solucionario.
- Lectura extensa: no truncarla silenciosamente; informar si el documento excede el límite admitido.
- Evaluaciones antiguas: no reescribirlas automáticamente. Una edición incompatible con entregas históricas sin versión debe rechazarse con explicación, no alterar sus notas.
- Foto dañada, exceso de tamaño o número, cambio de orden, permiso de cámara denegado y envío lento: mensajes claros y recuperación sin pérdida de selección válida.
- Pregunta más larga que una hoja: permitir su continuación sin ocultar contenido; no forzar bloques indivisibles enormes.

## Requisitos

### Requisitos funcionales

- **FR-001**: Conservar la lectura como texto de apoyo separado de preguntas y soluciones, disponible para edición autorizada, previsualización, exportación y calificación.
- **FR-002**: Mostrar al estudiante únicamente lectura y contenido público, sin soluciones ni reglas privadas; respetar versiones y permisos de materia.
- **FR-003**: Exportar PDF/Word con lectura y opciones ABCD/VF compactas cuando quepan, sin omitir contenido, cambiar respuestas o reducir espacios de abiertas injustificadamente.
- **FR-004**: Permitir añadir, ordenar, girar, quitar y reemplazar hasta diez fotos con un máximo total de 20 MB para una sola digitalización; conservar compatibilidad con un PDF/Word único.
- **FR-005**: Procesar en segundo plano con estados visibles y conservación privada del documento fuente; no duplicar borradores ni mostrar resultados de otro contexto.
- **FR-006**: No modificar automáticamente evaluaciones antiguas, notas, evidencias ni decisiones docentes; mantener trazabilidad de versiones.
- **FR-007**: Verificar permisos, errores, conservación de contenido, PDF/Word y flujo móvil en Chromium/WebKit desde 360 px antes de fusionar con CI verde.

### Entidades clave

- **Evaluación completa**: lectura pública opcional, preguntas, soluciones privadas y versiones.
- **Selección de hojas**: fotos ordenadas y rotaciones elegidas antes del envío.
- **Documento fuente**: representación privada de lo enviado, asociada a un único trabajo de digitalización.

## Criterios de éxito

- **SC-001**: El 100 % de la lectura y preguntas de las muestras válidas se conserva al guardar, volver a abrir y exportar; ninguna solución se expone al estudiante.
- **SC-002**: Una muestra de preguntas breves de selección/VF usa menos espacio de impresión que el formato anterior, manteniendo todos sus elementos legibles.
- **SC-003**: Tres fotos producen un único borrador con las hojas en el orden elegido, sin PDF externo ni bloqueo de la navegación móvil.
- **SC-004**: Cero cambios automáticos en notas, decisiones y evidencias históricas durante las regresiones.

## Supuestos

- Evolución [127-camara-nativa-movil](../127-camara-nativa-movil/spec.md), issue #268: captura móvil directa del dispositivo, con orden, repetición, máximo de diez fotos y límites propios conservados. No añade conversión, IA, lectura nueva ni envíos automáticos.

- El usuario aprobó expresamente el plan completo el 2026-10-21. La reparación urgente de nueve calificaciones pertenece a Spec 112 y se entrega por separado.
- No se añaden llamadas de generación de imágenes, proveedores ni modelos nuevos. Figuras existentes siguen el mecanismo visual actual.
- La consolidación de fotos conserva una copia normalizada y ordenada; no se describe como archivo byte a byte idéntico a cada foto original.

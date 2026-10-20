# Feature Specification: Lectura y preguntas en hojas separadas

**Feature Branch**: `codex/108-lecturas-hojas-separadas`

**Created**: 2026-10-20

**Status**: Especificación y plan aprobados por el usuario el 2026-10-20; plan confirmado mediante «Sí, apruebo el plan de lecturas». Implementación local, sin despliegue.

**Ampliación aprobada**: el 2026-10-20 el usuario respondió «Sí, apruebo esta ampliación» al plan de control de extensión, repetición, imagen basada en la historia completa y moraleja según petición docente. La prueba real sintética también está expresamente solicitada.

**Issue**: [#224](https://github.com/Andres-back/Calificator/issues/224)

**Input**: El docente solicita el orden «título, ilustración, narración» y, desde la siguiente hoja, preguntas numeradas con menos espacio para respuestas cortas y más para respuestas largas. Aclaración directa del usuario registrada el 2026-10-20.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Imprimir la lectura separada de sus preguntas (Priority: P1)

Como docente quiero entregar primero el título, debajo la ilustración y después la narración, en orden vertical, y luego una hoja de trabajo para que el estudiante pueda leer y contestar sin mezclar ambos contenidos.

**Why this priority**: Evita preparar manualmente hojas separadas y mejora el uso del material en clase.

**Independent Test**: Abrir e imprimir un cuento y una lectura comprensiva con preguntas; verificar el inicio del cuestionario en una página nueva y la conservación del contenido.

**Acceptance Scenarios**:

1. **Given** un cuento o lectura breve con ilustración y preguntas, **When** el docente previsualiza el documento imprimible, **Then** aparecen título, ilustración y narración en ese orden vertical, sin imagen y narración lado a lado, y el cuestionario comienza en la siguiente página.
2. **Given** un texto que ocupa más de una página, **When** se genera el documento, **Then** el texto continúa sin recortes y las preguntas comienzan en una página nueva después de terminarlo.
3. **Given** un recurso sin preguntas, **When** se imprime, **Then** no se añade una hoja de cuestionario vacía.

### User Story 2 - Contestar preguntas con espacio útil (Priority: P1)

Como estudiante quiero preguntas numeradas en orden y espacio manuscrito acorde con una respuesta breve o una explicación.

**Why this priority**: Una pregunta inferencial requiere más espacio que una respuesta corta; el formato debe acompañar la actividad.

**Independent Test**: Comparar un cuestionario con respuestas cortas y otro con preguntas de justificación; comprobar numeración consecutiva y mayor espacio para las explicaciones.

**Acceptance Scenarios**:

1. **Given** preguntas con números ausentes, duplicados o discontinuos, **When** se imprime, **Then** se presentan consecutivamente desde 1, manteniendo el orden y el contenido originales sin modificar el recurso guardado.
2. **Given** respuestas esperadas cortas y extensas, **When** se prepara la hoja del alumno, **Then** se reservan al menos dos renglones para respuestas breves y cuatro para explicaciones o justificaciones; si no hay información suficiente se usan tres renglones.
3. **Given** una pregunta cerca del final de página, **When** no cabe su enunciado y el primer renglón, **Then** comienza en la siguiente página, sin dejar un enunciado aislado ni superponer contenido.

### User Story 3 - Conservar los recursos y proteger las respuestas (Priority: P2)

Como docente quiero mejorar la presentación de materiales nuevos y existentes sin regenerar contenido, alterar notas o entregar accidentalmente el solucionario.

**Why this priority**: La aplicación está en fase demo y los registros existentes deben conservarse.

**Independent Test**: Exportar un recurso previo como alumno y como docente; comparar sus datos antes/después y revisar la ausencia/presencia autorizada del solucionario.

**Acceptance Scenarios**:

1. **Given** un recurso ya guardado, **When** se previsualiza o descarga, **Then** no cambian su texto, preguntas, respuestas esperadas, criterios, notas ni evidencias.
2. **Given** una copia sin soluciones, **When** se reserva espacio para contestar, **Then** no se muestran ni se envían al alumno respuestas esperadas, evidencias textuales del solucionario o justificaciones docentes.
3. **Given** acceso desde un teléfono de 360 px o computador, **When** se abre la vista del recurso y su documento completo, **Then** se distinguen lectura y preguntas, y los controles de lectura y descarga permanecen accesibles.

### User Story 4 - Generar un cuento original e ilustrado (Priority: P1)

Como docente quiero un cuento breve y coherente, con una ilustración relacionada y moraleja cuando la solicite, sin párrafos de relleno.

**Independent Test**: rechazar repeticiones y exceso de páginas antes de pedir imagen; aceptar un cuento sintético real cuya ilustración represente sus personajes y hechos. Corto: una página narrativa; medio/largo: hasta dos, preguntas aparte.

**Acceptance Scenarios**:

1. **Given** texto repetido o demasiado largo, **When** se genera un cuento nuevo, **Then** se permite una sola corrección textual y no se pide imagen para un texto rechazado.
2. **Given** una escena importante al final, **When** se prepara la ilustración, **Then** el contexto incluye toda la narración aceptada, no solo su inicio.
3. **Given** preferencia de moraleja con/sin, **When** se genera, **Then** se respeta; un fallo de imagen no se muestra como ilustración exitosa.

### Edge Cases

- Recursos históricos y cuestionarios largos: continuar en páginas adicionales sin recorte. El límite narrativo se valida únicamente al generar cuentos nuevos.
- Cuentos antiguos con preguntas como texto simple: numerar y reservar tres renglones sin inferir ni generar un solucionario nuevo.
- Preguntas con explicación/evidencia requerida: usar espacio de explicación aunque la respuesta esperada sea breve.
- Imágenes ausentes o no disponibles: conservar el texto y mostrar el estado existente sin bloquear la exportación ni generar una imagen nueva.
- Un bloque mayor que una página: permitir continuación legible, sin ocultarlo por intentar mantenerlo entero.
- La moraleja, fuente e instrucciones de lectura permanecen con el texto; las instrucciones para responder permanecen con el cuestionario.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Cuentos y lecturas comprensivas DEBEN presentar título, ilustración y narración en ese orden vertical, sin colocar ilustración y narración en columnas paralelas. Las preguntas DEBEN empezar en una nueva página del documento imprimible, después de terminar la narración. Cuando no exista ilustración, la narración sigue al título sin reservar un hueco vacío.
- **FR-002**: El contenido guardado DEBE continuar en las páginas necesarias sin truncarse ni reducir su tamaño para forzar dos páginas. Para cuentos nuevos se aplica FR-010 antes de guardarlos, sin recortar recursos históricos.
- **FR-003**: Las preguntas DEBEN conservar orden y contenido, con numeración visible consecutiva desde 1, sin reescribir los datos guardados.
- **FR-004**: El espacio para escribir DEBE distinguir respuesta breve (mínimo dos renglones), explicación/justificación (mínimo cuatro) y formato antiguo o incierto (tres), sin revelar la respuesta correcta. Debe aplicarse a la copia de trabajo del alumno, no rellenar con líneas un solucionario docente.
- **FR-005**: Un enunciado DEBE mantenerse junto al menos al primer renglón de respuesta. Bloques mayores que una página DEBEN poder continuar sin recortes ni solapamientos.
- **FR-006**: La vista del recurso DEBE distinguir claramente «Lectura» y «Preguntas» y permitir abrir la previsualización completa de impresión desde celular y computador. La vista adaptable no necesita simular hojas de papel de ancho fijo.
- **FR-007**: Los permisos y la separación entre copia del alumno y solucionario docente DEBEN conservarse; no se añadirán respuestas esperadas a vistas del alumno para calcular el espacio.
- **FR-008**: La mejora DEBE funcionar al exportar recursos nuevos y guardados sin regenerarlos, modificar registros académicos ni realizar llamadas de IA adicionales.
- **FR-009**: Un recurso sin preguntas NO DEBE producir una hoja de cuestionario vacía ni una página vacía al final.
- **FR-010**: Los cuentos nuevos cortos DEBEN producir una página narrativa legible; los largos DEBEN ocupar como máximo dos páginas narrativas. El formato medio admite una o dos. Se cuentan título, ilustración y moraleja dentro de la narración; las preguntas se cuentan aparte. No se añaden páginas vacías, repeticiones ni letra diminuta para satisfacer el número de páginas.
- **FR-011**: El cuento nuevo DEBE tener inicio, desarrollo y cierre coherentes, sin párrafos duplicados de relleno, manteniendo personajes y hechos. Las comprobaciones automáticas de estructura/repetición NO certifican por sí solas coherencia literaria.
- **FR-012**: La ilustración DEBE generarse a partir del cuento aceptado, representando una escena, personajes y objetos realmente presentes. No se usará una imagen de reserva o figura ajena como si hubiese sido generada para ese cuento. El fallo de imagen se mostrará como tal, sin éxito ficticio.
- **FR-013**: Cuando el docente solicite moraleja, esta DEBE derivarse de lo ocurrido en la historia y aparecer después de la narración. Si pide no incluirla, no se añadirá. El modo automático, si se ofrece, debe indicar que el docente puede revisar la decisión.
- **FR-014**: Las pruebas DEBEN distinguir fixtures técnicas de paginación de muestras generadas por el servicio real; registrar ruta/modelo/calidad, duración observada, páginas y revisión de relación texto-imagen, sin inferir calidad general de una sola muestra ni usar datos de estudiantes.

### Key Entities

- **Recurso de lectura**: cuento o lectura comprensiva, título, narración, ilustraciones y datos de contexto ya existentes.
- **Pregunta de comprensión**: enunciado, posición y, cuando exista y esté autorizado, respuesta esperada y justificación docente; no cambia su almacenamiento por esta mejora.
- **Documento imprimible**: presentación derivada del recurso, con sección de lectura y cuestionario separados; no es una evaluación nueva.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En todos los casos de prueba, título, ilustración disponible y narración aparecen en ese orden vertical. Si hay preguntas, la primera empieza en una página posterior al último bloque de lectura; sin preguntas no se añade una hoja vacía.
- **SC-002**: El 100 % de las preguntas conserva texto y orden; su numeración visible es consecutiva y el espacio cumple FR-004.
- **SC-003**: Cuentos breves/largos, lecturas con/sin imagen y cuestionarios de una o varias páginas se imprimen sin recortes, superposiciones ni enunciados aislados del primer renglón.
- **SC-004**: Las copias de alumno no contienen soluciones; la comparación del recurso antes y después de previsualizar/exportar no muestra cambios persistidos.
- **SC-005**: A 360 px y 1280 px las secciones y controles son accesibles sin desbordamiento horizontal de la interfaz; el documento puede leerse completo con los controles existentes.
- **SC-006**: Todas las muestras nuevas aceptadas cumplen FR-010 en el PDF real; muestras que exceden el límite o repiten párrafos no se presentan como finalizadas sin corregir o avisar. Los históricos permanecen íntegros aunque superen dos páginas.
- **SC-007**: En una muestra real sintética revisada se identifican personajes, escena y objetos coincidentes entre texto e ilustración, y moraleja pertinente cuando se solicitó; se informa cualquier discrepancia. No equivale a certificar todas las futuras generaciones.
- **SC-008**: Las pruebas de regresión incluyen salida repetitiva, vacía, demasiado larga, imagen fallida y preferencia de moraleja, sin modificar recursos previos ni ejecutar reintentos pagados ilimitados.

## Assumptions

- Los materiales anteriores se conservan completos. La nueva precisión limita únicamente cuentos nuevos a una página (corto) o como máximo dos (medio/largo), excluyendo preguntas.
- Alcance: cuentos, lecturas comprensivas, documento PDF imprimible y sus vistas de recurso. No se añaden nuevos formatos de exportación.
- La importación visual de evaluaciones sigue perteneciendo a Spec 101 y no se activa por esta especificación. El generador de ilustraciones de cuentos existente se incluye ahora para probar/corregir su relación con la narración; no se cambian proveedores o claves de producción.
- La consulta del usuario sobre conservar imágenes al digitalizar se responde con el estado comprobado: editor y generación habilitados, importación visual desactivada; no se garantiza hoy su incorporación automática.
- No se modificarán producción, permisos, datos académicos ni recursos existentes durante esta fase de especificación.

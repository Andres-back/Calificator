# Especificación: Perfeccionar recursos pedagógicos

**Rama**: `codex/026-perfeccionar-recursos` | **Creada**: 2026-08-28 | **Estado**: Aprobada | **Issue**: #39

## Escenarios de usuario y pruebas

### Historia 1 - Elegir un recurso sin opciones repetidas (Prioridad: P1)

Como profesor, necesito que cada opción del catálogo responda a una intención pedagógica distinta para elegir rápidamente el recurso adecuado sin adivinar diferencias entre nombres similares.

**Razón de prioridad**: Los formatos redundantes aumentan la carga cognitiva y producen materiales intercambiables que no satisfacen el objetivo de clase.

**Prueba independiente**: Un docente puede recorrer el catálogo y encontrar una sola opción para relacionar pares, una sola hoja de práctica y descripciones que distinguen enseñar, practicar, comprender una lectura y reforzar dificultades.

**Aceptación**:
1. **Dado** el catálogo de creación, **cuando** el profesor revisa las opciones, **entonces** no aparecen dos herramientas con la misma intención, entrada y resultado.
2. **Dado** un material histórico de un formato consolidado, **cuando** el profesor o estudiante lo abre, **entonces** puede visualizarlo, editarlo cuando corresponda y descargarlo sin pérdida de contenido.

### Historia 2 - Generar recursos pedagógicamente completos (Prioridad: P1)

Como profesor, necesito que guía, lectura comprensiva, taller y plan de refuerzo tengan estructuras completas y diferentes para poder usarlos con estudiantes sin reconstruir manualmente el contenido.

**Razón de prioridad**: El valor del generador depende de que el resultado sea aplicable, coherente con el grado y verificable por el docente.

**Prueba independiente**: Al generar cada formato con el mismo tema, cada resultado contiene las secciones obligatorias de su propósito y no puede confundirse con los otros tres.

**Aceptación**:
1. **Dado** un tema y grado, **cuando** se genera una guía, **entonces** incluye propósito, activación de saberes, explicación, ejemplo guiado, práctica, cierre y verificación formativa.
2. **Dado** un tema y grado, **cuando** se genera una lectura comprensiva, **entonces** incluye texto apropiado, instrucciones, preguntas distribuidas por nivel, respuestas esperadas y evidencia textual o justificación.
3. **Dado** un tema y cantidad de puntos, **cuando** se genera un taller, **entonces** incluye instrucciones, ejercicios variados, dificultad, puntaje, respuesta esperada o criterio de logro y espacio de respuesta apropiado.
4. **Dado** un estudiante y sus dificultades, **cuando** se genera un plan de refuerzo, **entonces** incluye diagnóstico inicial, meta general, sesiones secuenciadas, apoyos, responsables, indicadores y comprobación final.

### Historia 3 - Revisar, editar y exportar sin perder información (Prioridad: P1)

Como profesor, necesito ver y modificar todas las partes relevantes del recurso antes de publicarlo para conservar el control pedagógico y obtener la misma información en pantalla y PDF.

**Razón de prioridad**: Un recurso completo que no se puede revisar o que pierde datos al exportarse sigue siendo inutilizable.

**Prueba independiente**: Un recurso de cada formato prioritario se visualiza, edita, guarda y exporta; las secciones esenciales permanecen presentes y legibles.

**Aceptación**:
1. **Dado** un recurso generado, **cuando** el profesor abre su detalle, **entonces** todas las secciones pedagógicas aparecen con jerarquía visual clara en escritorio y celular.
2. **Dado** un recurso generado, **cuando** el profesor edita una sección, **entonces** el cambio queda visible en la vista previa y en la exportación.
3. **Dado** un recurso con respuestas o criterios docentes, **cuando** se descarga la versión del estudiante, **entonces** esas soluciones no se revelan; la versión docente sí puede mostrarlas.

### Historia 4 - Recuperarse de una respuesta incompleta (Prioridad: P2)

Como profesor, necesito recibir un material completo o un error comprensible cuando el proveedor de generación falle para no guardar borradores vacíos ni perder tiempo revisando resultados rotos.

**Razón de prioridad**: La disponibilidad de un proveedor externo no debe degradar silenciosamente la calidad educativa.

**Prueba independiente**: Ante una salida incompleta o una indisponibilidad simulada, el sistema reintenta o utiliza una alternativa completa; si no puede cumplir, informa el problema y no persiste un recurso vacío.

**Aceptación**:
1. **Dado** que faltan secciones obligatorias, **cuando** se valida la generación, **entonces** el resultado se completa mediante recuperación o se rechaza con una explicación accionable.
2. **Dado** un reintento, **cuando** finalmente se crea el recurso, **entonces** existe un único material y no hay secciones duplicadas.

### Casos límite

- Una ficha didáctica o actividad de unir columnas creada anteriormente continúa disponible aunque ya no aparezca como opción nueva.
- Una cantidad solicitada de actividades o preguntas se respeta sin duplicados; si no puede cumplirse, la generación no se presenta como completa.
- Una lectura corta no inventa citas: la evidencia de cada respuesta debe corresponder al texto generado.
- Un taller con preguntas abiertas usa criterios de logro cuando no existe una única respuesta literal.
- Un plan sin calificación inicial sigue siendo válido, pero declara el diagnóstico como pendiente de comprobación.
- DBA y rúbrica continúan siendo enfoques opcionales; ningún recurso exige seleccionarlos para poder generarse.
- En celular no se ocultan acciones, respuestas docentes ni secciones extensas detrás de desbordamientos horizontales.

## Requisitos

### Requisitos funcionales

- **FR-001**: El catálogo DEBE ofrecer una única herramienta canónica por intención y retirar de nuevas creaciones los formatos funcionalmente equivalentes.
- **FR-002**: Los materiales históricos de formatos retirados del catálogo DEBEN conservar visualización, edición, descarga y asignación compatibles.
- **FR-003**: La guía DEBE diferenciar explicación, modelado, práctica y evaluación formativa en secciones identificables.
- **FR-004**: La lectura comprensiva DEBE contener texto, instrucciones, respuestas y evidencias verificables. Toda generación incluye preguntas literales e inferenciales; desde 3 preguntas añade vocabulario y desde 4 añade crítica, distribuyendo las preguntas restantes de forma equilibrada sin exigir más tipos que la cantidad solicitada.
- **FR-005**: El taller DEBE contener ejercicios variados con dificultad, puntaje, solución o criterio de logro y espacio de respuesta coherente.
- **FR-006**: El plan de refuerzo DEBE partir de dificultades identificadas y definir diagnóstico, metas, secuencia, apoyos, seguimiento y comprobación final.
- **FR-007**: Cada formato DEBE respetar la cantidad solicitada de actividades o preguntas y eliminar duplicados semánticos evidentes.
- **FR-008**: La vista previa, el editor y las exportaciones DEBEN conservar las secciones esenciales del formato.
- **FR-009**: Las respuestas y orientaciones docentes DEBEN permanecer ocultas en la versión destinada al estudiante.
- **FR-010**: Una salida incompleta NO DEBE persistirse como recurso terminado.
- **FR-011**: Si la generación principal no está disponible, la recuperación DEBE producir una estructura completa o terminar en un error visible y accionable.
- **FR-012**: El flujo DEBE seguir funcionando sin DBA ni rúbrica, y respetarlos cuando el profesor los seleccione.
- **FR-013**: Los recursos DEBEN conservar el ciclo vigente de materia, borrador, apoyo o actividad evaluativa sin crear asignaciones automáticas.
- **FR-014**: La experiencia DEBE ser legible y operable desde 360 píxeles, con controles táctiles y sin desplazamiento horizontal obligatorio.

### Entidades clave

- **Formato de recurso**: propósito pedagógico, nombre visible, secciones obligatorias, posibilidad de respuestas y compatibilidad histórica.
- **Material educativo**: borrador generado y editable que conserva materia, contenido, visibilidad, asignación y exportaciones.
- **Sección pedagógica**: unidad verificable del recurso, como explicación, pregunta, ejercicio, sesión o indicador.
- **Versión de salida**: representación docente o estudiantil que comparte contenido base y aplica las reglas de visibilidad de soluciones.

## Criterios de éxito

- **SC-001**: El catálogo muestra cero pares de herramientas con la misma intención, campos principales y resultado esperado.
- **SC-002**: El 100 % de los recursos prioritarios generados en las pruebas contiene todas sus secciones obligatorias y la cantidad solicitada sin duplicados.
- **SC-003**: Un docente puede distinguir correctamente los cuatro formatos prioritarios por su descripción y resultado en menos de 30 segundos.
- **SC-004**: El 100 % de las secciones visibles en la revisión docente permanece disponible después de guardar y exportar.
- **SC-005**: Los materiales históricos de formatos consolidados abren correctamente en todas las pruebas de compatibilidad.
- **SC-006**: Ninguna simulación de respuesta incompleta persiste un material vacío o engañosamente terminado.
- **SC-007**: Las vistas prioritarias funcionan a 360, 390, 768 y 1366 píxeles sin controles cortados ni desplazamiento horizontal para leer el contenido principal.

## Supuestos

- `Relacionar pares` es el nombre canónico para nuevas actividades de asociación; los nombres anteriores se conservan solo para compatibilidad.
- La ficha didáctica se consolida con el taller para nuevas creaciones, porque ambos representan una hoja de ejercicios; las fichas existentes no se migran ni eliminan.
- Los recursos personales que Xali crea para un estudiante no son redundantes con el plan docente: tienen destinatario, contexto y ciclo de vida distintos.
- El profesor continúa revisando y decidiendo antes de publicar o asignar cualquier recurso.
- Esta evolución amplía la especificación responsable `006-recursos-actividades` y no cambia los permisos por rol.

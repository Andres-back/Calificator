# Hotfix: calificación móvil y digitalización segura

**Rama**: `codex/063-mobile-grade-digitization`  
**Fecha**: 2026-09-23  
**Estado**: Aprobado por solicitud explícita del usuario  
**Issue**: [#125](https://github.com/Andres-back/Calificator/issues/125)

## Escenarios de usuario y pruebas

### Historia 1 - Encontrar estudiantes sin bloqueos en celular (P1)

Como docente que califica desde un teléfono, quiero buscar y seleccionar rápidamente a un estudiante para revisar su nota o cargar su evidencia sin que la vista se congele al escribir.

**Prueba independiente**: En una materia con varios estudiantes, escribir un nombre en 360×800 y abrir el resultado o seleccionarlo al añadir una entrega.

**Escenarios de aceptación**:

1. **Dado** un listado de estudiantes, **cuando** el docente escribe varias letras seguidas, **entonces** el texto responde inmediatamente y la consulta remota solo se ejecuta tras una pausa breve.
2. **Dado** el flujo “Añadir entregas”, **cuando** el docente busca por nombre, **entonces** puede seleccionar un resultado mediante controles táctiles accesibles sin recorrer un selector largo.
3. **Dada** una consulta en curso, **cuando** llega un nuevo término, **entonces** la vista mantiene resultados comprensibles y no parpadea ni bloquea el desplazamiento.

### Historia 2 - Separar la hoja respondida de la clave correcta (P1)

Como docente que digitaliza una evaluación ya contestada, quiero que el sistema reconstruya las preguntas y resuelva la clave de forma independiente, sin considerar la escritura del estudiante como respuesta correcta.

**Prueba independiente**: Digitalizar o normalizar una estructura que contiene `270 × 67`, una respuesta manuscrita y una clave errónea propuesta por IA; la clave final debe ser `18.090`.

**Escenarios de aceptación**:

1. **Dada** una transcripción con etiquetas de respuesta estudiantil, **cuando** se construye el borrador, **entonces** esas etiquetas no forman parte de los enunciados ni del contexto usado para crear la clave.
2. **Dada** una operación aritmética objetiva, **cuando** la clave del modelo contradice el enunciado normalizado, **entonces** el sistema usa el resultado verificable y muestra una advertencia al docente.
3. **Dada** una pregunta abierta no determinista, **cuando** existe escritura del alumno, **entonces** el sistema no la adopta automáticamente como respuesta esperada y conserva la revisión docente.

### Casos límite

- Nombres con tildes, mayúsculas o espacios deben seguir siendo localizables.
- Una búsqueda sin coincidencias debe mostrar un estado vacío claro y permitir limpiarla.
- Cambiar de estudiante con hojas ya elegidas debe conservar la protección contra pérdida accidental existente.
- Una anotación estudiantil multilínea no debe eliminar la siguiente pregunta impresa.
- Las preguntas no deterministas deben mantener la clave propuesta para revisión; no se inventará una verificación local.
- Las evaluaciones existentes no se recalcularán ni modificarán automáticamente.

## Requisitos funcionales

- **FR-001**: El buscador del centro de calificación DEBE desacoplar la escritura de las consultas remotas mediante una espera breve.
- **FR-002**: La interfaz DEBE mantener un estado estable y comprensible mientras actualiza resultados.
- **FR-003**: El flujo de carga DEBE ofrecer búsqueda por nombre y selección táctil de estudiantes.
- **FR-004**: Los controles principales DEBEN medir al menos 44 px y funcionar a 360×800 sin desbordamiento horizontal.
- **FR-005**: La digitalización DEBE eliminar del contexto de preguntas toda respuesta identificada como producida por el estudiante.
- **FR-006**: La clave de una pregunta aritmética determinista DEBE verificarse a partir del enunciado normalizado persistible.
- **FR-007**: Si una clave objetiva es corregida localmente, el borrador DEBE advertirlo para revisión docente.
- **FR-008**: Las preguntas abiertas o ambiguas DEBEN continuar requiriendo validación docente.
- **FR-009**: El hotfix NO DEBE modificar evaluaciones, entregas ni calificaciones históricas.
- **FR-010**: Los contratos HTTP y el flujo asíncrono de calificación DEBEN permanecer compatibles.

## Entidades afectadas

- **Estudiante matriculado**: Persona que el docente busca o selecciona dentro de la materia.
- **Borrador digitalizado**: Preguntas, clave esperada, puntajes y advertencias que el docente revisa antes de publicar.
- **Respuesta del estudiante**: Escritura presente en la hoja; es evidencia de una entrega, nunca fuente de verdad para la clave de la evaluación.

## Criterios medibles de éxito

- **SC-001**: Una secuencia de escritura genera como máximo una consulta después de 300 ms sin nuevas pulsaciones.
- **SC-002**: Un docente encuentra y selecciona un estudiante en no más de tres acciones desde “Añadir entregas”.
- **SC-003**: La vista es utilizable sin desplazamiento horizontal en 360×800 y 390×844.
- **SC-004**: La regresión `270 × 67` produce `18.090` aunque la IA sugiera `18.760`.
- **SC-005**: Ninguna etiqueta de respuesta estudiantil queda persistida dentro del enunciado normalizado.
- **SC-006**: Las pruebas focalizadas de calificación y digitalización permanecen verdes.

## Supuestos y límites

- Se corrigen nuevas digitalizaciones; el caso histórico de Matemáticas de Edby queda intacto hasta revisión explícita del docente.
- Se reutilizan los endpoints y datos de matrícula actuales.
- No se añaden tablas ni migraciones.
- El término de búsqueda se aplica en el backend para conservar cobertura sobre matrículas paginadas.

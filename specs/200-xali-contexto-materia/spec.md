# Especificación: Xali docente conoce los datos de la materia seleccionada

**Rama**: `codex/200-xali-contexto-materia` | **Creada**: 2026-11-17 | **Estado**: Aprobada e implementada | **Issue**: [#419](https://github.com/Andres-back/Calificator/issues/419)

**Entrada**: el usuario pidió adaptar el asistente a cada profesor y a cada materia: si selecciona «Matemáticas, grado 5» y saluda, Xali no debe preguntar qué materia es; debe alimentarse de las evaluaciones y recursos del docente y poder responder, por ejemplo, qué estudiante va mejor en promedio y cuál es su punto débil.

## Situación anterior

El selector de materia ya llegaba al servidor, pero Xali solo recibía nombre, área y grado, más fragmentos de documentos subidos. No recibía evaluaciones, notas, estudiantes, asistencia ni recursos.

## Escenarios de usuario y pruebas

### Historia 1 - Xali sabe con qué materia trabaja (Prioridad: P1)

**Aceptación**:
1. **Dada** una materia seleccionada, **cuando** el docente escribe «hola», **entonces** Xali lo saluda por su nombre, resume cómo va la materia con datos y propone acciones para esa materia, sin preguntar cuál es.
2. **Dada** la conversación general, **entonces** Xali saluda por el nombre e invita a elegir una materia para usar sus datos.

### Historia 2 - Xali interpreta los datos del aula (Prioridad: P1)

**Aceptación**:
1. **Dada** la pregunta «¿qué estudiante va mejor y cuál es su punto débil?», **entonces** responde con el estudiante de mayor promedio, con cuántas notas se calculó y la pregunta donde obtuvo menor puntaje.
2. **Dada** una pregunta por un estudiante nombrado, **entonces** responde sobre ese estudiante y no sobre otro.
3. **Dado** un dato que el sistema no tiene, **entonces** lo dice y no lo inventa.

### Historia 3 - Los nombres de los estudiantes no salen del sistema (Prioridad: P1)

**Aceptación**:
1. **Dado** el texto que se envía a la IA, **entonces** cada estudiante figura con un código y no con su nombre.
2. **Dada** la respuesta de la IA, **entonces** el servidor cambia los códigos por los nombres antes de mostrarla y vuelve a ocultarlos cuando el historial regresa a la IA.

### Casos límite

- Materia sin evaluaciones, sin estudiantes o sin asistencia: se indica expresamente.
- Nota puesta a mano sin preguntas: no genera «punto débil».
- Varios estudiantes comparten el apellido mencionado: Xali los nombra o pregunta a cuál se refiere.
- Títulos escritos por personas: se limpian para que no parezcan instrucciones ni códigos.
- Si falla el armado de datos, Xali sigue respondiendo como antes.
- Más de 60 estudiantes: se envían los 30 de mayor y los 30 de menor promedio.

## Requisitos

### Requisitos funcionales

- **FR-001**: Con materia seleccionada, la instrucción de Xali DEBE incluir un panorama con docente, materia, evaluaciones recientes, preguntas más difíciles, estudiantes, asistencia y recursos, obtenido en solo lectura y acotado a esa materia.
- **FR-002**: Los promedios DEBEN usar solo notas confirmadas, ajustadas o publicadas, en escala de 0 a 5.
- **FR-003**: El punto débil DEBE calcularse con preguntas reales del desglose activo; un componente global puesto a mano NO DEBE contarse.
- **FR-004**: El panorama NO DEBE contener nombres de estudiantes; cada uno DEBE figurar con un código estable dentro de la consulta.
- **FR-005**: El servidor DEBE restaurar los nombres en la respuesta y ocultarlos de nuevo en el historial que vuelve a la IA.
- **FR-006**: Si el mensaje del docente coincide con el nombre de un estudiante, la consulta DEBE ir acompañada de una nota que indique a qué código corresponde; si coincide con varios, DEBE listarlos.
- **FR-007**: Las reglas DEBEN impedir preguntar por la materia, exigir el saludo con resumen de datos y prohibir inventar notas, nombres o evaluaciones.
- **FR-008**: Sin materia seleccionada, Xali DEBE conocer el nombre del docente y sus materias, e invitar a elegir una.
- **FR-009**: La pantalla DEBE ofrecer sugerencias sobre los datos cuando hay una materia elegida y explicar que Xali ya la conoce.
- **FR-010**: La nota de procedencia DEBE indicar que la respuesta usó los datos registrados de la materia.

## Criterios de éxito

- **SC-001**: En una prueba real con el modelo económico, el saludo incluye datos de la materia y la pregunta por el mejor estudiante coincide con la base.
- **SC-002**: El armado sobre tres materias reales de producción no deja ningún nombre de estudiante en el texto.

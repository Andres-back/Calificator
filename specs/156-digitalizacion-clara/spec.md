# Especificación: Digitalizar desde foto con la lectura completa, una revisión clara y publicar para calificar

**Rama**: `codex/156-digitalizacion-clara` | **Creada**: 2026-11-07 | **Estado**: Aprobada | **Issue**: [#329](https://github.com/Andres-back/Calificator/issues/329)

**Entrada**: el usuario pidió que la digitalización desde foto sea rápida y clara. Al terminar, el profesor debe poder ajustar las respuestas correctas y publicar para empezar a calificar. En las preguntas abiertas, el sistema pregunta al profesor; si una es de respuesta libre, se acepta cualquier respuesta válida, pero solo en las preguntas que él elija.

## Evidencia

Experimento local del 2026-11-07: 3 evaluaciones reales anonimizadas, 4 hojas y el modelo de producción.
- En una hoja, el cuento se reemplazó por "La liebre y la tortuga (lectura)". El texto real tiene unas 10 líneas.
- En una evaluación de 2 hojas, la segunda se perdió: "La lectura de esta página tardó demasiado". Solo quedaron 10 preguntas.
- En producción, 5 de 34 evaluaciones digitalizadas no tienen lectura y alguna pregunta habla de "texto" o "lectura".
- Publicar exige una respuesta esperada concreta para cada pregunta, también las abiertas.

## Escenarios de usuario y pruebas

### Historia 1 - La lectura llega completa (Prioridad: P1)

Como profesor, quiero que el texto de lectura de la foto se transcriba completo, para que mis estudiantes lo tengan junto a sus preguntas.

**Prueba independiente**: digitalizar la hoja anonimizada del cuento y comprobar que el borrador contiene sus párrafos, no un título con "(lectura)".

**Aceptación**:
1. **Dada** una transcripción que reemplaza un texto por un marcador, como "(lectura)", "[texto]" o "...", **cuando** termina la lectura de esa hoja, **entonces** se vuelve a leer una sola vez pidiendo el texto literal.
2. **Dado** que el segundo intento tampoco trae el texto, **cuando** se crea el borrador, **entonces** el profesor ve un aviso concreto, por ejemplo "La lectura de la hoja 1 quedó incompleta. Revísala o pégala", y no una advertencia general.
3. **Dada** una hoja con su lectura completa, **cuando** se digitaliza, **entonces** no se hace ninguna llamada adicional.

### Historia 2 - Ninguna hoja se pierde en silencio (Prioridad: P1)

Como profesor, quiero saber qué hoja no se pudo leer, para repetirla sin empezar de nuevo.

**Prueba independiente**: simular que la hoja 2 agota su tiempo y comprobar el aviso y el reintento solo de esa hoja.

**Aceptación**:
1. **Dada** una hoja que no se pudo leer, por ejemplo porque agotó su tiempo, **cuando** termina la lectura del documento, **entonces** esa hoja se vuelve a leer sola, una vez, dentro del mismo trabajo, y sus preguntas quedan en su lugar.
2. **Dado** que esa segunda lectura también falla, **cuando** se crea el borrador, **entonces** el aviso nombra la hoja, por ejemplo "No pudimos leer la hoja 2", en lugar de "Faltan páginas".
3. **Dada** una digitalización en curso, **cuando** el profesor la mira, **entonces** ve el avance por hoja, por ejemplo "Hojas leídas: 1 de 3".

Ajuste del 2026-11-07 (PR 2): la relectura es automática dentro del trabajo. Un botón para que el profesor relea una hoja desde un borrador ya guardado exigiría mezclar preguntas nuevas con sus ediciones, y queda fuera de este alcance.

### Historia 3 - Del borrador a publicar, paso a paso (Prioridad: P1)

Como profesor, quiero ver qué me falta para publicar y hacerlo sin buscar, para empezar a calificar.

**Prueba independiente**: tocar "Revisar" al terminar y llegar al borrador con una lista: lectura, preguntas, respuestas correctas, puntos y publicar.

**Aceptación**:
1. **Dada** una digitalización terminada, **cuando** toco "Revisar", **entonces** se abre ese borrador, no la lista de la materia.
2. **Dado** el borrador, **cuando** lo abro, **entonces** veo cada pendiente con un botón que lleva a la pregunta correspondiente.
3. **Dado** que no quedan pendientes, **cuando** toco "Publicar y empezar a calificar", **entonces** la evaluación queda publicada con las reglas actuales de publicación.

Ajuste del 2026-11-07 (PR 3): el aviso de una hoja, por ejemplo una lectura incompleta, aparece en la lista con su botón, pero no impide publicar, porque el servidor tampoco lo exige y el profesor puede decidir que la hoja está bien. Bloquean el botón las preguntas que el editor rechaza, como una sin respuesta correcta, y una suma de puntos distinta de la nota máxima. Al publicar, el profesor pasa a calificar por foto, o a las entregas si la evaluación es en línea.

### Historia 4 - Respuestas correctas y respuesta libre (Prioridad: P1)

Como profesor, quiero confirmar las respuestas correctas propuestas y decidir en cada pregunta abierta si tiene una respuesta esperada o es de respuesta libre.

**Prueba independiente**: un borrador con preguntas de opción múltiple y abiertas; confirmar las propuestas, escribir una respuesta y marcar otra como libre; publicar y calificar una entrega sintética.

**Aceptación**:
1. **Dadas** preguntas de opción múltiple o de verdadero y falso, **cuando** reviso, **entonces** veo la respuesta propuesta y la confirmo o la cambio con un toque.
2. **Dada** una pregunta abierta sin respuesta confiable, **cuando** reviso, **entonces** el sistema pregunta: "¿Tiene una respuesta esperada o es de respuesta libre?".
3. **Dada** una pregunta marcada como respuesta libre, **cuando** se publica, **entonces** cuenta como respuesta completa y se muestra "Cualquier respuesta válida".
4. **Dada** una entrega con respuesta libre, **cuando** se califica, **entonces** recibe el puntaje completo si responde a la pregunta de forma pertinente. Decisión del 2026-11-07: puntaje completo, no parcial. Si está en blanco, no tiene relación o es ilegible, sigue las reglas actuales de revisión.
5. **Dada** una pregunta no marcada como libre, **cuando** se publica, **entonces** sigue exigiendo una respuesta esperada concreta. La respuesta libre nunca se aplica sola.

### Casos límite

- Un texto corto que de verdad es solo un título no debe tratarse como lectura incompleta: el aviso aparece solo con un marcador o cuando una pregunta menciona un texto ausente.
- Volver a leer una hoja solo afecta al borrador. Una evaluación publicada o con entregas no cambia.
- Marcar como libre una pregunta con entregas ya calificadas sigue la protección de notas de las Specs 137 y 155.
- Las marcas del estudiante en la foto nunca forman parte de la lectura ni de la respuesta esperada.

## Requisitos

### Requisitos funcionales

- **FR-001**: Una lectura reemplazada por un marcador DEBE volver a leerse una sola vez pidiendo el texto literal.
- **FR-002**: Si sigue incompleta, el borrador DEBE indicar la hoja y ofrecer corregir la lectura.
- **FR-003**: Una hoja con la lectura completa NO DEBE generar llamadas adicionales.
- **FR-004**: Una hoja que no se pudo leer DEBE volver a leerse sola, una vez, y, si sigue fallando, identificarse en el borrador.
- **FR-005**: El avance DEBE mostrar las hojas leídas y el total.
- **FR-006**: "Revisar" DEBE abrir el borrador digitalizado.
- **FR-007**: El borrador DEBE mostrar los pendientes para publicar y un acceso a cada uno.
- **FR-008**: "Publicar y empezar a calificar" DEBE usar las reglas actuales de publicación.
- **FR-009**: Las respuestas propuestas de las preguntas objetivas DEBEN poder confirmarse o cambiarse.
- **FR-010**: En cada pregunta abierta sin respuesta, el sistema DEBE preguntar si tiene respuesta esperada o es de respuesta libre.
- **FR-011**: La respuesta libre DEBE ser una marca explícita por pregunta, puesta solo por el profesor, y contar como clave completa.
- **FR-012**: El calificador DEBE tratar la respuesta libre como válida si responde de forma pertinente, sin cambiar las demás reglas.
- **FR-013**: NO DEBEN cambiar notas, entregas ni evaluaciones publicadas existentes.

### Entidades clave

- **Pregunta de respuesta libre**: pregunta abierta con la marca `respuesta_libre` en su respuesta esperada. La pone el profesor.
- **Hoja pendiente**: hoja que no se pudo leer o cuya lectura quedó incompleta, con su número.

## Criterios de éxito

- **SC-001**: Con las 3 evaluaciones anonimizadas del experimento, ninguna lectura queda reemplazada por un marcador sin aviso.
- **SC-002**: Una hoja perdida se vuelve a leer sola y, si sigue fallando, aparece identificada.
- **SC-003**: Desde "Revisar" hasta publicar, un profesor completa el recorrido a 360 px sin salir del borrador.
- **SC-004**: Una pregunta libre recibe el puntaje con una respuesta pertinente y no lo recibe en blanco, en pruebas sintéticas sin llamadas reales.

# Especificación: Quiz rápido interactivo con clave de respuestas fiable

**Rama**: `codex/197-quiz-interactivo` | **Creada**: 2026-11-16 | **Estado**: Aprobada e implementada | **Issue**: [#414](https://github.com/Andres-back/Calificator/issues/414)

**Entrada**: en la auditoría de herramientas (Spec 193) se anotó que el quiz rápido no es interactivo. El usuario pidió seguir con esa mejora. Al implementarla se encontró además que «Ver respuestas» no marcaba la opción correcta.

## Evidencia

Quiz real de 8 preguntas generado en local. La clave llega como «B)», «C)», «C)», «B)», «A)», «B)», «D)», «A)». Al pulsar «Ver respuestas», ninguna de las 8 opciones correctas quedaba resaltada.

## Escenarios de usuario y pruebas

### Historia 1 - La clave se ve (Prioridad: P1)

**Aceptación**:
1. **Dada** una clave escrita como «B)», **cuando** se pulsa «Ver respuestas», **entonces** la opción B queda marcada.
2. **Dada** una clave como «Opción B», «b.», «B) El Sol» o «El Sol», **entonces** se marca la misma opción.

### Historia 2 - Practicar en pantalla (Prioridad: P1)

**Aceptación**:
1. **Dado** un quiz, **cuando** el estudiante toca una opción por pregunta y pulsa «Comprobar respuestas», **entonces** ve cada acierto en verde, cada error en rojo con la respuesta correcta, y el total «Acertaste N de M».
2. **Dado** el resultado, **cuando** pulsa «Intentar de nuevo», **entonces** todo vuelve a cero.
3. **Dado** un quiz sin responder, **entonces** «Comprobar respuestas» está desactivado.

### Casos límite

- Pregunta sin responder: cuenta como error y dice «Sin responder».
- Clave que no corresponde a ninguna opción o letra fuera de rango: la pregunta no entra en el total y se muestra el texto de la clave.
- Pregunta sin opciones: renglones para responder y, al ver respuestas, el texto de la clave.
- No se guarda nada ni cambia ninguna nota; el PDF no cambia.

## Requisitos

### Requisitos funcionales

- **FR-001**: La opción correcta DEBE reconocerse cuando la clave es una letra con o sin puntuación, «Opción X», letra seguida del texto, o el texto de la opción (sin distinguir mayúsculas, tildes ni puntuación final).
- **FR-002**: Si la clave no corresponde a ninguna opción, NO DEBE marcarse ninguna.
- **FR-003**: El quiz rápido DEBE permitir elegir una opción por pregunta, con opciones de al menos 44 px de alto y semántica de grupo de opciones.
- **FR-004**: «Comprobar respuestas» DEBE mostrar aciertos, errores, la respuesta correcta y el total, y DEBE impedir cambios hasta reintentar.
- **FR-005**: «Intentar de nuevo» DEBE reiniciar respuestas y resultado.
- **FR-006**: «Ver respuestas» DEBE seguir disponible y mostrar la clave sin responder.

## Criterios de éxito

- **SC-001**: En el quiz real de 8 preguntas, las 8 respuestas correctas quedan marcadas.
- **SC-002**: En 390 px el quiz se responde, se comprueba y se reinicia sin desbordes ni errores de consola.

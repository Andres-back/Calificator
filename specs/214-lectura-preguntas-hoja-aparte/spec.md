# Especificación: Preguntas en hoja aparte en el PDF de cuentos y lecturas

**Rama**: `codex/214-lectura-preguntas-hoja-aparte` | **Creada**: 2026-11-23 | **Estado**: Aprobada e implementada | **Issue**: [#224](https://github.com/Andres-back/Calificator/issues/224)

**Entrada**: una docente pidió que, al imprimir un cuento o una lectura comprensiva, el texto vaya primero y las preguntas empiecen en hoja nueva, con espacio para responder. La issue se preparó como Spec 108, que nunca llegó a `main`. El 2026-11-23 el usuario aprobó rehacerla en pequeño: solo el PDF, preguntas en hoja nueva y renglones según la respuesta esperada, validado contando páginas y sin IA.

## Hallazgo

En el PDF de `cuento` y de `lectura_comprensiva`, las preguntas quedan pegadas al final del texto. Cada una trae dos o tres renglones de 15 px, unos 4 mm de alto, sin importar cuánto se espera que escriba el estudiante. Un niño de primaria no puede escribir en ese alto, y una pregunta de opinión recibe el mismo espacio que una de una palabra.

## Escenarios de usuario y pruebas

### Historia 1 - El texto en una hoja y las preguntas en otra (Prioridad: P1)

**Aceptación**:
1. **Dado** un cuento o una lectura con texto y preguntas, **cuando** el docente descarga el PDF, **entonces** las preguntas empiezan en hoja nueva, después del texto, la ilustración y la moraleja.
2. **Dado** un texto que ocupa varias hojas, **entonces** sale completo y las preguntas empiezan en la hoja siguiente a la última del texto.
3. **Dado** un cuestionario que no cabe en una hoja, **entonces** continúa en la siguiente sin partir una pregunta y sin perder ninguna.
4. **Dado** un recurso sin texto o sin preguntas, **entonces** no se añade ninguna hoja.

### Historia 2 - Espacio para responder a mano (Prioridad: P2)

**Aceptación**:
1. **Dada** una lectura cuyas preguntas tienen respuesta esperada, **entonces** cada pregunta trae entre 2 y 8 renglones según la extensión de esa respuesta.
2. **Dada** una pregunta sin respuesta esperada, como las del cuento, **entonces** trae 3 renglones.
3. **Dada** la hoja de preguntas de la copia del estudiante, **entonces** pide el nombre, porque puede separarse de la primera hoja.

### Casos límite

- El solucionario docente separa las hojas igual, muestra las respuestas y no trae renglones ni la línea del nombre.
- Un recurso guardado antes de este cambio sale con el formato nuevo la próxima vez que se descarga. Su contenido guardado no cambia.
- Un cuento sin ilustración real ocupa todo el ancho, como hasta ahora.

## Requisitos

### Requisitos funcionales

- **FR-001**: En el PDF de `cuento` y de `lectura_comprensiva`, cuando hay texto y preguntas, las preguntas DEBEN empezar en hoja nueva. Sin texto o sin preguntas NO DEBE añadirse una hoja.
- **FR-002**: La hoja de preguntas de la copia del estudiante DEBE pedir el nombre y numerar cada pregunta.
- **FR-003**: Cada pregunta DEBE traer renglones de 8 mm de alto: entre 2 y 8 según la extensión de la respuesta esperada, y 3 cuando no la hay.
- **FR-004**: La copia del estudiante NO DEBE mostrar respuestas, evidencia ni justificación; el solucionario docente las conserva.
- **FR-005**: Un texto o un cuestionario que superan una hoja DEBEN continuar sin truncarse ni reducir la letra, y una pregunta NO DEBE partirse entre dos hojas.
- **FR-006**: El cambio NO DEBE modificar contenido guardado, llamar a la IA ni cambiar el PDF de otros tipos de recurso.

## Criterios de éxito

- **SC-001**: En un PDF real, ninguna hoja contiene a la vez texto de la lectura y preguntas: lectura corta, lectura de varias hojas y cuento con y sin ilustración.
- **SC-002**: Con 14 preguntas de respuesta larga, las 14 aparecen en el PDF.
- **SC-003**: Las pruebas de PDF de los demás recursos siguen pasando.

## Fuera de alcance

- La vista del recurso en pantalla y la exportación a Word.
- Las evaluaciones, que tienen su propia preparación de impresión.
- La importación visual y cualquier generación con IA.

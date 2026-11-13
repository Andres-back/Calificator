# Especificación: El recuadro de la respuesta abarca la pregunta completa

**Rama**: `codex/180-recuadro-pregunta` | **Creada**: 2026-11-13 | **Estado**: Aprobada e implementada | **Issue**: [#380](https://github.com/Andres-back/Calificator/issues/380)

**Entrada**: tras desplegar la Spec 178, el usuario pidió que el recuadro «sea más grande, que ocupe toda la pregunta y un poquito más», con una captura de producción de una foto tomada de lado.

## Evidencia

| Observación | Dato |
| --- | --- |
| Captura de producción, pregunta de opción múltiple | El recuadro rodea solo la letra «B» marcada. El enunciado y las demás opciones quedan fuera. |
| Orientación de la foto | Girada 90°: el texto corre de arriba abajo y las opciones están una al lado de otra. |
| Zona guardada por el lector | La marca o la fila de opciones, no la pregunta. |

## Escenarios de usuario y pruebas

### Historia 1 - El recuadro abarca la pregunta (Prioridad: P1)

**Aceptación**:
1. **Dada** una respuesta con zona en una hoja derecha, **cuando** abro la pregunta, **entonces** el recuadro abarca el renglón completo y los renglones vecinos de arriba y abajo.
2. **Dada** una hoja fotografiada de lado, **cuando** abro la pregunta, **entonces** el recuadro crece en el sentido del texto y hacia ambos lados, sin suponer dónde está el enunciado.
3. **Dado** el recuadro ampliado, **cuando** se abre la pregunta, **entonces** la hoja se encuadra para mostrarlo entero, con 250 % como máximo.

### Casos límite

- El recuadro nunca se sale de la hoja y siempre contiene la zona original.
- Una marca diminuta recibe un margen mínimo.
- Sin zona válida no se dibuja nada, como antes.

## Requisitos

### Requisitos funcionales

- **FR-001**: El recuadro DEBE crecer a lo largo del lado mayor de la zona, hasta 20 % de la hoja a cada lado y al menos 6 %.
- **FR-002**: El recuadro DEBE crecer a ambos lados del lado menor, al menos 4 % de la hoja o 1,2 veces ese lado.
- **FR-003**: El recuadro DEBE quedar dentro de la hoja y contener la zona original.
- **FR-004**: El enfoque automático DEBE encuadrar el recuadro ampliado, con el tope de 250 % de la Spec 178.

## Criterios de éxito

- **SC-001**: En el caso de la captura, el recuadro pasa de rodear la letra a abarcar el número, el enunciado y las cuatro opciones.
- **SC-002**: Las pruebas existentes de las pantallas tocadas siguen pasando.

# Especificación: Calificar comprensión de lectura con la lectura a la vista de todos los agentes

**Rama**: `codex/199-lectura-en-verificacion` | **Creada**: 2026-11-16 | **Estado**: Aprobada e implementada | **Issue**: [#417](https://github.com/Andres-back/Calificator/issues/417)

**Entrada**: el usuario reportó que una evaluación de lectura no se califica bien: puso «Según el texto» como respuesta esperada para indicar que se basaba en la lectura, y la IA no lo comprendió.

## Evidencia (producción, solo lectura)

| Hecho | Detalle |
| --- | --- |
| Lectura guardada | 701 caracteres; empieza a mitad del cuento. |
| Preguntas 7 a 10 | Calificadas bien, citando la lectura guardada. |
| Preguntas 2 a 5 | Su respuesta está en la parte que falta. Quedaron «pendientes» con el mensaje genérico. |
| Calificador principal | «El fragmento del texto no permite verificar… y la clave está pendiente.» |
| Verificador | «Referencia "Según el texto" sin texto disponible: se calificaron por coherencia y por los vistos del docente.» |
| Claves | Origen «confirmación docente», pero siguen en `claves_pendientes`. |

## Causas

1. El verificador no recibe la lectura.
2. `reglas_feedback.claves_pendientes` se guarda al digitalizar y no se actualiza cuando el docente confirma la clave; el calificador la recibe tal cual.
3. No hay regla para una respuesta esperada que remite a la lectura.
4. Sin consenso, el motivo del calificador se descarta.

## Escenarios de usuario y pruebas

### Historia 1 - La lectura es la referencia (Prioridad: P1)

**Aceptación**:
1. **Dada** una evaluación con lectura, **entonces** el calificador y el verificador la reciben.
2. **Dada** una respuesta esperada «Según el texto», **entonces** ambos agentes saben que la respuesta correcta es la que da la lectura.
3. **Dada** una lectura que no contiene el dato, **entonces** la pregunta queda «no evaluable» y se dice que la lectura guardada no incluye esa parte.

### Historia 2 - El docente sabe por qué quedó pendiente (Prioridad: P1)

**Aceptación**:
1. **Dada** una pregunta sin consenso en la que un calificador explicó por qué no pudo valorar, **entonces** el docente ve ese motivo junto al mensaje.
2. **Dada** una clave confirmada por el docente, **entonces** no se le presenta a la IA como pendiente.

### Casos límite

- Clave confirmada pero vacía: sigue pendiente.
- Sin lectura: los agentes reciben «(sin lectura)».
- Sin motivo del calificador: el mensaje queda igual que antes.
- Las notas ya guardadas no cambian; solo afecta a calificaciones nuevas o recalificadas.

## Requisitos

### Requisitos funcionales

- **FR-001**: El verificador DEBE recibir la lectura de la evaluación, marcada como dato y no como instrucción.
- **FR-002**: La lista de claves pendientes enviada al calificador DEBE excluir las claves con origen «confirmación docente» y respuesta no vacía; si queda vacía, NO DEBE enviarse.
- **FR-003**: Calificador y verificador DEBEN recibir la regla de remisión a la lectura, que prohíbe valorar por intuición o por marcas del docente cuando la lectura no contiene el dato.
- **FR-004**: Sin consenso, la explicación para el docente DEBE incluir el motivo del calificador que no pudo valorar, limitado a 260 caracteres.

## Criterios de éxito

- **SC-001**: Las pruebas nuevas pasan y no aparecen fallos nuevos en las pruebas de calificación.
- **SC-002**: Ninguna nota existente cambia por este despliegue.

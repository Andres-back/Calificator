# Especificación: Editor de respuestas y puntajes claro y fácil de usar

**Rama**: `codex/186-editor-revision` | **Creada**: 2026-11-14 | **Estado**: Aprobada e implementada | **Issue**: [#392](https://github.com/Andres-back/Calificator/issues/392)

**Entrada**: el usuario pidió revisar el proceso de edición de respuestas y puntajes al revisar una evaluación calificada: sin problemas de navegación, atractivo, fácil de entender y, sobre todo, útil.

## Evidencia (capturas locales, 1440 px y 390 px)

| Observación | Dónde |
| --- | --- |
| Al pulsar «Ajustar puntaje y explicación», el editor abre fuera de la vista. | PC y celular |
| Cuatro botones en una fila estrecha, con textos en 2–3 renglones y recortados; tres formas de «Guardar». | PC |
| Estado en una lista desplegable; «Parcial» se puede guardar con cero o con el puntaje completo. | PC y celular |
| La vista previa mezcla puntos y nota. | PC y celular |
| La barra inferior, bloqueada mientras se edita, tapa los botones del editor. | Celular |
| Al bajar por el editor, la hoja se va de la vista. | PC |
| «Ver evidencia completa» aparece como texto suelto. | PC |

## Escenarios de usuario y pruebas

### Historia 1 - Editar una pregunta sin perderse (Prioridad: P1)

**Aceptación**:
1. **Cuando** pulso «Ajustar puntaje y explicación», **entonces** el editor queda a la vista y el foco en el estado.
2. **Dado** el editor, **entonces** veo tres pasos: estado con botones grandes, puntos y explicación.
3. **Cuando** elijo «Parcial», **entonces** se propone la mitad del puntaje; con cero o el máximo, no se puede guardar y se explica por qué.
4. **Dado** un cambio, **entonces** veo la nota del estudiante antes → después.
5. **Dado** el editor, **entonces** las acciones están fijas al pie: Cancelar, Guardar y la principal (ir a la pregunta siguiente o, en la última, al siguiente alumno).
6. **En celular**, la barra inferior de la calificación no tapa el editor; **en PC**, la hoja queda fija al lado.

### Casos límite

- Las flechas del teclado recorren los estados.
- Sin estado revisado, el editor pide elegir uno después de mirar la hoja.

## Requisitos

### Requisitos funcionales

- **FR-001**: Al abrir, el editor DEBE quedar a la vista y con el foco en el estado.
- **FR-002**: El estado DEBE elegirse con un grupo de radio de botones grandes con icono y color, navegable con flechas.
- **FR-003**: «Parcial» DEBE proponer la mitad del puntaje e impedir guardar con 0 o el máximo, con un mensaje claro.
- **FR-004**: La vista previa DEBE mostrar la nota antes → después, con color según suba o baje.
- **FR-005**: Las acciones DEBEN estar fijas al pie del editor: Cancelar, Guardar y una principal hacia la pregunta siguiente o, en la última, al siguiente alumno.
- **FR-006**: En celular, la barra inferior DEBE ocultarse mientras se edita una pregunta; en PC, la hoja DEBE quedar fija al lado.
- **FR-007**: «Ver evidencia completa» DEBE verse como un botón con icono.

## Criterios de éxito

- **SC-001**: Editar una pregunta no exige buscar el editor ni hacer zoom.
- **SC-002**: Las pruebas existentes de la revisión siguen pasando.

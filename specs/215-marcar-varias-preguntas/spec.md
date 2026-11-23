# Especificación: Marcar varias preguntas como correctas o incorrectas a la vez

**Rama**: `codex/215-marcar-varias-preguntas` | **Creada**: 2026-11-23 | **Estado**: Aprobada e implementada | **Issue**: [#452](https://github.com/Andres-back/Calificator/issues/452)

**Entrada**: el usuario pidió el 2026-11-23 que «el profesor debe poder seleccionar varias preguntas y ponerles correcta o incorrecta, sin ir una por una».

## Hallazgo

Para cambiar el resultado de una pregunta, el docente entra a ella, pulsa «Ajustar puntaje y explicación», elige el estado, espera la explicación que redacta la IA y guarda. Cuando la IA deja varias preguntas pendientes, o el docente quiere corregir varias, repite esos pasos por cada una.

El servidor ya guarda varios cambios en una sola versión del desglose (`PUT /calificaciones/{id}/desglose` recibe una lista). Faltaba la pantalla.

Al revisar el guardado apareció un defecto anterior: una pregunta que el docente deja como correcta conserva la orientación «Para mejorar» que escribió la IA cuando la creía incorrecta. Ocurre también al ajustar una sola pregunta.

## Escenarios de usuario y pruebas

### Historia 1 - Marcar varias preguntas de una vez (Prioridad: P1)

**Aceptación**:
1. **Dado** un docente que revisa una entrega con más de una pregunta, **cuando** pulsa «Marcar varias preguntas», **entonces** los números de las preguntas pasan a seleccionar en vez de abrir la pregunta.
2. **Dadas** varias preguntas seleccionadas, **cuando** pulsa «Marcar correctas» o «Marcar incorrectas», **entonces** ve cuáles quedarán así y cómo cambia la nota, y nada se guarda todavía.
3. **Cuando** confirma, **entonces** todas se guardan en un solo paso y una sola versión del historial; las correctas reciben el puntaje completo y las incorrectas, cero.
4. **Cuando** pulsa «Volver» o «Cancelar», **entonces** no se guarda nada.

### Historia 2 - El estudiante recibe un resultado coherente (Prioridad: P2)

**Aceptación**:
1. **Dada** una pregunta que cambia de resultado en un lote, **entonces** su explicación para el estudiante es una frase corta y fija que no contradice el resultado.
2. **Dada** una pregunta que ya estaba en ese resultado, **entonces** conserva la explicación que tenía.
3. **Dada** una pregunta que el docente deja correcta, en lote o de una en una, **entonces** deja de mostrar «Para mejorar».

### Casos límite

- Los criterios de rúbrica no entran en el lote: tienen niveles y se siguen ajustando de uno en uno.
- Mientras el docente edita una pregunta, no se ofrece el lote.
- Si otra revisión cambió la calificación, no se guarda nada y se pide volver a seleccionar.
- Si después del lote quedan preguntas sin puntaje, la nota sigue sin confirmar, igual que al ajustar una sola.

## Requisitos

### Requisitos funcionales

- **FR-001**: La revisión de una entrega DEBE ofrecer «Marcar varias preguntas» al docente con permiso para calificar cuando hay más de una pregunta y no está editando ninguna. No se ofrece al estudiante.
- **FR-002**: En ese modo, los números de las preguntas DEBEN funcionar como casillas, con «Seleccionar todas» y «Quitar selección», y los criterios de rúbrica deshabilitados.
- **FR-003**: Al confirmar, las preguntas seleccionadas DEBEN guardarse en una sola solicitud y una sola versión del desglose: correctas con el puntaje máximo, incorrectas con cero, cada una con su entrada en el historial y el motivo de que se marcaron juntas.
- **FR-004**: Antes de guardar, la pantalla DEBE mostrar qué preguntas cambian y la nota antes y después, y pedir confirmación. «Volver» y «Cancelar» NO DEBEN guardar.
- **FR-005**: La explicación para el estudiante DEBE ser «Tu profesor revisó esta respuesta y es correcta.» o «…y no es correcta.» cuando el resultado cambia, y la que ya tenía cuando no cambia. Una pregunta que el docente deja correcta NO DEBE conservar «Para mejorar».
- **FR-006**: El modo DEBE cumplir el criterio de accesibilidad del proyecto: botones de al menos 44 × 44 px, sin desplazamiento lateral a 390 px, foco visible que entra a la primera pregunta y vuelve al botón al salir, y reglas WCAG 2.2 A y AA sin violaciones.
- **FR-007**: Un conflicto de versión NO DEBE guardar nada; la pantalla avisa y trae la versión vigente.

## Criterios de éxito

- **SC-001**: Marcar tres preguntas pendientes como correctas toma seis toques y un guardado, frente a tres recorridos completos del editor.
- **SC-002**: En 390 px y 1440 px, en claro y oscuro, el flujo completo pasa sin desplazamiento lateral.
- **SC-003**: Las pruebas existentes de la revisión siguen pasando.

## Fuera de alcance

- Puntajes parciales y «sin respuesta» en lote.
- Marcar la misma pregunta en varias entregas a la vez.
- Redactar con IA la explicación de cada pregunta del lote.

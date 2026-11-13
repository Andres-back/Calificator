# Especificación: Ajustar una pregunta sin escribir el motivo y con la explicación redactada por la IA

**Rama**: `codex/181-ajuste-asistido` | **Creada**: 2026-11-13 | **Estado**: Aprobada e implementada | **Issue**: [#382](https://github.com/Andres-back/Calificator/issues/382)

**Entrada**: con una captura de «Editar pregunta», el usuario pidió que el motivo interno no sea obligatorio y se llene según el estado elegido («se determinó que era correcta»), y que la explicación para el estudiante la redacte el modelo con la metodología de la tesis.

## Evidencia

| Observación | Dato |
| --- | --- |
| Formulario «Ajustar puntaje y explicación» | Motivo interno y explicación son obligatorios y se escriben a mano. |
| Explicación que queda al abrirlo | La del lector («no tiene consenso verificable; el docente debe revisar…»), que no sirve al estudiante. |
| Botón «Cancelar» | Se parte en dos renglones en pantallas medianas. |

## Escenarios de usuario y pruebas

### Historia 1 - El motivo se llena solo (Prioridad: P1)

**Aceptación**:
1. **Dado** el editor de una pregunta, **cuando** elijo «Correcta», **entonces** el motivo interno dice «Se determinó que la respuesta es correcta.»; lo mismo para parcial, incorrecta y sin respuesta.
2. **Dado** que escribí un motivo, **cuando** cambio el estado, **entonces** mi motivo se conserva.
3. **Dado** un motivo vacío, **cuando** guardo, **entonces** el historial recibe el motivo del estado o «Se ajustó el puntaje tras revisar la evidencia.» si solo cambié los puntos.

### Historia 2 - La IA redacta la explicación (Prioridad: P1)

**Aceptación**:
1. **Dado** el editor, **cuando** elijo un estado, **entonces** la IA redacta la explicación para ese estado y esos puntos con las reglas de retroalimentación formativa.
2. **Dado** que escribí la explicación, **cuando** cambio el estado, **entonces** no se reemplaza; puedo pedirla con «Volver a redactar con IA».
3. **Dado** que la IA no responde, **entonces** se conserva el texto anterior y se avisa en lenguaje claro.

### Casos límite

- Mientras la IA redacta no se puede guardar; si el docente cambia de estado otra vez, solo cuenta la última respuesta.
- La IA no cambia puntaje, estado ni nota y nada se guarda hasta que el docente pulsa guardar.
- Un borrador con cifras de nota, genérico, vacío o demasiado largo se rechaza.

## Requisitos

### Requisitos funcionales

- **FR-001**: El motivo interno DEBE ser opcional y proponerse según el estado mientras el docente no lo escriba.
- **FR-002**: Al guardar, el historial DEBE recibir siempre un motivo.
- **FR-003**: `POST /calificaciones/{id}/redactar-explicacion` DEBE devolver un borrador para el estado y los puntos elegidos, sin guardar nada, con permiso de calificar la evaluación.
- **FR-004**: El borrador DEBE seguir las reglas de retroalimentación formativa de la calificación, respetar `orientar_sin_dar_respuesta` y tratar las respuestas como datos.
- **FR-005**: El editor DEBE pedir el borrador al elegir el estado si el docente no escribió la explicación, y ofrecer un botón para volver a pedirlo.
- **FR-006**: Si la IA falla, DEBE responder 503 con un mensaje claro y el editor DEBE conservar el texto.

## Criterios de éxito

- **SC-001**: Ajustar una pregunta pide elegir el estado y revisar el texto; no escribir el motivo.
- **SC-002**: Las pruebas existentes del editor y de la revisión siguen pasando.

# Hotfix: evidencia visual para evaluador y verificador

**Rama**: `codex/062-multimodal-grader-verifier`
**Fecha**: 2026-09-22
**Estado**: Aprobado por solicitud explicita del usuario
**Issue**: [#123](https://github.com/Andres-back/Calificator/issues/123)

## Incidente

La extraccion visual identifica respuestas legibles y las conserva de forma estructurada, pero el evaluador y el verificador reciben principalmente una transcripcion. Si esta omite o mezcla una respuesta manuscrita, pueden devolver `sin_respuesta` aunque la evidencia visual si contenga la respuesta.

## Requisitos

- **FR-001**: El evaluador principal DEBE recibir la imagen original cuando exista evidencia visual y el modelo admita vision.
- **FR-002**: El verificador DEBE recibir la misma evidencia visual para comprobar cada valoracion.
- **FR-003**: La extraccion estructurada DEBE incluirse explicitamente en el contexto textual por pregunta.
- **FR-004**: Si vision encontro respuestas legibles pero ambos agentes declaran todas ausentes, el sistema NO DEBE confirmar una nota cero automatica.
- **FR-005**: Las entregas de texto y los modelos sin vision DEBEN mantener el flujo actual.
- **FR-006**: No se registraran imagenes, respuestas, prompts ni credenciales.
- **FR-007**: La evidencia se enviara una sola vez por llamada.

## Aceptacion

1. Una entrega fisica abierta entrega imagen y respuestas estructuradas a ambos agentes.
2. Una contradiccion entre vision y agentes queda en revision, nunca como cero automatico.
3. Una entrega exclusivamente textual no envia imagen.
4. Las pruebas existentes y la regresion nueva permanecen verdes.

# Especificación: nota sugerida consistente con el desglose bajo revisión

**Rama**: `codex/058-grade-sum-review` | **Creada**: 2026-09-21 | **Estado**: Aprobado como hotfix | **Issue**: [#115](https://github.com/Andres-back/Calificator/issues/115)

## Incidente y escenario

En producción, una evaluación con cuatro preguntas calificadas mostró 5,00 en la suma explicada, pero 4,17 como nota sugerida. La verificación independiente había solicitado revisión, por lo que la nota global del modelo quedó desincronizada aunque todos los componentes tenían puntaje. Ninguna nota se publicó.

Como docente, necesito que la sugerencia principal corresponda a la suma visible de las preguntas evaluables, incluso cuando haya alertas que exijan mi revisión, para no decidir entre dos cifras contradictorias.

## Requisitos funcionales

- **FR-001**: Si todas las preguntas tienen puntaje y el desglose es internamente completo, la nota sugerida DEBE ser la suma normalizada de esos puntajes, aunque existan alertas de revisión externa.
- **FR-002**: Las alertas de evidencia o del verificador DEBEN conservar el estado de revisión docente; la sincronización de la cifra NO DEBE confirmar ni publicar la nota.
- **FR-003**: Si falta el puntaje de una pregunta, NO DEBE usarse la suma parcial como nota total ni fabricarse un cero.
- **FR-004**: Una decisión previa del docente o una nota ya publicada NO DEBE reemplazarse por una sugerencia automática posterior.
- **FR-005**: Debe existir una regresión para la suma completa con alertas y otra para el desglose incompleto, además de un reensayo con la fotografía demo sin publicar.

## Aceptación

1. Una prueba con puntajes 1,67 + 1,67 + 0,83 + 0,83 y una nota global del modelo de 4,17 muestra 5,00 como sugerencia y mantiene revisión pendiente.
2. Una prueba sin puntaje en la pregunta 4 conserva el bloqueo y no muestra la suma parcial como calificación definitiva.
3. El historial conserva el valor global original del modelo y la diferencia frente a la suma.
4. La fotografía de prueba en producción muestra una sola calificación, el desglose coherente y ninguna publicación automática.

## Alcance

No se cambian modelos, endpoints, tablas, cola ni reglas de confirmación humana. Esta corrección continúa el criterio de [051-nota-desglose-autoridad](../051-nota-desglose-autoridad/spec.md): los puntos por pregunta explican la cifra global.

# Revisión visual de preguntas y edición directa de nota docente (Spec 134)

Solicitud actual: verde para preguntas sin avisos; amarillo para dudas moderadas; rojo para baja confianza o revisión urgente. El color es prioridad de revisión, no si el alumno acertó. Añadir «Editar nota» junto a la nota global, incluso si ya fue confirmada, introduciendo el resultado final con comentario opcional.

Plan: conservar propuestas de IA, evidencias y puntajes por pregunta; registrar ajuste docente, controlar permisos y conflictos; advertir al cambiar una publicada y suspender enlaces anteriores afectados. Validar móvil/escritorio, claro/oscuro, accesibilidad, totales e historial sin datos reales ni llamadas a IA.

Especificación: `specs/134-revision-visual-nota-directa/spec.md`.
Rama: `codex/134-revision-visual-nota-directa`, desde main `211b7100c6727acf59115d09efede26495e108b5`.

Seguimiento parcial de #242 (edición clara de notas). No retoma su antigua propuesta de cambiar proveedores/modelos. No depende del escáner de #276 / Spec 131.

Estado: especificación y plan ampliado aprobados por el usuario el 2026-10-28 mediante «adelante» después de presentar el plan conjunto. Revisión de ocho criterios autorizada con «Sí, revisa y continúa» y completada (listas 16/16 + 8/8). Implementación, regresiones locales y Converge completos; resultados y límites en `specs/134-revision-visual-nota-directa/validation.md`. PR/CI obligatorios. No fusionar ni desplegar automáticamente.

# Lista de calidad de requisitos: experiencia y accesibilidad

**Propósito**: validar claridad, completitud, consistencia y medición de los requisitos de la experiencia animada  
**Creada**: 2026-09-19  
**Especificación**: [spec.md](../spec.md)

> Los marcadores pertenecen al revisor. `[x]` significa que la calidad del requisito fue aprobada, no que la implementación esté terminada.

## Completitud

- [x] CHK001 ¿Están definidos el estudiante, la calificación publicada y los límites frente a estados provisionales? [Completitud, Spec §US1, FR-005]
- [x] CHK002 ¿Están cubiertos el flujo principal, la alternativa estática, los fallos visuales y la recuperación? [Cobertura, Spec §US2, FR-004, FR-009]
- [x] CHK003 ¿Se especifica que nota, evidencia y desglose original permanecen disponibles? [Completitud, Spec §FR-001, FR-011]

## Claridad y consistencia

- [x] CHK004 ¿La secuencia de máximo cuatro momentos está definida sin contradecir el acceso al detalle completo? [Consistencia, Spec §FR-002, FR-011]
- [x] CHK005 ¿“Cientos de posiciones” está aclarado como combinaciones reutilizables y no cientos de archivos? [Claridad, Spec §FR-007, Assumptions]
- [x] CHK006 ¿Los términos historia, escena, estado de Xali y alternativa estática se mantienen consistentes? [Consistencia, Spec §Key Entities]

## Accesibilidad, privacidad y rendimiento

- [x] CHK007 ¿Los requisitos cubren teclado, lector de pantalla, objetivos táctiles y reducción de movimiento? [Cobertura, Spec §FR-003, FR-004, FR-008]
- [x] CHK008 ¿La degradación ante conexión lenta o recurso ausente está definida sin bloquear la nota? [Excepción, Spec §Edge Cases, FR-009]
- [x] CHK009 ¿Se prohíben datos personales y generación visual individual en todos los recursos? [Privacidad, Spec §FR-006]
- [x] CHK010 ¿El objetivo de primer contenido útil y la ausencia de llamadas IA son medibles? [Medición, Spec §SC-003, FR-010]

## Medición y límites

- [x] CHK011 ¿Las métricas de comprensión y finalización están separadas de la calidad/calificación académica? [Consistencia, Spec §FR-012, SC-004, SC-005]
- [x] CHK012 ¿Los elementos fuera de alcance excluyen voz, video, gamificación y cambios al pipeline de notas? [Límites, Spec §Out of Scope]

## Notas

- Revisión orientada a PR: accesibilidad, integridad académica y rendimiento son puertas obligatorias.
- `$speckit-implement` no modifica estos marcadores.

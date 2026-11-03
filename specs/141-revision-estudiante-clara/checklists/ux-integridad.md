# Lista de calidad de requisitos: frontend premium e integridad

**Propósito**: validar claridad, completitud, consistencia y medición de requisitos antes de implementar.
**Creada**: 2026-11-02
**Especificación**: [spec.md](../spec.md)
**Audiencia/profundidad**: revisor previo a PR, estándar; foco UX y conservación de datos.

> Los marcadores pertenecen al revisor. `[x]` significa que la calidad del requisito fue aprobada, no que la implementación esté terminada. Generada sin marcar; una aprobación general del plan no constituye revisión de estos ocho ítems.

## Jerarquía y claridad

- [x] CHK001 ¿Se define “premium” mediante cabecera única, acción principal, jerarquía, tipografía/espaciado y retirada explícita de controles en individual y grupo? [Claridad, Spec FR-001, FR-002, FR-014, FR-021; SC-002, SC-008]
- [x] CHK002 ¿Está especificado cómo se explica una nota completa, ajustada, histórica o provisional sin inventar cálculos ni cambiar pesos? [Completitud, Spec FR-003, FR-004, FR-005; Historia 1]
- [x] CHK003 ¿Queda claro qué avisos se retiran/reubican y cuáles permanecen activos, sin contradicciones entre confianza, respuesta incorrecta y bloqueo? [Consistencia, Spec FR-006, FR-007, FR-008; Historia 2]

## Conservación y estados

- [x] CHK004 ¿Están diferenciados giro visual, borrador de hojas y guardado/recalificación, incluyendo originales, versiones, cancelación, límites y conflicto? [Cobertura, Spec FR-009, FR-010, FR-011, FR-019; Historia 3]
- [x] CHK005 ¿Se definen generar/copiar y reentrada de enlaces guardados, además de vencimiento, error, recuperación, múltiples accesos y fallos parciales? [Cobertura, Spec FR-013, FR-015; Historias 4 y 5]
- [x] CHK006 ¿Están documentados comentario íntegro, organización sin contenido inventado y protección de edición/borradores ante navegación o compartir? [Completitud, Spec FR-012, FR-014, FR-017; Historia 4]
- [x] CHK007 ¿Están definidos los permisos y la privacidad de notas, originales y enlaces, sin ampliar la información pública ni alterar revisión/publicación o cuota de chat? [Consistencia, Spec FR-007, FR-016, FR-019; contratos/revision.md]

## Medición y validación

- [x] CHK008 ¿Los requisitos de celular/escritorio, scroll, teclado, foco, claro/oscuro y evidencia visual tienen criterios medibles y distinguen emulación de prueba física? [Medición, Spec FR-018, FR-020, FR-021; SC-005, SC-007, SC-008; Evidencia visual requerida]

## Notas

- Revisada por el asistente a solicitud explícita del responsable: «Sí, revisa la lista y continúa», recibida en este chat. Se evaluó calidad de requisitos antes de entrar en Implement, no resultados de código.
- CHK001/003: la tabla añade/reutiliza/retira y el contrato de diseño distinguen controles de grupo/individual, alertas activas/históricas y acciones secundarias. CHK002: los cuatro casos de Historia 1 y SC-001 especifican cálculo/snapshot sin cambiar pesos.
- CHK004/007: Historia 3, modelo de estados y contrato de edición acotan original/preparada, borradores, confirmación, permisos y conflictos. CHK005/006: Historias 4/5 incluyen reentrada, expiración, error, parciales, texto íntegro y edición sin pérdida. CHK008: SC-005/008 y evidencia visual fijan anchos, objetivos táctiles, texto legible y pruebas físicas separadas.
- Resultado: 8/8 criterios de calidad completos, sin inconsistencias de alcance encontradas. No constituye comprobación de implementación ni autorización de producción.
- `$speckit-implement` lee los marcadores como gate y no los modifica.
- La comprobación posterior del software es distinta de esta lista y se documenta en tareas, pruebas y capturas.

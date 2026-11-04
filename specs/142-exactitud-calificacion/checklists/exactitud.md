# Lista de calidad de requisitos: exactitud objetiva

**Propósito**: revisar claridad, completitud, consistencia y medición del alcance aprobado, con énfasis en integridad de notas y adopción segura.
**Creada**: 2026-11-03
**Especificación**: [spec.md](../spec.md)
**Destinatario**: revisor del PR; revisión estándar de ocho puntos. Se adjunta después de la implementación, no como aprobación previa.

> Los marcadores pertenecen al revisor. `[x]` significa aprobación de la calidad del requisito, no prueba de que el código está terminado. Ningún marcador se da por aprobado mediante las pruebas técnicas.

## Completitud y claridad

- [ ] CHK001 ¿La prioridad de ID estable y el uso del número solo cuando es único están definidos para lecturas y claves repetidas? [Claridad, Spec FR-001]
- [ ] CHK002 ¿El alcance binario distingue ABCD de selección única y V/F de preguntas abiertas y dibujos, conservando máximos y fórmula? [Completitud, Spec FR-002, FR-004]
- [ ] CHK003 ¿Las lecturas incompatibles, hojas faltantes, correcciones, ilegibilidad y baja confianza tienen un resultado pendiente inequívoco, distinto de cero? [Cobertura de excepciones, Spec FR-003]
- [ ] CHK004 ¿El comportamiento ante reintentos y decisiones docentes existentes conserva datos y compatibilidad sin aplicación retrospectiva? [Recuperación y consistencia, Spec FR-004, FR-007]

## Privacidad, medición y adopción

- [ ] CHK005 ¿La explicación breve, la evidencia comprobable y la traza privada están delimitadas sin ampliar permisos o datos públicos? [Completitud, Spec FR-005, FR-004]
- [ ] CHK006 ¿La comparación especifica entradas congeladas y separa error de puntaje, abstenciones y límites de una referencia sintética? [Medición, Spec FR-006, SC-003]
- [ ] CHK007 ¿La validación docente independiente, la muestra anonimizada y el estudio ciego de abiertas están separados de satisfacción y de afirmaciones no medidas? [Consistencia y dependencias, Spec FR-008; quickstart §Protocolo antes de activar]
- [ ] CHK008 ¿Se define entrega desactivada, sin llamadas nuevas ni producción, y se exige CI y autorización separada antes de activar? [Límites y trazabilidad, Spec FR-007, FR-008]

## Notas

Checklist no aprobada todavía. Un pase futuro de Implement debe leer su estado sin modificar los marcadores y solicitar continuar si quedan puntos pendientes.

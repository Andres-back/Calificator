# Lista de calidad de especificación: inicio docente en iPhone y Android

**Propósito**: revisar la calidad del alcance antes de planificar; no certifica implementación.
**Creada**: 2026-10-06
**Especificación**: [spec.md](../spec.md)
**Responsabilidad**: ciclo de revisión de Specify/Clarify. Los marcadores no acreditan tareas completadas ni aprobación humana.

## Calidad del contenido

- [x] Sin detalles de implementación o dependencias de lenguajes/proveedores.
- [x] Centrada en valor docente y trabajo en el aula.
- [x] Escrita para personas no técnicas.
- [x] Secciones obligatorias completas.

## Completitud de requisitos

- [x] No quedan marcadores de aclaración pendientes.
- [x] Requisitos verificables y sin ambigüedades críticas.
- [x] Criterios de éxito medibles.
- [x] Resultados expresados desde la experiencia del usuario.
- [x] Escenarios de aceptación definidos para las tres historias.
- [x] Casos límite identificados.
- [x] Alcance acotado y exclusiones explícitas.
- [x] Dependencias y supuestos identificados.

## Preparación de la función

- [x] Requisitos vinculados a escenarios de aceptación.
- [x] Historias cubren arranque, trabajo y ayuda/pendientes.
- [x] Criterios permiten comprobar el resultado sin confundirlo con una medición de impacto docente.
- [x] No se prescribe arquitectura de implementación en los requisitos.

## Revisión

- Specify: 16/16 criterios satisfechos. FR-001/002 separan arranque protegido e identidad de instalación de la visita pública; FR-003/004 y SC-001/002 precisan prioridad y toques; FR-005/006 separan errores y consultas de mutaciones; FR-007/009 delimitan ayuda y accesibilidad; FR-008/010 conservan funciones, roles y registros.
- La aprobación de iPhone y Android está integrada en «Aclaraciones». No se exige repetirla ni decidir tecnologías; las comprobaciones físicas de ambas plataformas se distinguen de automatización en SC-004.
- Clarify completado y alcance aprobado por el usuario para iPhone y Android; el estado de estos marcadores no certifica implementación ni sustituye la aprobación del plan.

## Resultado de Clarify

No se detectaron ambigüedades críticas que justificaran otra pregunta. Cero preguntas adicionales. La ampliación espontánea del usuario a iPhone y Android se integra en solicitud, aclaración, aceptación, casos límite, SC-004 y supuestos, sustituyendo la prioridad anterior exclusiva Android. Calidad revalidada: 16/16 → 16/16, sin marcadores cambiados, regresiones ni criterios pendientes. No se añaden preguntas o respuestas ficticias.

| Categoría | Estado | Referencia |
|---|---|---|
| Alcance funcional y roles | Claro | Historias 1–3, FR-001/008/010 |
| Dominio e identidad de datos | Claro | Entidades, FR-002/004/006 |
| Interacción y estados | Claro | Historias 2–3, FR-003/005/007 |
| Calidad, fiabilidad, seguridad y privacidad | Claro | FR-001/008/009/010, SC-003/004/005 |
| Integraciones y dependencias | Claro | App instalable y funciones actuales; supuestos |
| Casos límite y fallos | Claro | Casos límite, FR-005 |
| Restricciones y decisiones excluidas | Claro | FR-008/010, supuestos |
| Terminología y consistencia | Claro | Materias, evaluaciones, asistencia y pendientes |
| Señales de finalización | Claro | SC-001–006 y aceptación de las tres historias |
| Marcadores y expresiones sin definición | Claro | Sin marcadores; compacto/legible precisados por SC-001/004 |

Hooks previos/posteriores de Specify/Clarify ausentes (`.specify/extensions.yml` no existe). La especificación está aprobada; siguiente paso: `speckit-plan` y su aprobación humana, no implementación ni despliegue.

# Lista de calidad de especificación: accesos y exportación de notas

Actualización 2026-10-07: el usuario aprobó solo exportaciones y autorizó revisar checklist y continuar. Historias 1/4 y sus requisitos quedan diferidos según «Alcance vigente aprobado»; los registros previos de revisión se conservan como historial. Revisión actual específica: exportaciones.md, 8/8. No se declara implementación de cambios diferidos.

**Propósito**: revisar el alcance antes de planificar, sin certificar implementación.
**Creada**: 2026-10-07
**Especificación**: [spec.md](../spec.md)
**Responsabilidad**: ciclo Specify/Clarify; los marcadores no sustituyen aprobación humana.

## Calidad del contenido

- [x] Sin detalles de arquitectura, lenguajes o dependencias de implementación.
- [x] Centrada en entregar accesos y registrar notas con menos trabajo docente.
- [x] Escrita para personas no técnicas.
- [x] Secciones obligatorias completas.

## Completitud de requisitos

- [x] No quedan marcadores de aclaración pendientes.
- [x] Requisitos comprobables sin ambigüedades críticas.
- [x] Criterios de éxito medibles.
- [x] Resultados expresados desde la experiencia del usuario.
- [x] Escenarios de aceptación definidos para las cuatro historias.
- [x] Casos límite identificados.
- [x] Alcance y exclusiones explícitos.
- [x] Supuestos y dependencias documentados.

## Preparación de la función

- [x] Requisitos vinculados a escenarios de aceptación.
- [x] Historias cubren altas, entrega posterior, exportación por evaluación y reutilización autorizada entre docentes.
- [x] Criterios verifican conservación de datos, privacidad y estados pendientes.
- [x] Requisitos no prescriben arquitectura de implementación.

## Revisión

Specify: 16/16 satisfechos. FR-001–003 y la historia 1 acotan usuarios nuevos y duplicados; FR-004–006 separan descarga y renovación; FR-007–009 concretan evaluaciones, alumnos y estados de notas; FR-010–013 cubren permisos, cuentas internas, movilidad y conservación de registros. FR-014–018 y la historia 4 incorporan la ampliación explícita del usuario: flujo mixto, coincidencias revisadas y separación académica por materia. Los formatos de entrega son resultados solicitados, no una arquitectura prescrita.

## Resultado de Clarify

Cero preguntas adicionales: el usuario resolvió la elección de apellido y añadió el alcance de varias evaluaciones. Se documentan como supuestos el CSV compatible con Excel, la conservación de cuentas anteriores y la renovación explícita para claves perdidas; requieren aprobación del alcance, no se consideran aprobados por estos marcadores. Se verificó el contexto activo con `check-prerequisites.ps1 -Json -PathsOnly` una vez. Revalidación: 16/16 → 16/16, sin cambios de marcadores.

| Categoría | Estado | Referencia |
|---|---|---|
| Alcance y roles | Claro | Historias 1–3, FR-010 |
| Identidad y dominio de datos | Claro | FR-001–003, entidades |
| Interacción y estados | Claro | FR-004–009, aceptación |
| Privacidad, permisos y fiabilidad | Claro | FR-005/006/009–013 |
| Integraciones y dependencias | Claro | Formatos de entrega, cuentas y estados actuales |
| Casos límite y fallos | Claro | Colisiones, consultas incompletas y renovaciones parciales |
| Restricciones y decisiones excluidas | Claro | Supuestos y FR-013 |
| Terminología y consistencia | Claro | Usuario interno, clave temporal, nota definitiva y estado |
| Señales de finalización | Claro | SC-001–006 |
| Marcadores y ambigüedades | Claro | Sin marcadores pendientes; ejemplos y recuentos definidos |

Hooks previos/posteriores de Specify/Clarify ausentes (`.specify/extensions.yml` no existe). Pendiente aprobación humana de la especificación; después corresponde Plan y su aprobación, no implementación inmediata. No se han modificado funciones, credenciales, notas ni producción.

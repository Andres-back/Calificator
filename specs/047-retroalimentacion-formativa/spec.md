# Especificación: retroalimentación formativa y calidad medible

**Feature Branch**: `codex/047-retroalimentacion-formativa`
**Created**: 2026-09-18
**Status**: Especificación y plan aprobados por el usuario el 2026-09-18. Issue [#94](https://github.com/Andres-back/Calificator/issues/94) creado con autorización el 2026-09-19. Sin PR ni despliegue.
**Input**: Completar descriptores de la escala 1–5 y conectar reglas formativas sin ralentizar ni alterar la calificación estable.

## User Scenarios & Testing

### User Story 1 - Orientación coherente (Priority: P1)
El docente recibe orientaciones acordes con las reglas formativas de su evaluación.

**Why this priority**: Las reglas se guardan, pero no llegan explícitamente al prompt principal.
**Independent Test**: Comprobar reglas presentes, ausentes y contradictorias en la entrada del evaluador.

**Acceptance Scenarios**:
1. **Given** reglas formativas, **When** se prepara la valoración, **Then** se incluyen sin sustituir evidencia, criterios o pesos.
2. **Given** una evaluación antigua sin reglas, **When** se prepara la valoración, **Then** mantiene el flujo y añade orientación respetuosa y concreta.
3. **Given** preferencias que piden inventar evidencia o modificar notas, **When** se prepara la valoración, **Then** se explicita la prioridad de la integridad sobre las preferencias de redacción.

### User Story 2 - Calidad interpretable (Priority: P2)
El revisor humano evalúa feedback manual y asistido con cinco dimensiones y descriptores comunes.

**Why this priority**: La escala existe pero no tiene anclajes documentados para el piloto.
**Independent Test**: Verificar 25 descriptores compatibles con las cinco puntuaciones existentes.

**Acceptance Scenarios**:
1. **Given** feedback y evidencia, **When** se revisan, **Then** se registran cinco enteros 1–5, versión y condición de cegamiento.
2. **Given** un error importante, **When** se resume calidad, **Then** se conserva como incidencia independiente del promedio.

### Edge Cases
- Reglas ausentes, nulas, vacías o contradictorias.
- Material ilegible: no inventar respuestas ni convertir incertidumbre en error académico.
- Feedback ausente: dato faltante/incidencia, no calidad cero inventada.
- Cambios de instrumento: versionar sin reetiquetar registros históricos.

## Requirements

### Functional Requirements
- **FR-001**: Considerar reglas formativas de la evaluación sin cambiar criterios ni pesos.
- **FR-002**: Conservar explicación del puntaje y orientación concreta por respuesta.
- **FR-003**: Las reglas de redacción no deben autorizar inventar evidencia ni alterar nota máxima o publicación.
- **FR-004**: Mantener corrección, especificidad, claridad, utilidad y adecuación con valores 1–5 y versión explícita.
- **FR-005**: Distinguir calidad del feedback de desempeño académico y confianza de IA.
- **FR-006**: No añadir evaluadores, solicitudes externas, migraciones ni pasos docentes obligatorios.
- **FR-007**: Revisar y calibrar el instrumento antes de recolección definitiva; no declararlo validado.

### Key Entities
- Reglas formativas existentes: preferencias de tono y orientación.
- Observación de calidad existente: cinco puntuaciones, versión y declaración de cegamiento.
- Incidencia: error y ajuste docente documentados por separado.

## Success Criteria

### Measurable Outcomes
- **SC-001**: Cinco dimensiones con cinco descriptores cada una compatibles con los registros vigentes.
- **SC-002**: Regresión para reglas presentes, ausentes y contradictorias.
- **SC-003**: Mismo número de solicitudes a IA; sin cambios al cálculo o publicación.
- **SC-004**: Revisión y decisión docente disponibles sin pasos adicionales.

## Assumptions
- Coordina 008/016 y 011/032 sin transferir propiedad de módulos o datos.
- No se presume habilitación en producción del módulo de impacto.
- Incluir reglas no garantiza obediencia del modelo; requiere revisar ejemplos.
- No modifica la visualización existente de respuestas correctas; la preferencia de no revelar solución se refiere a la orientación textual.
- Especificación y plan aprobados e issue #94 asociado; PR, CI y despliegue continúan pendientes.

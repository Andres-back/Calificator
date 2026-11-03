# Feature Specification: Recalificar con puntajes actuales

**Feature Branch**: `codex/140-recalificar-puntajes-actuales`
**Created**: 2026-11-02
**Status**: Approved
**Issue**: #299
**Input**: El docente corrigió el reparto de una evaluación ya calificada. Algunas
entregas adoptaron los nuevos puntos y otras siguen usando los anteriores aunque
se recalifiquen. Solicita poder confirmar los puntos actuales sin perder historial.
El usuario aprobó expresamente avanzar con esta corrección en este chat.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Saber y aceptar qué puntos se usarán (Priority: P1)

Al volver a calificar, el docente ve si cambió solamente el reparto y puede
confirmar que se utilicen los puntos actuales. No necesita actualizar notas desde
otra pantalla para que la siguiente recalificación use esos puntos.

**Why this priority**: Evita resultados repetidos con un reparto que el docente ya corrigió.
**Independent Test**: Nueve preguntas, siete cerradas que suman 2,5 y dos abiertas
de 1,25; una entrega conserva 0,56/0,52. Antes de confirmar no cambia nada; después
el trabajo utiliza 1,25 en ambas abiertas.

**Acceptance Scenarios**:
1. **Given** solo cambió el reparto, **When** abre volver a calificar,
   **Then** ve los máximos anteriores y actuales de las preguntas modificadas.
2. **Given** el aviso, **When** confirma usar los puntos actuales y envía,
   **Then** una sola recalificación usa el reparto visto y conserva el resultado anterior.
3. **Given** un cliente anterior sin esa confirmación, **When** intenta recalificar
   con reparto diferente, **Then** recibe una indicación comprensible y no se encola silenciosamente.
4. **Given** los mismos puntos, **When** recalifica o cambia evidencia,
   **Then** el flujo habitual conserva su comportamiento y no exige una aceptación adicional.

### User Story 2 - No confundir cambios de contenido con puntos (Priority: P1)

El docente no debe calificar una foto antigua con preguntas, claves, lectura o
figuras nuevas por el mero hecho de existir una versión más reciente.

**Why this priority**: Conserva la integridad de notas y evidencia.
**Independent Test**: Modificar una clave o una pregunta junto a los puntos no
ofrece adoptar esa nueva versión y conserva la versión de la entrega.

**Acceptance Scenarios**:
1. **Given** cambió el contenido educativo o la escala, **When** consulta la
   recalificación, **Then** se informa que se usará la versión original y no se
   permite adoptar la actual mediante la confirmación de puntos.
2. **Given** cambió de nuevo el reparto o la nota después del aviso, **When**
   confirma el aviso anterior, **Then** se rechaza el envío sin alterar datos y
   puede consultar de nuevo conservando motivo y archivos seleccionados.
3. **Given** una entrega sin versión histórica comprobable, **When** consulta o
   envía, **Then** conserva la protección existente, sin inventar un reparto anterior.

### User Story 3 - Conservar decisiones y funcionamiento en móvil (Priority: P2)

La nueva confirmación cabe en el diálogo actual y deja claro que volver a
calificar reabre la nota, sin publicar automáticamente ni borrar decisiones previas.

**Why this priority**: La corrección no debe añadir otro camino ni otra pantalla.
**Independent Test**: Diálogo a 384 px y escritorio, con teclado y en ambos temas.

**Acceptance Scenarios**:
1. **Given** una nota ajustada/publicada, **When** confirma reabrir y usar los
   puntos nuevos, **Then** el ajuste, nota, evidencia y retroalimentación previos
   permanecen en el historial; los enlaces anteriores se suspenden como antes.
2. **Given** el envío se repite por acuse perdido, **When** reusa su solicitud,
   **Then** no duplica historial ni trabajos ni adopta un reparto distinto.
3. **Given** un estudiante u otro docente, **When** intenta consultar/adoptar el
   reparto para la entrega, **Then** se deniega con los permisos existentes.

### Edge Cases

- Versiones intermedias con los mismos puntos; preguntas por secciones; decimales.
- Selección de evidencia nueva con o sin escáner y cancelación del diálogo.
- Consulta fallida, conexión lenta, solicitud concurrente y trabajos ya activos.
- Escala distinta, versión ausente o retirada, claves y figuras modificadas.
- La protección de ajustes manuales del cambio masivo de Spec137 sigue intacta;
  reabrir individualmente mantiene su confirmación y conserva la decisión anterior.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Mostrar qué reparto se usará antes de enviar otra calificación.
- **FR-002**: Detectar diferencias solo de puntos comprobando que todo el
  contenido educativo y la escala siguen siendo los mismos.
- **FR-003**: Ofrecer confirmar los puntos actuales con comparación por pregunta;
  esa aceptación no sustituye confirmar la reapertura de una decisión docente.
- **FR-004**: Enviar únicamente el reparto mostrado y aceptado; nunca sustituirlo
  por otro que cambie durante el envío.
- **FR-005**: Conservar nota, ajuste, retroalimentación, evidencia y versión anterior
  en historial antes de reabrir; registrar también la versión de puntos aceptada.
- **FR-006**: Impedir el envío silencioso con puntos antiguos cuando solo cambió
  el reparto y falta aceptación, incluyendo clientes anteriores.
- **FR-007**: No adoptar preguntas, soluciones, materiales ni escala nuevos desde
  la confirmación de reparto; mantener las protecciones históricas.
- **FR-008**: Mantener permisos, idempotencia, bloqueo de trabajos simultáneos y
  suspensión de enlaces; una repetición no crea otra operación.
- **FR-009**: Mantener la evidencia seleccionada y motivo opcional ante un conflicto
  y permitir consultar de nuevo sin aceptar automáticamente la nueva propuesta.
- **FR-010**: Funcionar al recalificar y al cambiar evidencia, sin exigir otra
  confirmación si no hay diferencia de puntos; no añadir llamadas de IA para detectar cambios.
- **FR-011**: Presentar texto sencillo y controles accesibles de 360 px a escritorio,
  sin rutas duplicadas ni desbordamiento, con scroll normal dentro del diálogo.
- **FR-012**: No reescribir notas existentes automáticamente ni cambiar modelos,
  credenciales, cuotas o archivos reales como parte de esta entrega de código.

### Key Entities

- **Reparto de la entrega**: versión conservada de preguntas, máximos y material.
- **Propuesta de recalificación**: comparación vigente de puntos y referencia
  comprobable a la nota y evaluación observadas.
- **Revisión de nota**: registro previo a la reapertura y del reparto aceptado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En una muestra sintética mixta de 24 entregas, las confirmadas usan
  1,25 en las dos abiertas; las no enviadas conservan todos sus datos anteriores.
- **SC-002**: Ningún envío sin aceptación ni aceptación desactualizada crea un
  trabajo con puntos distintos de los vistos por el docente.
- **SC-003**: El 100 % de pruebas de cambios de contenido, permisos, repeticiones,
  concurrencia e historial conserva las protecciones existentes.
- **SC-004**: A 384 px y 1440 px el docente ve el aviso y puede confirmar/cancelar
  con teclado o tacto, sin desplazamiento horizontal, en ambos temas.

## Assumptions

- Se amplía el flujo individual existente y la acción de cambiar evidencia; no
  se modifica el reparto ni la actualización masiva separada de Spec137.
- Recalificar produce una propuesta nueva que debe revisar el docente, como antes.
- No se realizarán inferencias adicionales ni recalificaciones reales para probarlo.
- Se conserva una ruta de reversión por código, sin migrar ni borrar datos históricos.

## Añade, reutiliza y retira

| Área | Qué añade | Qué reutiliza | Qué texto o control retira/reubica |
| --- | --- | --- | --- |
| Recalificar/cambiar evidencia | Comparación y aceptación de puntos actuales | Diálogo, envío, historial y confirmación docente actuales | Sustituye la explicación ambigua que solo mencionaba la evidencia por una que identifica también el reparto |

## Evidencia visual requerida

- Antes del código funcional: maqueta sintética a 384 px, identificada como diseño.
- Antes de fusión: capturas de implementación a 384 px y escritorio, claro/oscuro,
  con error recuperable y confirmaciones. Sin nombres ni datos académicos reales.

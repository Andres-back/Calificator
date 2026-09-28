# Especificación: retroalimentación formativa y calidad medible

**Feature Branch**: `codex/047-retroalimentacion-formativa`
**Created**: 2026-09-18
**Status**: Implementación inicial fusionada mediante PR [#127](https://github.com/Andres-back/Calificator/pull/127). Evolución posterior al primer piloto aprobada por el usuario el 2026-09-24 y trazada en el issue [#137](https://github.com/Andres-back/Calificator/issues/137).
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

### User Story 3 - Retroalimentación segura después del piloto (Priority: P1)
El docente no recibe como lista para publicar una retroalimentación que contradiga la evidencia, la suma por preguntas o al verificador independiente.

**Why this priority**: En la primera prueba en aula una felicitación afirmó que cinco multiplicaciones eran correctas, aunque la evidencia contenía operaciones distintas y el desglose interno no coincidía con la nota global.
**Independent Test**: Simular desacuerdo por pregunta, diferencia entre suma y nota global y una felicitación incompatible con respuestas incorrectas; todos deben terminar pendientes de revisión y conservar la salida original solo como trazabilidad.

**Acceptance Scenarios**:
1. **Given** discrepancia material entre evaluador y verificador, **When** se consolida la calificación, **Then** el componente queda pendiente, la nota no se confirma automáticamente y el feedback contradictorio no se presenta como definitivo.
2. **Given** una operación escrita que no coincide con el enunciado, **When** visión la transcribe, **Then** conserva los dígitos visibles, señala la diferencia y no completa la respuesta desde la pregunta o la clave.
3. **Given** componentes completos y coherentes, **When** se redacta feedback, **Then** incluye un acierto observado, el error concreto cuando exista y una acción verificable en lenguaje adecuado al grado.
4. **Given** una calificación histórica, **When** se despliega esta evolución, **Then** no se reescribe, recalcula ni elimina ningún registro existente.

### Edge Cases
- Reglas ausentes, nulas, vacías o contradictorias.
- Material ilegible: no inventar respuestas ni convertir incertidumbre en error académico.
- Feedback ausente: dato faltante/incidencia, no calidad cero inventada.
- Cambios de instrumento: versionar sin reetiquetar registros históricos.
- Mensaje global que afirma perfección mientras existe un componente parcial, incorrecto o pendiente.
- Contexto del enunciado que induce a visión a copiar operandos o resultados no visibles.
- Desacuerdo entre evaluadores que produce una nota numérica pero no evidencia suficiente para una devolución segura.

## Requirements

### Functional Requirements
- **FR-001**: Considerar reglas formativas de la evaluación sin cambiar criterios ni pesos.
- **FR-002**: Conservar explicación del puntaje y orientación concreta por respuesta.
- **FR-003**: Las reglas de redacción no deben autorizar inventar evidencia ni alterar nota máxima o publicación.
- **FR-004**: Mantener corrección, especificidad, claridad, utilidad y adecuación con valores 1–5 y versión explícita.
- **FR-005**: Distinguir calidad del feedback de desempeño académico y confianza de IA.
- **FR-006**: No añadir evaluadores, solicitudes externas, migraciones ni pasos docentes obligatorios.
- **FR-007**: Revisar y calibrar el instrumento antes de recolección definitiva; no declararlo validado.
- **FR-008**: La extracción visual debe transcribir literalmente operandos, productos parciales, resultados, tachones y diferencias visibles sin resolver ni completar desde el enunciado.
- **FR-009**: Una discrepancia material por pregunta, una suma incompatible o una afirmación global incompatible con el desglose debe bloquear la retroalimentación definitiva y requerir revisión docente.
- **FR-010**: La salida original de IA debe conservarse para auditoría, pero el estudiante no debe recibir como definitiva una explicación detectada como contradictoria.
- **FR-011**: La retroalimentación formativa debe usar lenguaje adecuado al grado y contener evidencia concreta y una acción verificable; evitar consejos genéricos como «estudia más» o tecnicismos innecesarios.
- **FR-012**: La evolución no debe modificar automáticamente calificaciones, evidencias, feedback, historial ni decisiones docentes anteriores al despliegue.

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
- **SC-005**: El 100 % de los casos sintéticos con desacuerdo material o incoherencia entre nota y componentes termina en revisión docente, sin mensaje de «todo correcto» publicable.
- **SC-006**: En regresiones de operaciones aritméticas, la extracción conserva operandos y resultados visibles aunque difieran del enunciado.
- **SC-007**: Los mensajes aceptados contienen al menos una referencia verificable al trabajo y, cuando hay mejora pendiente, una acción concreta comprensible para el grado.
- **SC-008**: El despliegue requiere cero migraciones destructivas y cero actualizaciones masivas de registros históricos.

## Assumptions
- Coordina 008/016 y 011/032 sin transferir propiedad de módulos o datos.
- No se presume habilitación en producción del módulo de impacto.
- Incluir reglas no garantiza obediencia del modelo; requiere revisar ejemplos.
- No modifica la visualización existente de respuestas correctas; la preferencia de no revelar solución se refiere a la orientación textual.
- Especificación y plan aprobados, issue #94 y PR #127 asociados; CI y despliegue continúan protegidos por el flujo de `main`.

## Aprendizajes anonimizados del primer piloto en aula — 2026-09-23

- La velocidad percibida por la docente fue adecuada y permitió completar una tanda real dentro de la clase; este resultado se registrará por separado en los instrumentos de impacto y no prueba por sí solo calidad pedagógica.
- En comprensión lectora, la mayoría de mensajes ubicó omisiones concretas, pero algunos fueron genéricos o usaron expresiones técnicas poco adecuadas para segundo grado.
- En matemáticas, una entrega evidenció que la extracción puede anclarse al enunciado y sustituir dígitos visibles. La retroalimentación general afirmó que todo estaba correcto mientras el desglose y la evidencia se contradecían.
- El hallazgo confirma que la calidad no puede inferirse de la confianza del modelo ni de una redacción convincente. Debe comprobarse coherencia entre evidencia, componentes, suma, nota y mensaje antes de publicar.
- Los registros observados se mantienen intactos como evidencia del piloto. Cualquier corrección histórica será una decisión docente explícita y auditable, nunca efecto colateral del despliegue.

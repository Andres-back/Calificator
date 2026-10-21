# Feature Specification: Envío fiable de encuesta docente

**Feature Branch**: `codex/109-encuesta-envio-seguro`
**Created**: 2026-10-20
**Status**: Approved — hotfix autorizado en el chat el 2026-10-20
**Issue**: https://github.com/Andres-back/Calificator/issues/226
**Input**: Corregir el envío y comprobar producción sin alterar respuestas existentes.

## User Scenarios & Testing

### User Story 1 - Terminar y saber que se guardó (Priority: P1)

El docente completa el formulario desde celular o computador, firma y recibe una confirmación con código únicamente cuando la respuesta queda recibida.

**Why this priority**: Hay docentes que creen haber terminado y no encuentran su entrega.
**Independent Test**: Completar una encuesta sintética y consultar su constancia en el panel privado de una instalación aislada.

**Acceptance Scenarios**:
1. **Given** una firma insuficiente, **When** intenta enviar, **Then** se indica cómo corregirla antes de iniciar el envío.
2. **Given** un formulario válido, **When** el servidor confirma la recepción correspondiente, **Then** se muestra código, fecha y acceso a la constancia.
3. **Given** un error o una respuesta inesperada, **When** termina el intento, **Then** no se muestra éxito ni se borran los campos.

### User Story 2 - Reintentar sin perder ni duplicar (Priority: P1)

**Why this priority**: La conexión móvil puede fallar después de enviar.
**Independent Test**: Simular rechazo y pérdida de confirmación, reintentar y verificar una sola constancia.

**Acceptance Scenarios**:
1. **Given** una interrupción, **When** reintenta en la misma pestaña, **Then** se conserva el envío pendiente y no se crea una segunda respuesta.
2. **Given** una validación rechazada, **When** corrige el campo señalado, **Then** puede volver a enviar sin reiniciar el cuestionario.
3. **Given** una pestaña cerrada antes de enviar, **Then** no se afirma que las respuestas sean recuperables.

### Edge Cases

Firma de pocos puntos o demasiado corta; correo incorrecto; respuesta ajena al envío; respuesta no JSON; tiempo de espera; pérdida de conexión tras guardar; doble clic; consentimiento cambiado; consulta administrativa sin sesión.

### User Story 3 - Diagnóstico por versión (Priority: P1)

**Why this priority**: Ampliación solicitada el 2026-10-20: minutos exactos, abiertas, legibilidad, cámara y entrega/respaldo de hojas.
**Independent Test**: Respuestas sintéticas anteriores y nuevas conservan su versión, constancia y recuentos separados.
**Acceptance Scenarios**:
1. **Given** una respuesta 4.0, **When** se publica 5.0, **Then** no se reetiqueta ni altera su contenido.
2. **Given** minutos y entregas de la misma evaluación, **When** son válidos, **Then** se calcula minutos por entrega sin transformar rangos antiguos.
3. **Given** el formulario nuevo, **Then** recoge proporción de abiertas, legibilidad, cámara y entrega de hojas/respaldo, y separa duración del formulario de tiempo de calificación.

## Requirements

### Functional Requirements

- **FR-001**: Validar la firma con las mismas condiciones que exige la recepción, conservando la firma obligatoria y sus autorizaciones.
- **FR-002**: Distinguir en curso, enviando, pendiente de confirmación, rechazado y guardado con mensajes comprensibles.
- **FR-003**: Conservar en memoria el envío incierto y permitir reintentos idénticos sin duplicados; nunca almacenar firmas o respuestas en almacenamiento persistente del navegador.
- **FR-004**: No borrar el formulario ni mostrar éxito ante una confirmación incompleta o correspondiente a otro envío.
- **FR-005**: Orientar la corrección de nombre, correo y firma sin obligar a empezar nuevamente; conservar rechazo del servidor como protección final.
- **FR-006**: Mantener accesos privados y constancias originales intactas; no modificar notas, evidencias, claves, consentimientos históricos ni la muestra.
- **FR-007**: Registrar categorías de rechazo sin nombres, respuestas, firmas, contactos, direcciones de red ni credenciales.
- **FR-008**: Verificar el servicio publicado y comparar huellas de registros antes y después; no insertar pruebas ficticias en las bases productivas.
- **FR-009**: Publicar LR-CR-01 5.0-web-medicion con minutos numéricos, procedencia medida/estimada y entregas enteras de la misma evaluación; nunca inferir minutos exactos de 4.0.
- **FR-010**: Añadir porcentaje de preguntas abiertas, legibilidad, cámara declarada, entrega de hojas al alumnado y disponibilidad posterior de respaldo, con omisión/no aplica diferenciados.
- **FR-011**: Mostrar y exportar recuentos por versión; distinguir respuestas de docentes declarados por nombre/institución normalizados, sin acreditar identidad.
- **FR-012**: Retirar la estimación 5–7 minutos no medida y registrar duración transcurrida y visible del formulario, no de calificación. La preprueba humana queda pendiente, sin inventar resultados.
- **FR-013**: Admitir formularios 4.0 ya abiertos con exactamente su esquema y consentimiento archivados; mantener cierre global y rechazar versiones desconocidas.
- **FR-014**: Pedir nombre completo solo al inicio; en la firma mostrar ese nombre automáticamente, permitir corregirlo desde un único campo y enviar el mismo nombre sin repetir su escritura. Conservar el dibujo de firma y su autorización; si se corrige la identidad después de firmar, solicitar nueva firma/autorización. Prioridad explícita del usuario antes de continuar el CRUD.

### Key Entities

- Envío pendiente: identificador y contenido conservados en la pestaña mientras su recepción no esté confirmada.
- Constancia: respuesta recibida, versiones, fecha, consentimiento, firma y huella; inmutable.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Todos los casos de firma inválida de la regresión se detienen antes de enviar.
- **SC-002**: Ningún rechazo, corte de conexión o confirmación ajena de la matriz muestra éxito ni borra datos.
- **SC-003**: Dos reintentos idénticos producen exactamente una constancia en la prueba aislada.
- **SC-004**: El recorrido completo se valida a 360 px y escritorio, con motor móvil equivalente a Safari; las constancias productivas previas conservan el 100 % de sus huellas.
- **SC-005**: Ambas versiones se exportan y cuentan por separado; solo datos numéricos válidos permiten calcular minutos por entrega.

## Assumptions

- No se conoce el motivo exacto de los tres rechazos históricos; no se les atribuye la firma sin evidencia.
- No se pueden reconstruir respuestas que nunca llegaron o cuya pestaña se cerró.
- Se incorpora a main únicamente el servicio independiente ya desplegado desde `5d05751`, más este hotfix; la rama anterior contiene cambios académicos ajenos que no se fusionarán.
- La actualización exige PR y CI verde; no se amplía el consentimiento para guardar borradores identificados.
- Esta ampliación explícita del usuario publica el conjunto como 5.0. Retroalimentación del piloto mantiene 1.0 porque sus preguntas no cambian. La encuesta no demuestra reducción causal del 40 %.
- La prioridad nombre único se entrega en release 5.0.1, sin cambiar preguntas 5.0 ni consentimiento. El CRUD solicitado queda pendiente y separado en [borrador](admin-crud-draft.md), no se presume terminado.

# Hotfix: lectura de listas con el modelo administrativo

**Feature Branch**: `codex/132-listas-glm-flash`
**Created**: 2026-10-28
**Status**: Aprobado por petición directa; hotfix abreviado
**Issue**: [#277](https://github.com/Andres-back/Calificator/issues/277)
**Input**: «actualiza el de las listas a glm flash, y deja el pr listo para fusion».

## User Scenarios & Testing

### User Story 1 — Leer la lista con el modelo elegido (P1)

El profesor sube una lista y revisa los nombres antes de crear cuentas. El administrador puede elegir GLM Flash para este lector sin cambiar el modelo de calificación ni modificar código por cada selección posterior.

**Independent Test**: lista ficticia enviada al lector con una selección administrativa capturada; comprobar modelo, credencial y nombres propuestos, sin crear usuarios.

**Acceptance Scenarios**:

1. Dada la selección GLM Flash comprobada, al leer una foto se utiliza ese modelo y su conexión, y se muestran nombres editables para revisión.
2. Dada una conexión configurada con un respaldo, si falla el principal se conserva la separación de credenciales y solo se usa el respaldo autorizado.
3. Dada una configuración ausente o una credencial no disponible, no se utiliza silenciosamente un modelo antiguo ni otra clave.

### User Story 2 — Entender por qué falló (P2)

El profesor debe distinguir un servicio no disponible de una lista sin nombres reconocibles, sin recibir detalles técnicos ni la indicación errónea de repetir la foto ante todo fallo.

**Independent Test**: simular servicio retirado, respuesta inválida y lista vacía; comprobar mensajes en celular y computador.

**Acceptance Scenarios**:

1. Dado un rechazo del proveedor, el resultado explica que el servicio no pudo completar la lectura, no culpa la iluminación y no revela contenido del proveedor.
2. Dada una respuesta válida sin nombres, se sugiere otra foto con la lista visible.
3. Dado un lote antiguo sin categoría de fallo, la interfaz usa un mensaje neutral y permite volver a elegir una foto.

### Edge Cases

- Credencial personal inexistente, respaldo institucional y revisiones de clave diferentes.
- Respuesta incompleta o malformada; no convertir un fallo técnico en nombres vacíos ni crear cuentas.
- Trabajo admitido antes del cambio: conserva su selección; no reescribir trabajos ni repetir listas reales.
- Fotografías temporales conservan su política de cancelación, vencimiento y eliminación vigente; no ampliar retención en este hotfix.

## Requirements

### Functional Requirements

- **FR-001**: El lector DEBE consumir la selección administrativa capturada, sin modelo de emergencia fijado en su lógica de negocio.
- **FR-002**: Las conexiones configuradas DEBEN recibir únicamente su credencial correspondiente; el respaldo explícito debe conservar su propia credencial.
- **FR-003**: La selección operativa solicitada DEBE ser GLM Flash solo para listas; su publicación debe ser versionada y posterior a la integración del consumidor corregido, sin alterar rutas ajenas.
- **FR-004**: Un fallo del servicio DEBE distinguirse de la ausencia válida de nombres, sin exponer nombres, claves ni respuestas técnicas en mensajes o registros nuevos.
- **FR-005**: El profesor DEBE recibir un mensaje comprensible y acceso para elegir otra foto a 360 px y en escritorio; lotes antiguos usan una explicación neutral.
- **FR-006**: Se DEBEN conservar autorización, revisión de nombres, confirmación explícita, idempotencia y limpieza privada; ninguna prueba debe modificar alumnos reales.
- **FR-007**: Un rechazo permanente del proveedor NO DEBE provocar nuevas lecturas por rotar la misma foto; los reintentos transitorios siguen el cliente existente.
- **FR-008**: La entrega DEBE ser un PR independiente con regresiones y CI, sin fusión, despliegue manual ni cambios al escáner pendiente.
- **FR-009**: La entrega DEBE conservar la auditoría obligatoria de dependencias e incorporar la actualización de PDF ya autorizada previamente, verificando exportaciones sin modificar su contenido académico.

### Key Entities

- Selección capturada: modelo, conexión, revisión de credencial y respaldo autorizado del trabajo.
- Lote de importación: estado, filas revisables y categoría segura del resultado, sin cambio de esquema.

## Success Criteria

- **SC-001**: Todas las pruebas de selección, principal y respaldo usan exclusivamente las credenciales esperadas; ninguna usa el modelo retirado por omisión.
- **SC-002**: Servicio rechazado, salida inválida y lista vacía producen explicaciones distintas y ninguna crea estudiantes.
- **SC-003**: El flujo de error y recuperación es utilizable sin desbordamiento a 360 y 1440 px.
- **SC-004**: El PR conserva los datos existentes y todos sus controles requeridos pasan antes de declararse listo para fusionar.

## Assumptions

GLM Flash ya figura activo, visual y comprobado en el catálogo productivo. La publicación debe reutilizar la configuración central existente, no una migración que imponga un modelo sobre elecciones posteriores. Esta autorización no incluye fusionar el PR ni nuevas llamadas con nombres o fotografías reales. La validación de transporte con dobles no demuestra precisión OCR universal.

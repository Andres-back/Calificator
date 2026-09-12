# Especificación: Estabilización de evidencia y calidad backend

**Rama**: `codex/037-stabilize-backend-quality` | **Creada**: 2026-09-11 | **Estado**: Aprobada | **Issue**: #76

## Escenarios de usuario y pruebas

### Historia 1 - Consultar la evidencia completa (Prioridad: P1)

Como docente o estudiante autorizado, necesito abrir o descargar la evidencia completa de una entrega para revisar exactamente el documento presentado y tomar decisiones informadas.

**Razón de prioridad**: La evidencia sustenta la calificación; una respuesta vacía o un error impide la revisión humana exigida por el sistema.

**Prueba independiente**: Una entrega con archivo válido devuelve el contenido completo, su tipo de contenido y controles de privacidad; un usuario no autorizado sigue siendo rechazado.

**Aceptación**:
1. **Dado** un usuario autorizado y una entrega con evidencia válida, **cuando** solicita el documento completo, **entonces** recibe el archivo correcto para visualización en línea.
2. **Dado** un usuario sin acceso a la entrega, **cuando** solicita la evidencia, **entonces** no recibe el archivo ni información sensible.
3. **Dado** un archivo ausente o una referencia inválida, **cuando** se solicita la evidencia, **entonces** se informa que no fue encontrada sin revelar rutas internas.

### Historia 2 - Validar una estructura bloqueada sin error interno (Prioridad: P1)

Como docente, necesito recibir una explicación estable cuando una operación no puede modificar la estructura de una evaluación para entender cómo continuar sin que la aplicación falle.

**Razón de prioridad**: Un error interno durante edición rompe el flujo docente y oculta una regla de negocio que debe ser comprensible.

**Prueba independiente**: Al intentar validar una estructura en un estado no permitido, la operación devuelve un conflicto comprensible y nunca un error interno.

**Aceptación**:
1. **Dado** que la estructura de una evaluación está bloqueada, **cuando** se intenta validarla, **entonces** el sistema rechaza la acción con un mensaje estable y comprensible.
2. **Dado** que la evaluación sigue en borrador, **cuando** se valida una estructura correcta, **entonces** el comportamiento existente se conserva.

### Historia 3 - Impedir nombres indefinidos en cambios futuros (Prioridad: P2)

Como responsable de mantenimiento, necesito que la integración continua rechace referencias indefinidas en el backend para evitar que errores detectables estáticamente lleguen a producción.

**Razón de prioridad**: Las pruebas actuales no ejercitan todas las ramas excepcionales y por sí solas no detectaron las dos regresiones.

**Prueba independiente**: El control de calidad acepta el estado corregido y falla ante una referencia indefinida introducida deliberadamente en una comprobación aislada.

**Aceptación**:
1. **Dado** un cambio backend sin nombres indefinidos, **cuando** se ejecuta el control obligatorio, **entonces** el cambio puede continuar hacia las pruebas.
2. **Dado** un cambio backend que usa un nombre indefinido, **cuando** se ejecuta el control obligatorio, **entonces** el cambio se rechaza antes del despliegue.

### Casos límite

- La evidencia puede ser una imagen o un PDF y debe conservar el tipo apropiado.
- Las páginas renderizadas mantienen su ruta independiente y no deben sustituir la descarga del documento completo.
- Una evaluación asignada conserva el comportamiento de edición permitido por sus rutas específicas; este hotfix solo estabiliza la operación de validación que ya exige borrador.
- El control nuevo se limita inicialmente a errores de nombres indefinidos para no mezclar la corrección urgente con 79 cambios de estilo.

## Requisitos

### Requisitos funcionales

- **FR-001**: El sistema DEBE devolver el archivo completo de una entrega únicamente a usuarios autorizados.
- **FR-002**: La respuesta del archivo DEBE incluir un tipo de contenido válido, disposición en línea y controles que impidan almacenamiento público involuntario.
- **FR-003**: El sistema DEBE conservar respuestas seguras para evidencia inexistente, ausente o fuera del almacenamiento permitido.
- **FR-004**: La validación de una estructura bloqueada DEBE responder como conflicto de negocio con un mensaje estable y nunca como error interno.
- **FR-005**: La validación de estructuras en borrador DEBE conservar su comportamiento vigente.
- **FR-006**: La integración continua DEBE rechazar nombres indefinidos en el código backend.
- **FR-007**: Cada defecto corregido DEBE tener una prueba de regresión que ejercite la rama que fallaba.
- **FR-008**: El hotfix NO DEBE cambiar rutas públicas, permisos, modelos de datos ni la autoridad de las calificaciones.

## Criterios de éxito

- **SC-001**: El 100 % de las solicitudes autorizadas de evidencia completa incluidas en las pruebas devuelven un archivo utilizable.
- **SC-002**: El 100 % de los intentos probados sobre estructuras bloqueadas terminan en un conflicto comprensible y ninguno en error interno.
- **SC-003**: Una referencia indefinida introducida en la comprobación aislada es rechazada antes de ejecutar el despliegue.
- **SC-004**: Todas las pruebas aplicables de evidencia, evaluaciones, permisos y contratos continúan aprobadas.

## Supuestos

- El almacenamiento actual permanece local y no se modifica en este hotfix.
- Las rutas y permisos existentes representan el contrato que debe preservarse.
- La aprobación explícita del usuario en esta conversación corresponde a la aprobación humana de la especificación registrada en el issue #76.
- La limpieza completa, división de módulos y escalado horizontal se realizarán en cambios posteriores separados.

# Especificación: Modularización segura de evidencia de calificación

**Rama**: `codex/039-modularizar-evidencia` | **Creada**: 2026-09-12 | **Estado**: Aprobada | **Issue**: #80

## Escenarios de usuario y pruebas

### Historia 1 - Conservar el acceso seguro a la evidencia (Prioridad: P1)

Como docente o estudiante, necesito que las fotografías y PDF de una entrega sigan abriendo exactamente igual después del mantenimiento para revisar el trabajo sin errores ni exposición de rutas privadas.

**Razón de prioridad**: la evidencia respalda cada nota y cualquier regresión afectaría la trazabilidad de la calificación.

**Prueba independiente**: una imagen, un PDF de varias páginas y una entrega antigua pueden consultarse por los mismos recorridos y con los mismos permisos actuales.

**Aceptación**:
1. **Dada** una entrega autorizada con una imagen, **cuando** el usuario abre la evidencia, **entonces** recibe la misma imagen y nunca conoce la ruta interna almacenada.
2. **Dada** una entrega autorizada con PDF, **cuando** el usuario solicita una página válida, **entonces** puede verla con el mismo límite y comportamiento de caché actuales.
3. **Dado** un usuario sin acceso a la entrega, **cuando** intenta consultar evidencia, **entonces** continúa siendo rechazado por las mismas reglas vigentes.

### Historia 2 - Mantener intacta la preparación multihoja (Prioridad: P1)

Como docente o estudiante, necesito que ordenar, rotar, consolidar y reemplazar hojas conserve su comportamiento para que una entrega produzca una sola evidencia coherente y calificable.

**Razón de prioridad**: la normalización es la entrada de la visión; cambiarla podría modificar la interpretación o la nota.

**Prueba independiente**: paquetes de una y varias fotografías, PDF y evaluaciones mixtas producen los mismos metadatos, orden y referencia de evidencia que antes del mantenimiento.

**Aceptación**:
1. **Dado** un paquete válido de fotografías, **cuando** se prepara para calificación, **entonces** conserva orden, rotaciones, cantidad de páginas y nombres originales.
2. **Dada** una evaluación mixta, **cuando** se asocia evidencia física, **entonces** conserva la separación actual entre respuestas en línea y páginas físicas.
3. **Dado** un reemplazo confirmado, **cuando** se guarda la nueva evidencia, **entonces** el archivo anterior se retira con la misma política actual y no quedan referencias públicas inválidas.

### Historia 3 - Reducir el riesgo de mantenimiento (Prioridad: P2)

Como responsable de XCalificator, necesito que la gestión interna de evidencia tenga un propietario claro y aislado del despacho de rutas para poder corregirla o ampliarla sin recorrer un archivo monolítico.

**Razón de prioridad**: un límite pequeño y probado disminuye el riesgo de futuros cambios en el flujo crítico de calificación.

**Prueba independiente**: cada transformación o lectura de evidencia tiene una única definición reutilizable, mientras el despacho conserva únicamente la coordinación de solicitudes y permisos.

**Aceptación**:
1. **Dado** el código reorganizado, **cuando** se localiza la lógica de evidencia, **entonces** existe un único componente responsable y no quedan implementaciones duplicadas en el despacho.
2. **Dado** un consumidor interno o una prueba existente, **cuando** utiliza las capacidades actuales, **entonces** conserva compatibilidad durante esta primera extracción.

### Casos límite

- Una página inexistente conserva la respuesta de no encontrado; un PDF que supera el límite conserva el rechazo actual.
- Una imagen dañada o un PDF ilegible conserva el mensaje seguro actual y no expone detalles del sistema.
- Un error al borrar evidencia reemplazada no interrumpe la entrega, igual que en el comportamiento vigente.
- Las entregas antiguas sin metadatos completos continúan interpretándose mediante los valores predeterminados existentes.
- La cola, los modelos de visión y el cálculo de la nota quedan fuera de esta fase.

## Requisitos

### Requisitos funcionales

- **FR-001**: El sistema DEBE conservar sin cambios las rutas, respuestas, permisos y códigos de estado relacionados con evidencia.
- **FR-002**: El sistema DEBE mantener privadas las ubicaciones persistidas y exponer únicamente referencias autorizadas.
- **FR-003**: La visualización de imágenes y páginas PDF DEBE conservar límites, orientación, tamaño, caché y manejo de errores actuales.
- **FR-004**: La preparación de evidencia DEBE conservar orden, rotaciones, número de páginas, nombres originales y metadatos de modalidad.
- **FR-005**: El reemplazo de evidencia DEBE conservar la política actual de retiro del archivo anterior sin bloquear la entrega ante un fallo de limpieza.
- **FR-006**: Cada responsabilidad de transformación, presentación segura o limpieza de evidencia DEBE tener una única definición interna.
- **FR-007**: Los consumidores y pruebas internos existentes DEBEN conservar compatibilidad durante esta primera extracción.
- **FR-008**: La intervención NO DEBE cambiar colas, proveedores de IA, trabajos asíncronos, cálculo, ajuste ni publicación de calificaciones.
- **FR-009**: La intervención NO DEBE crear migraciones, modificar datos ni retirar endpoints.
- **FR-010**: El inventario técnico y la documentación viva DEBEN quedar sincronizados con el nuevo límite de responsabilidad.

### Entidades clave

- **Evidencia de entrega**: archivo autorizado que respalda una entrega, con tipo, páginas, orden, rotaciones y ubicación persistida privada.
- **Vista de evidencia**: representación segura de una imagen o página PDF que puede consultar un usuario autorizado.
- **Metadatos de evidencia**: información de modalidad, páginas y secciones que acompaña la calificación sin cambiar el contenido original.

## Criterios de éxito

- **SC-001**: El 100 % de las pruebas aplicables de evidencia, multihoja, modalidad mixta y persistencia continúa aprobado.
- **SC-002**: Cero rutas, permisos, códigos de estado o contratos públicos cambian durante la reorganización.
- **SC-003**: El 100 % de las responsabilidades de evidencia incluidas tiene una única definición y un propietario interno identificable.
- **SC-004**: Una comparación de resultados sobre imagen, PDF válido, página inválida y archivo dañado muestra el mismo resultado observable antes y después.
- **SC-005**: La reorganización introduce cero cambios de nota, estado de trabajo o selección de modelo de IA.

## Supuestos

- La primera extracción se limita a lectura, presentación segura, metadatos y limpieza de evidencia ya existentes.
- El despacho de solicitudes y la verificación de permisos permanecen donde están para reducir el alcance.
- La creación y publicación de trabajos de calificación se modularizará en una fase posterior independiente.
- Las pruebas actuales representan los contratos observables que deben preservarse.

# Especificación: cámara nativa en celular

**Rama**: `codex/127-camara-nativa-movil` | **Creada**: 2026-10-25 | **Estado**: Aprobada por el usuario el 2026-10-25 («aprove») | **Issue**: [#268](https://github.com/Andres-back/Calificator/issues/268)

## Escenarios de usuario y pruebas

### Historia 1 - Fotografiar la hoja con la cámara del teléfono (Prioridad: P1)

Como docente que califica desde un teléfono, quiero que «Tomar foto» abra la captura del dispositivo para encuadrar la hoja y comprobar su contenido sin usar el visor pequeño de la página.

**Razón de prioridad**: el docente reporta un encuadre incómodo y un caso en iPhone donde el visor aparece como una línea; este último síntoma todavía no se ha reproducido físicamente.

**Prueba independiente**: abrir una entrega sintética desde un teléfono, tomar y aceptar una foto, ampliar su contenido y tomar otra; ninguna se envía a calificar hasta la confirmación de envío.

**Aceptación**:
1. **Dado** un teléfono o tableta compatible y espacio para otra hoja, **cuando** se pulsa «Tomar foto», **entonces** se solicita la captura del dispositivo sin abrir primero el visor web reducido.
2. **Dado** que el dispositivo permite elegir cámara, **cuando** comienza la captura, **entonces** se prefiere la trasera para fotografiar la hoja, sin solicitar grabación de audio.
3. **Dado** que se acepta una foto, **cuando** se vuelve a la entrega, **entonces** se añade exactamente una hoja que puede ampliarse, repetirse y ordenarse antes de enviar.
4. **Dado** que se cancela o vuelve sin foto, **cuando** se regresa a la página, **entonces** se conservan las hojas y el contexto previos, sin envío, carga bloqueante permanente ni mensaje falso de éxito.

### Historia 2 - Conservar y reemplazar varias hojas sin confundir estudiantes (Prioridad: P1)

Como docente, quiero conservar las hojas tomadas y poder repetir solo la foto que quedó mal, aunque salga de la página para utilizar la cámara.

**Razón de prioridad**: la captura externa no debe perder evidencia preparada ni adjuntarla a otra entrega.

**Prueba independiente**: añadir dos hojas, repetir la primera y cancelar una segunda repetición; comprobar orden, contenido conservado y ausencia de envío. Probar también cambio de entrega mientras la captura está pendiente.

**Aceptación**:
1. **Dado** un paquete con dos hojas, **cuando** se repite la primera y se acepta una nueva foto, **entonces** solo se sustituye esa posición y se conserva la segunda.
2. **Dado** un intento pendiente, **cuando** cambia el estudiante/evaluación, se cierra la vista o se inicia un envío, **entonces** su resultado tardío no se incorpora, incluso si después se regresa al contexto original.
3. **Dado** que abrir la cámara oculta temporalmente la página, **cuando** se acepta una foto sin cambiar la entrega, **entonces** el retorno conserva ese intento válido.

### Historia 3 - Conservar la cámara y subida de archivos de computador (Prioridad: P2)

Como docente en computador, quiero seguir viendo su cámara y elegir otra conectada; tanto allí como en celular quiero conservar la acción separada para subir fotos o PDF.

**Prueba independiente**: usar dos cámaras sintéticas en un computador, incluyendo una ventana estrecha; después subir archivos sin abrir ninguna cámara.

**Aceptación**:
1. **Dado** un computador con dos cámaras, **cuando** se pulsa «Tomar foto», **entonces** se conserva la vista integrada con selección de cámara, revisión, repetición y aceptación.
2. **Dado** que no hay captura disponible o se necesita una foto guardada, **cuando** se elige «Subir fotos o PDF», **entonces** la alternativa permanece accesible y conserva las hojas preparadas.

### Casos límite

- iPhone, Android, iPad con presentación de escritorio, orientación horizontal y aplicación abierta desde el inicio del teléfono: no decidir el comportamiento solo por el ancho de pantalla.
- Computador táctil o con ventana estrecha: conservar su flujo de webcam; ofrecer alternativa explícita si la preferencia no coincide con el dispositivo.
- El navegador puede presentar su propia selección o no admitir captura nativa: no prometer una interfaz idéntica en todas las versiones; conservar subida y reintento comprensibles.
- Cancelación sin aviso del sistema: no interpretar el silencio como una foto nueva ni como permiso concedido; no depender de volver a abrir la cámara automáticamente.
- Captura anterior que termina tras cambiar de contexto, regresar al mismo contexto, desmontar la vista o iniciar envío: descartar sin escribir en la entrega vigente.
- Nombre repetido de archivo, dos fotos seguidas, reintento del mismo archivo y análisis de calidad pendiente: no duplicar ni perder hojas, manteniendo la protección existente contra duplicados reales.
- Formato que la aplicación no puede leer, imagen demasiado grande, límite de diez fotos, PDF seleccionado y carga deshabilitada: explicación recuperable sin borrar lo preparado ni eludir restricciones.
- Los límites por archivo/paquete y el permiso de PDF pueden ser diferentes al digitalizar y al calificar: conservar los valores propios de cada consumidor.

## Requisitos

### Requisitos funcionales

- **FR-001**: En teléfonos y tabletas compatibles, «Tomar foto», «Tomar otra foto», «Repetir foto» y «Reemplazar foto» DEBEN priorizar la captura del dispositivo, sin montar primero el visor web integrado.
- **FR-002**: La captura DEBE iniciarse únicamente por una acción explícita, preferir la cámara trasera y no solicitar audio ni abrirse automáticamente al cargar o volver a la página.
- **FR-003**: La foto aceptada DEBE ser revisable a tamaño ampliado antes de enviar; el docente DEBE poder repetirla o quitarla sin que se inicie una calificación automática.
- **FR-004**: Añadir y repetir DEBEN conservar el orden y las otras hojas; una aceptación DEBE añadir o sustituir una sola posición.
- **FR-005**: Cancelar, volver sin foto o no recibir resultado DEBE conservar la entrega y permitir continuar sin bloqueo permanente, envío o mensajes falsos de éxito.
- **FR-006**: Cada intento DEBE quedar ligado a la entrega vigente y quedar invalidado al cambiar de entrega, desmontar la vista o comenzar envío, incluso si se vuelve luego al mismo estudiante/evaluación.
- **FR-007**: Ocultarse temporalmente al abrir la cámara del sistema NO DEBE invalidar por sí solo una captura nativa vigente; la cámara integrada DEBE conservar su apagado al abandonar u ocultar la página.
- **FR-008**: En computador DEBE conservarse la cámara integrada con selector de cámaras, captura, revisión y cancelación; el tamaño reducido de ventana por sí solo NO DEBE convertirla en una selección de archivos.
- **FR-009**: «Subir fotos o PDF» DEBE permanecer separada; si el dispositivo no ofrece cámara o devuelve una imagen no admitida, DEBE conservarse una salida recuperable sin pérdida de hojas. No se DEBE inventar una causa de error que el sistema no comunique.
- **FR-010**: Capturas y archivos DEBEN conservar análisis de calidad, límites por consumidor, restricción de mezclar PDF/fotos, orden, rotación, deduplicación y envío explícito existentes; no se DEBEN convertir formatos silenciosamente ni aceptar contenido no admitido.
- **FR-011**: La interfaz de la página DEBE funcionar desde360px, en ambos temas y orientaciones, con controles esenciales de al menos44px, sin desbordamiento horizontal. El tamaño del encuadre de la cámara del sistema pertenece al dispositivo, no a un cuadro de la página.
- **FR-012**: El cambio DEBE conservar permisos y contratos de calificación, reemplazo, digitalización y entrega del estudiante; NO DEBE modificar notas, evidencias guardadas, modelos, proveedores, claves o datos académicos por abrir/cancelar la cámara.

### Entidades clave

- **Intento de captura**: acción provisional vinculada a una entrega y una apertura concretas; termina en aceptación, cancelación o invalidación, sin autoridad para enviar a calificar.
- **Hoja preparada**: imagen local aceptada y revisable que conserva posición, rotación y calidad; solo se persiste al ejecutar el envío existente y autorizado.
- **Entrega vigente**: combinación de usuario, evaluación, estudiante y modo que permite preparar las hojas; no comparte capturas pendientes con otra entrega.

## Criterios de éxito

- **SC-001**: En todos los perfiles móviles verificados, las cuatro acciones de captura solicitan la cámara del dispositivo sin mostrar primero el visor integrado; se registra por separado una prueba física de iPhone y otra de Android antes de afirmar compatibilidad física comprobada.
- **SC-002**: El100% de los casos de cancelación, retorno, cambio de entrega y resultado tardío conservan las hojas correctas, sin envío automático ni asignación cruzada.
- **SC-003**: Dos capturas consecutivas y la sustitución de una de ellas producen exactamente dos hojas en el orden esperado, conservando las validaciones actuales.
- **SC-004**: A360/390/768/1440px, ambos temas y dos orientaciones, las acciones de preparación/revisión quedan accesibles; las regresiones de computador con dos cámaras y subida alternativa siguen aprobadas.
- **SC-005**: Las pruebas de integración de los cuatro consumidores conservan permisos, límites y payloads; abrir/cancelar/revisar no emite una solicitud de calificación ni altera datos guardados.

## Supuestos

- Evoluciona Spec102 y Spec103, modificando la preferencia móvil y su ciclo de retorno, no sus permisos ni el selector de cámaras de PC. También conserva las reglas de documento completo de Spec113.
- El selector es compartido entre calificación, reemplazo de evidencia, digitalización y entrega del estudiante; el ajuste común tendrá regresiones de esos consumidores, sin ampliar su autoridad.
- La cámara nativa depende del sistema/navegador. Se mantiene alternativa de archivos; no se instala una aplicación nativa ni se afirma poder forzar una interfaz concreta en todas las versiones.
- Las pruebas automatizadas comprueban la solicitud de captura y el retorno de archivos sintéticos; no sustituyen una prueba de la cámara física, permisos o calidad de lente de un iPhone/Android.
- Fuera de alcance: recorte automático, mejora mediante IA, conversión de formatos nueva, cambios en backend/base de datos/modelos, recalificación real, extracción de figuras o despliegue manual.
- No se implementa antes de aprobar especificación/plan y revisar requisitos conforme a la constitución. Crear esta especificación no autoriza fusión o despliegue.

## Coordinación 131: evidencia docente revisable

Conserva captura nativa en teléfono y webcam/selector en PC. El editor revisable se abre después de recibir la foto; no reintroduce una cámara móvil en un recuadro pequeño. La prueba física sigue siendo un gate independiente. Contratos y validación se registran en [Spec131](../131-escaneo-evidencias/spec.md), [plan](../131-escaneo-evidencias/plan.md) y [tareas](../131-escaneo-evidencias/tasks.md), issue #276. Esta coordinación no certifica cierre, CI, teléfonos físicos ni activación productiva.

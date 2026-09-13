# Especificación: Encolado seguro de calificaciones

**Rama**: `codex/040-modularizar-cola-calificaciones` | **Creada**: 2026-09-12 | **Estado**: Implementada | **Issue**: #82

## Escenarios de usuario y pruebas

### Historia 1 - Enviar evidencia sin esperar la calificación (Prioridad: P1)

Como docente, necesito que una entrega quede registrada y en cola inmediatamente para seguir
trabajando mientras la calificación se procesa en segundo plano.

**Razón de prioridad**: La reducción del tiempo operativo docente depende de no bloquear la
navegación ni perder la evidencia mientras actúa la IA.

**Prueba independiente**: Enviar una entrega válida y comprobar que queda persistida con una
calificación pendiente y un trabajo consultable antes de ejecutar la evaluación automática.

**Aceptación**:
1. **Dado** un docente autorizado con una entrega válida, **cuando** solicita calificarla,
   **entonces** el sistema registra la evidencia, crea un único proceso pendiente y responde sin
   esperar el resultado de los modelos.
2. **Dado** un proceso pendiente, **cuando** el docente continúa navegando, **entonces** puede
   consultar el mismo estado de progreso y la evidencia permanece disponible.

### Historia 2 - Calificar varios estudiantes sin duplicados (Prioridad: P1)

Como docente, necesito enviar múltiples entregas consecutivas o en lote para que cada estudiante
sea procesado de forma independiente, incluso cuando varios docentes trabajan al mismo tiempo.

**Razón de prioridad**: La solución debe ahorrar tiempo en grupos reales y no solo al procesar una
entrega aislada.

**Prueba independiente**: Enviar 30 entregas válidas, incluyendo solicitudes concurrentes de al
menos tres docentes, y verificar una entrega, una calificación vigente y un proceso individual por
estudiante.

**Aceptación**:
1. **Dado** un lote de entregas válidas, **cuando** se confirma el envío, **entonces** cada entrega
   obtiene un proceso individual asociado a un único resumen del lote.
2. **Dado** que varios docentes envían entregas al mismo tiempo, **cuando** se registran los
   procesos, **entonces** cada docente solo puede consultar sus propios trabajos y no se mezclan
   estudiantes, evidencias ni calificaciones.
3. **Dado** que una entrega del lote falla posteriormente, **cuando** las demás terminan,
   **entonces** sus resultados se conservan y únicamente la entrega fallida queda disponible para
   recuperación.

### Historia 3 - Recuperar publicaciones fallidas de forma segura (Prioridad: P1)

Como docente, necesito que una interrupción temporal al enviar el trabajo a procesamiento no borre
la entrega ni produzca notas duplicadas cuando el sistema lo reintente.

**Razón de prioridad**: La evidencia educativa y la trazabilidad de la nota no pueden depender de
una conexión perfecta entre servicios.

**Prueba independiente**: Simular una interrupción durante la publicación, recuperar el mismo
proceso y entregar mensajes duplicados; comprobar que solo una ejecución modifica la calificación.

**Aceptación**:
1. **Dado** que la evidencia y el proceso ya fueron registrados, **cuando** falla su publicación,
   **entonces** el proceso queda marcado para reintento y la evidencia permanece segura.
2. **Dado** un proceso recuperable, **cuando** se republica, **entonces** se reutiliza su identidad
   y no se crean otra entrega, otra calificación ni otro proceso lógico.
3. **Dado** que dos mensajes intentan ejecutar el mismo proceso, **cuando** compiten por iniciarlo,
   **entonces** solo uno continúa y el otro termina sin volver a calificar.

### Casos límite

- La publicación puede confirmar tarde aunque el emisor haya recibido un error; la recuperación
  debe tratarla como potencialmente entregada y reutilizar el mismo proceso.
- Un lote puede fallar antes de completar su registro; no debe dejar procesos parciales ni archivos
  huérfanos.
- Un proceso pendiente puede quedar sin mensaje por una interrupción; debe poder recuperarse sin
  alterar procesos activos o terminados.
- Una calificación previa puede volver a ponerse en cola; debe conservar su identidad y reiniciar
  únicamente los campos transitorios establecidos por el flujo vigente.
- La misma entrega no puede ejecutarse simultáneamente por mensajes con identidades diferentes.

## Requisitos

### Requisitos funcionales

- **FR-001**: El sistema DEBE registrar la entrega, la calificación pendiente y la identidad del
  proceso antes de solicitar su ejecución en segundo plano.
- **FR-002**: El sistema DEBE responder al docente sin esperar la inferencia ni la nota final.
- **FR-003**: Cada entrega enviada DEBE mantener como máximo una calificación vigente asociada al
  proceso activo.
- **FR-004**: Un envío individual DEBE producir un proceso individual asociado a un resumen
  consultable por el docente propietario.
- **FR-005**: Un envío por lote DEBE producir un proceso individual por entrega y un único resumen
  que agregue sus estados sin impedir resultados parciales.
- **FR-006**: Una interrupción al solicitar la ejecución DEBE conservar evidencia y proceso, marcar
  la necesidad de reintento y evitar una nota final ficticia.
- **FR-007**: La recuperación DEBE reutilizar la identidad original y NO DEBE duplicar entregas,
  calificaciones, archivos ni procesos lógicos.
- **FR-008**: La reclamación concurrente del mismo proceso DEBE permitir una sola ejecución de la
  calificación.
- **FR-009**: Los trabajos DEBEN permanecer aislados por docente y conservar los permisos actuales
  de creación y consulta.
- **FR-010**: Los estados visibles, mensajes de progreso y mecanismos actuales de consulta DEBEN
  conservar su significado y sus transiciones.
- **FR-011**: Las rutas, respuestas públicas y códigos de resultado existentes DEBEN permanecer
  compatibles con los consumidores actuales.
- **FR-012**: La selección de proveedores y modelos, extracción visual, valoración, consolidación,
  publicación de notas y revisión humana NO DEBEN cambiar durante esta fase.
- **FR-013**: La fase NO DEBE requerir cambios de esquema, migraciones de datos ni modificaciones
  de la interfaz de profesor o estudiante.
- **FR-014**: Los envíos individuales, mixtos, en línea, por reemplazo y por lote que actualmente
  usan procesamiento diferido DEBEN conservar su comportamiento observable.

### Entidades clave

- **Entrega**: Evidencia o respuestas de un estudiante, asociadas a una evaluación y a una única
  calificación vigente.
- **Calificación pendiente**: Registro visible mientras se procesa la entrega; conserva la
  identidad usada durante reintentos y posterior revisión docente.
- **Proceso individual de calificación**: Unidad recuperable e idempotente que representa el
  procesamiento de una entrega.
- **Resumen de lote**: Agrupación consultable de procesos individuales y sus resultados parciales.

## Criterios de éxito

- **SC-001**: El 100 % de los envíos válidos devuelve un estado pendiente consultable sin esperar
  la nota producida por IA.
- **SC-002**: Una prueba con 30 entregas y al menos tres docentes concurrentes produce exactamente
  una entrega, una calificación vigente y un proceso individual por estudiante, sin cruces entre
  docentes.
- **SC-003**: En pruebas de publicación fallida, recuperación y entrega duplicada, el 100 % de los
  reintentos reutiliza el proceso original y no duplica datos ni notas.
- **SC-004**: Todos los flujos diferidos existentes conservan sus códigos de resultado, estados
  visibles, permisos y destinos públicos.
- **SC-005**: Una falla aislada en un lote no impide que las demás entregas finalicen ni obliga al
  docente a reenviar el lote completo.
- **SC-006**: Las pruebas de calificación, recuperación, simultaneidad y navegación existentes
  continúan aprobadas sin cambios funcionales.

## Supuestos

- Se conserva el mecanismo actual de procesamiento en segundo plano y su política de recuperación.
- La identidad persistida del proceso sigue siendo la fuente de verdad frente a mensajes repetidos
  o confirmaciones tardías.
- Esta fase reorganiza responsabilidades internas; no pretende acelerar modelos ni modificar la
  calidad o fórmula de la calificación.
- La extracción se hará de forma progresiva y mantendrá compatibilidad temporal para pruebas o
  consumidores internos existentes.

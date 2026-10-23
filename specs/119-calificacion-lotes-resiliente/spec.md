# Especificación: calificaciones en lote recuperables

**Rama**: `codex/119-calificacion-lotes-resiliente` | **Creada**: 2026-10-23 | **Estado**: Aprobada por el usuario el 2026-10-23 con tope de 60 segundos por llamada y recuperación de la etapa pendiente | **Issue**: #253

## Escenarios de usuario y pruebas

### Historia 1 - Enviar veinte entregas sin saturar el servicio (Prioridad: P1)

Como docente necesito enviar veinte recalificaciones seguidas, continuar trabajando y saber que esperan su turno sin perderse o competir todas por el servicio de evaluación.

**Razón de prioridad**: Se observaron cancelaciones por espera agotada en algunas entregas de una misma sesión. El número de entregas enviadas no demuestra por sí solo saturación; la cola debe controlar la carga de todas las rutas de valoración.

**Prueba independiente**: Veinte entregas de prueba terminan con resultados completos o una espera/revisión explícita, respetando el máximo de solicitudes simultáneas y sin duplicar registros.

**Aceptación**:
1. **Dadas** veinte entregas admitidas, **cuando** no hay capacidad libre, **entonces** esperan sin perder la evidencia ni consumir el tiempo reservado para una llamada aún no enviada.
2. **Dada** una respuesta que tarda más de 45 segundos pero llega dentro del límite configurado, **cuando** el servicio sigue disponible, **entonces** se conserva y no se reinicia innecesariamente todo el trabajo.

### Historia 2 - Recuperar solo lo que falló (Prioridad: P1)

Como docente necesito que un fallo temporal se recupere automáticamente de forma limitada y conserve el trabajo válido de lectura y valoración.

**Razón de prioridad**: Repetir la lectura y la valoración completas aumenta tiempo y coste; recuperar una valoración no sustituye su revisión independiente.

**Prueba independiente**: Simular un fallo temporal del calificador y otro del verificador; comprobar que se reutilizan solo etapas válidas compatibles con la misma evidencia y configuración y se ejecuta la segunda revisión pendiente.

**Aceptación**:
1. **Dada** una valoración válida y una verificación fallida, **cuando** se recupera, **entonces** se repite solo la verificación, sin volver a leer ni valorar la entrega completa.
2. **Dado** un calificador recuperado tras un fallo, **cuando** devuelve una valoración válida, **entonces** pasa por el verificador configurado antes de considerarse completa la revisión dual.
3. **Dado** un reinicio del trabajo, **cuando** existe progreso compatible, **entonces** se reutiliza sin reiniciar los contadores de intentos ni duplicar la nota vigente.

### Historia 3 - Distinguir una propuesta parcial de una revisión completa (Prioridad: P2)

Como docente necesito ver claramente si falta una comprobación, sin que una ejecución parcial aparezca como dos revisiones terminadas.

**Razón de prioridad**: El resultado válido de un único evaluador puede servir como borrador, no como comprobación dual ni aprobación docente.

**Prueba independiente**: Agotar la recuperación y comprobar el estado visible, su motivo, las etapas pendientes y la conservación de la evidencia y la decisión docente.

**Aceptación**:
1. **Dada** una sola valoración válida, **cuando** no termina la verificación, **entonces** se conserva como propuesta con verificación pendiente/revisión docente, nunca como revisión dual completa.
2. **Dado** un cambio docente mientras se evalúa, **cuando** llega una respuesta tardía o una recuperación, **entonces** no sobrescribe la decisión vigente ni su historial.

### Casos límite

- Servicio externo persistentemente caído, autenticación inválida, cuota agotada o respuesta rechazada: finalización explícita y recuperable, sin bucle infinito ni ceros ficticios.
- Evidencia, evaluación o configuración cambiadas: no reutilizar un resultado incompatible; conservar trazabilidad.
- Falta del mecanismo compartido de capacidad o pérdida de propiedad del trabajo: no permitir recuperación duplicada ni una ráfaga sin control; informar y reprogramar de manera limitada.
- Dos revisiones con el mismo modelo por decisión administrativa: no afirmar que son dos modelos distintos. Una recuperación de una etapa tampoco cuenta como una segunda revisión independiente.
- Hoja faltante o respuesta ilegible: seguir requiriendo revisión; la recuperación técnica no certifica exactitud pedagógica.

## Requisitos

### Requisitos funcionales

- **FR-001**: Toda solicitud de valoración/verificación, con formato configurable o heredado, DEBE respetar el límite compartido de solicitudes simultáneas; esperar capacidad no cuenta como tiempo de respuesta del proveedor.
- **FR-002**: La valoración, verificación y revisión adicional DEBEN tener un tope de 60 segundos por llamada, visible en administración y capturado en cada trabajo. Es una política específica de calificación, distinta de la espera de cola y de los límites compartidos del proveedor para otras funciones. No se impondrán demoras artificiales. El docente puede tardar más de 60 segundos en recibir el resultado total si hay cola, varias etapas o recuperación; no se promete un plazo total de 60 segundos.
- **FR-003**: Se DEBEN conservar las etapas válidas para reutilizarlas tras un fallo temporal o reinicio, comprobando identidad de entrega, evidencia, evaluación, rutas y propiedad del trabajo.
- **FR-004**: La recuperación automática DEBE repetir solo la etapa pendiente, con máximo de un intento adicional por etapa lógica para esa ejecución, incluyendo sus reinicios; no reintentar indiscriminadamente autenticación, rechazo o respuestas estructurales inválidas.
- **FR-005**: Toda valoración recuperada DEBE recibir la segunda revisión configurada para completar el flujo dual; la recuperación del calificador no sustituye al verificador.
- **FR-006**: Si no termina la verificación, el sistema DEBE conservar la propuesta y mostrar revisión pendiente con motivo claro, sin presentarla como comprobación dual completa ni publicarla automáticamente.
- **FR-007**: Se DEBEN conservar notas docentes, evidencia, permisos, versiones e historial; los fallos técnicos nunca se transforman en ceros. No se recalificarán registros reales automáticamente como parte del despliegue.
- **FR-008**: La observabilidad DEBE distinguir cola, espera del servicio (conexión, envío, lectura y plazo total), recuperación y revisión completa con códigos y conteos seguros, sin respuestas, identidades o claves en registros de diagnóstico. Un tiempo agotado no se describirá como caída demostrada del proveedor.
- **FR-009**: La reparación DEBE probarse con veinte entregas sintéticas, fallos transitorios y persistentes, concurrencia y reinicio; no añadirá llamadas al camino normal y mantendrá los modelos y presupuesto de salida actuales.

### Entidades clave

- **Entrega**: evidencia e identidad estable de la actividad, con una única calificación vigente.
- **Etapa de revisión**: lectura, valoración o verificación con resultado validado, ruta capturada, intentos y estado pendiente/completo.
- **Progreso recuperable**: resultados compatibles con evidencia y evaluación concretas; privado y limitado al trabajo autorizado.
- **Decisión docente**: nota, publicación y revisión humanas, con prioridad sobre respuestas tardías.

## Criterios de éxito

- **SC-001**: En veinte entregas sintéticas sin fallos externos, las veinte completan su revisión con el mismo número de llamadas por entrega que el camino normal y sin superar el máximo simultáneo.
- **SC-002**: Ante un fallo temporal de verificación, se repite únicamente esa etapa y la lectura/valoración válidas se ejecutan una sola vez.
- **SC-003**: Cero resultados de una única valoración presentados como revisión dual completa; cero notas docentes sobrescritas y cero evidencias perdidas o duplicadas.
- **SC-004**: Ninguna etapa lógica realiza más de dos intentos automáticos al simular reinicios; los fallos persistentes llegan a un estado comprensible y reintentable.
- **SC-005**: Con un servicio simulado de respuesta inmediata, el tiempo mediano del camino normal no aumenta más de 10 % respecto al mismo escenario de control, excluida su espera legítima de turno. No se promete igual latencia cuando el proveedor falla.

## Supuestos

- Son dos problemas distintos: el margen de salida de Spec 118 ya está desplegado; este hotfix atiende esperas de 45 segundos, admisión y recuperación de revisión dual.
- El usuario fijó el máximo en 60 segundos, en lugar de los 120 inicialmente propuestos. Se aplica exclusivamente a las llamadas de valoración, verificación y revisión adicional; lectura, generación y conversaciones conservan sus políticas. No modifica el timeout compartido de la conexión ni los modelos.
- No se cambian los modelos, credenciales, imágenes o embeddings. No se solicitan nuevas inferencias con entregas reales ni una prueba de carga pagada a proveedores.
- Prueba con veinte entregas sintéticas y proveedores simulados. Una eventual prueba real o cambio de configuración de producción requiere aprobación separada.
- No se puede garantizar disponibilidad absoluta de servicios externos; se exige recuperación acotada, estados honestos e integridad de datos.
- Auditoría de la sesión: 23 trabajos, máximo de cuatro trabajos solapados, tres tiempos agotados del principal y dos del verificador alrededor de 45 segundos. No demuestra saturación ni una caída externa. No se introducen nuevas inferencias reales.

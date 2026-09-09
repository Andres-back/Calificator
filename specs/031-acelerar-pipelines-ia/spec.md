# Especificación: Acelerar los procesos de IA

**Rama**: codex/031-acelerar-pipelines-ia | **Creada**: 2026-09-03 | **Estado**: Especificación aprobada | **Issue**: #64

## Clarifications

### Session 2026-09-03

- Q: ¿Qué capacidad y tiempo deben considerarse obligatorios? → A: Presentación estándar en menos de 120 segundos y cola confiable de 30 imágenes de estudiantes distintos; la prioridad es que todas puedan calificarse.
- Q: ¿Qué debe mostrarse desde que un estudiante entrega una foto y todavía no existe resultado? → A: Todos los estados visibles deben indicar que se está calificando y ninguna vista debe representar la ausencia de nota como `0.0`.

## Escenarios de usuario y pruebas

### Historia 1 - Recibir una calificación rápida y transparente (Prioridad: P1)

Como profesor quiero enviar una evidencia y continuar trabajando mientras se califica, para revisar en poco tiempo una nota explicada sin esperar frente a una pantalla bloqueada.

**Razón de prioridad**: La calificación es el flujo central y actualmente su mediana supera dos minutos, aunque la extracción visual más rápida tarda pocos segundos.

**Prueba independiente**: Enviar una evaluación de una hoja con respuestas legibles y verificar que entra en proceso inmediatamente, permite seguir navegando y produce una sola calificación con desglose completo.

**Aceptación**:
1. **Dado** un documento legible, **cuando** el profesor solicita calificación, **entonces** el trabajo queda guardado y muestra su primera etapa en menos de dos segundos.
2. **Dado** un trabajo en curso, **cuando** el profesor navega o inicia otra calificación, **entonces** el primero continúa sin perder evidencia ni duplicar notas.
3. **Dado** un resultado automático, **cuando** termina, **entonces** conserva nota por respuesta, criterios, explicación, confianza y decisión humana final.
4. **Dado** un proveedor lento o temporalmente indisponible, **cuando** el trabajo no puede avanzar, **entonces** permanece recuperable y muestra espera, reintento o error real; nunca desaparece silenciosamente.
5. **Dado** que el estudiante acaba de confirmar una foto o PDF, **cuando** la evidencia queda persistida y entra en cola, **entonces** estudiante y profesor ven “Calificando” aunque el procesador todavía no haya comenzado.
6. **Dado** que todavía no existe una nota sugerida o confirmada, **cuando** cualquier listado, tarjeta, boletín o detalle representa la entrega, **entonces** muestra el estado de procesamiento y nunca `0`, `0.0` ni una nota provisional.

### Historia 2 - Digitalizar sin esperas innecesarias (Prioridad: P1)

Como profesor quiero convertir una foto o PDF en evaluación con rapidez para poder revisarla y editarla sin esperar varios minutos.

**Razón de prioridad**: La digitalización observada tarda alrededor de tres minutos y comparte recursos con otros procesos largos.

**Prueba independiente**: Digitalizar una evaluación legible de una página y comprobar que preguntas, opciones, puntajes y respuestas esperadas llegan como un único borrador editable y sin llamadas redundantes.

**Aceptación**:
1. **Dado** un archivo válido, **cuando** comienza la digitalización, **entonces** la interfaz diferencia cola, lectura, estructuración y finalización.
2. **Dado** que la lectura visual ya produjo información completa, **cuando** se estructura el borrador, **entonces** no se vuelve a enviar innecesariamente la misma imagen.
3. **Dado** un PDF o evidencia multihoja, **cuando** se procesa, **entonces** se conserva orden, continuidad y cobertura sin calificar cada página como un trabajo separado.

### Historia 3 - Generar presentaciones sin rehacer trabajo válido (Prioridad: P1)

Como profesor quiero que una presentación se produzca en un tiempo razonable y que un defecto puntual no obligue a generar nuevamente todo el contenido.

**Razón de prioridad**: Una presentación reciente tardó más de seis minutos porque una diapositiva defectuosa provocó regeneración completa y una revisión completa adicional.

**Prueba independiente**: Generar ocho diapositivas con imágenes e introducir un borrador donde una sola diapositiva incumple; el sistema conserva las siete válidas, corrige la defectuosa y entrega PDF y PowerPoint coherentes.

**Aceptación**:
1. **Dado** un modelo configurado para texto, **cuando** genera una presentación, **entonces** devuelve únicamente la estructura y extensión necesarias.
2. **Dado** un defecto localizado, **cuando** se solicita corrección, **entonces** solo se regenera o repara la parte afectada.
3. **Dado** contenido que supera las comprobaciones de calidad y exactitud, **cuando** continúa el proceso, **entonces** no se ejecuta una revisión generativa redundante.
4. **Dado** contenido e imágenes listos, **cuando** se exporta, **entonces** PDF, PowerPoint y vista previa conservan la misma fuente canónica.

### Historia 4 - Configurar modelos adecuados para cada función (Prioridad: P1)

Como administrador o profesor con API propia quiero distinguir tareas de texto, visión e imagen y recibir orientación de rendimiento para no asignar accidentalmente un modelo lento o incompatible.

**Razón de prioridad**: Presentaciones y calificación de texto están usando actualmente un modelo de visión, mientras las métricas demuestran comportamientos muy diferentes según la tarea.

**Prueba independiente**: Configurar rutas diferentes para texto, lectura visual e imágenes; cada trabajo usa la selección correspondiente, registra el origen y advierte una combinación ineficiente sin ignorar una decisión explícita válida.

**Aceptación**:
1. **Dado** el catálogo de modelos, **cuando** se selecciona uno, **entonces** la interfaz muestra capacidades, recomendación y desempeño observado por función.
2. **Dado** un modelo compatible pero desaconsejado para una tarea, **cuando** se guarda, **entonces** se solicita confirmar la decisión y no se sustituye silenciosamente.
3. **Dado** un profesor con credencial y ruta propia, **cuando** ejecuta un trabajo, **entonces** se respeta su configuración y se mantiene la misma telemetría segura.

### Historia 5 - Atender varios profesores sin bloquear la calificación (Prioridad: P2)

Como institución quiero que al menos tres profesores puedan iniciar trabajos largos al mismo tiempo sin que una presentación retrase todas las calificaciones.

**Razón de prioridad**: Los procesos comparten actualmente dos ejecutores y una presentación puede ocupar uno durante varios minutos.

**Prueba independiente**: Iniciar simultáneamente calificación, digitalización y presentación desde tres profesores; los tres trabajos quedan visibles y la calificación no espera a que termine la presentación.

**Aceptación**:
1. **Dado** trabajo simultáneo de distintas funciones, **cuando** entra una calificación, **entonces** dispone de capacidad independiente o prioritaria.
2. **Dado** un reinicio controlado del procesador, **cuando** vuelve a estar disponible, **entonces** recupera los trabajos persistentes sin repetir resultados terminados.
3. **Dado** saturación temporal, **cuando** no hay capacidad inmediata, **entonces** el usuario ve que está en cola y conserva su posición lógica.

### Historia 6 - Calificar un grupo completo en una sola cola (Prioridad: P1)

Como profesor quiero preparar una cola de hasta 30 evidencias pertenecientes a estudiantes diferentes para iniciar la calificación del grupo y continuar trabajando sin cargar cada caso de forma bloqueante.

**Razón de prioridad**: El objetivo principal es facilitar la calificación real de un salón; una mejora de velocidad no sirve si el proceso pierde trabajos, detiene el lote o obliga al docente a esperar estudiante por estudiante.

**Prueba independiente**: Asociar 30 imágenes válidas a 30 estudiantes de una evaluación, confirmar el lote y comprobar que se crean 30 trabajos identificables, se procesan de manera independiente y producen como máximo una calificación por estudiante.

**Aceptación**:
1. **Dado** un conjunto de 30 imágenes y 30 estudiantes, **cuando** el profesor confirma la cola, **entonces** cada evidencia queda asociada al estudiante correcto antes de iniciar el procesamiento.
2. **Dado** un lote confirmado, **cuando** se procesa, **entonces** el profesor puede ver totales en cola, en proceso, terminados, con revisión y con error sin permanecer en la página.
3. **Dado** que una evidencia es ilegible o un trabajo encuentra un error, **cuando** los demás son válidos, **entonces** ese caso queda señalado individualmente y los otros 29 continúan.
4. **Dado** un error transitorio del proveedor, **cuando** puede recuperarse, **entonces** el trabajo afectado se reintenta sin volver a procesar los que ya terminaron.
5. **Dado** que el lote finaliza bajo disponibilidad normal del proveedor, **cuando** el profesor abre el resumen, **entonces** ninguna evidencia válida se perdió, duplicó o asignó al estudiante equivocado.

### Casos límite

- Una respuesta extensa válida no debe truncarse de forma que produzca JSON inválido o pierda preguntas.
- Un proveedor puede continuar procesando más allá de una demora normal; el sistema no debe abandonar el resultado sin registrar un estado recuperable.
- Un reintento por error transitorio no debe repetir una llamada que ya produjo un resultado aceptado.
- Una reparación parcial que cambie referencias entre diapositivas debe volver a validar únicamente las dependencias afectadas.
- La falta de imágenes generadas no debe impedir entregar contenido válido; debe mostrar sustitución o advertencia explícita.
- Las métricas con pocas muestras deben identificarse como insuficientes y no presentarse como una garantía.
- Las configuraciones personales no deben exponer claves en métricas, estados o errores.
- Una evaluación multihoja puede tardar más que una página; su progreso debe avanzar por etapas sin dividir la nota.
- Una imagen duplicada dentro del lote debe advertirse antes de confirmar y no producir dos notas accidentales para el mismo estudiante.
- Dos imágenes asignadas al mismo estudiante deben tratarse como evidencia multihoja de una entrega, no como estudiantes distintos.
- Cerrar o recargar el navegador después de confirmar 30 trabajos no debe cancelar la cola.

## Requisitos

### Requisitos funcionales

- **FR-001**: El sistema DEBE medir por trabajo el tiempo de cola, extracción, estructuración, evaluación, consolidación, imágenes y exportación según corresponda.
- **FR-002**: El sistema DEBE mostrar al usuario la etapa actual, tiempo transcurrido y estado terminal sin exigir permanecer en la vista.
- **FR-003**: Cada trabajo largo DEBE persistirse antes de enviarse al procesador y ser idempotente y recuperable.
- **FR-004**: Calificaciones, digitalizaciones y presentaciones NO DEBEN bloquear la navegación ni depender de una conexión continua del navegador.
- **FR-005**: La selección de modelos DEBE diferenciar como mínimo texto, visión, generación de imagen y vectores semánticos.
- **FR-006**: El catálogo DEBE impedir modelos incompatibles y advertir modelos compatibles pero ineficientes para la función seleccionada.
- **FR-007**: Una selección explícita y compatible del administrador o profesor NO DEBE sustituirse silenciosamente.
- **FR-008**: Cada resultado DEBE registrar proveedor, modelo, función, etapa, duración, estado, cantidad de entrada y salida disponible, reintento y uso de alternativa, sin secretos ni contenido educativo.
- **FR-009**: Los límites de salida configurados DEBEN aplicarse de forma equivalente a todos los contratos compatibles del mismo proveedor.
- **FR-010**: Los límites DEBEN dimensionarse según el resultado requerido y detectar terminación incompleta antes de aceptar la respuesta.
- **FR-011**: La generación de presentaciones DEBE solicitar contenido acotado a la cantidad de diapositivas y al esquema visible requerido.
- **FR-012**: Una presentación con defectos localizados DEBE conservar el contenido válido y corregir únicamente los elementos rechazados.
- **FR-013**: La revisión generativa completa DEBE ejecutarse solo cuando las comprobaciones deterministas detecten riesgo que no pueda resolverse localmente.
- **FR-014**: La exactitud matemática, estructura, cobertura y presencia de actividades DEBEN comprobarse antes de exportar, independientemente de la optimización.
- **FR-015**: El flujo de calificación DEBE conservar extracción visual, evaluación por respuesta, criterios, consolidación, confianza y revisión docente.
- **FR-016**: Las etapas independientes de una calificación DEBEN ejecutarse en paralelo cuando no exista dependencia entre ellas y consolidarse una sola vez.
- **FR-017**: La evidencia visual DEBE extraerse una sola vez por ejecución y reutilizarse en las etapas posteriores que no necesiten volver a ver la imagen.
- **FR-018**: Los trabajos de calificación DEBEN disponer de capacidad separada o prioridad suficiente para no quedar detrás de presentaciones largas.
- **FR-019**: El sistema DEBE admitir al menos tres profesores iniciando procesos largos simultáneamente y mostrar correctamente cola y progreso.
- **FR-020**: Los reintentos DEBEN limitarse a errores transitorios y reutilizar resultados parciales válidos.
- **FR-021**: Una demora del proveedor NO DEBE convertirse automáticamente en pérdida de solicitud; debe finalizar, reintentarse de forma segura o quedar en estado recuperable.
- **FR-022**: Toda optimización DEBE compararse contra casos de referencia de calificación, digitalización y presentación antes de activarse globalmente.
- **FR-023**: Las configuraciones institucionales y personales existentes DEBEN continuar funcionando sin exigir que el profesor vuelva a introducir su clave.
- **FR-024**: El panel administrativo DEBE mostrar desempeño agregado por función y no presentar comparaciones concluyentes cuando la muestra sea insuficiente.
- **FR-025**: El despliegue DEBE conservar trabajos creados antes de la actualización y permitir recuperar aquellos que estuvieran en cola o proceso.
- **FR-026**: El profesor DEBE poder preparar y confirmar una cola de al menos 30 paquetes de evidencia asociados a estudiantes diferentes de una evaluación.
- **FR-027**: La validación del lote DEBE confirmar estudiante, evaluación, archivos y ausencia de duplicados antes de iniciar cualquier calificación.
- **FR-028**: Cada elemento del lote DEBE tener ciclo de vida, reintentos y resultado independientes; un error individual NO DEBE detener los demás.
- **FR-029**: El resumen del lote DEBE mostrar cantidades en cola, proceso, finalizadas, pendientes de revisión y fallidas, además del estado individual.
- **FR-030**: Reabrir la vista o cambiar de dispositivo NO DEBE perder ni reiniciar los trabajos confirmados.
- **FR-031**: Cada paquete válido DEBE producir como máximo una entrega vigente, una calificación vigente y una posición lógica de cola.
- **FR-032**: El sistema DEBE poder recuperar fallos transitorios por elemento sin volver a ejecutar los resultados exitosos del mismo lote.
- **FR-033**: Al persistir una entrega que será calificada automáticamente, la entrega, su calificación provisional y todas las proyecciones visibles DEBEN representar de inmediato un estado de calificación en curso.
- **FR-034**: La ausencia de `nota_sugerida` y `nota_confirmada` NO DEBE convertirse a cero en respuestas, promedios, listados, detalles, boletines ni controles de confirmación.
- **FR-035**: Una nota cero DEBE mostrarse únicamente cuando haya sido calculada o establecida como resultado real y conservar su origen; nunca debe usarse como valor predeterminado de carga.

### Entidades clave

- **Trabajo de IA**: Unidad persistente con función, propietario, estado, etapa, progreso, tiempos, resultado y error recuperable.
- **Ejecución del pipeline**: Intento idempotente que relaciona todas las llamadas necesarias para producir un único resultado de negocio.
- **Etapa**: Segmento medible como extracción, evaluación, consolidación, reparación, imagen o exportación.
- **Ruta de modelo**: Selección efectiva de proveedor y modelo por capacidad, origen institucional o personal y alternativa permitida.
- **Presupuesto de salida**: Extensión máxima y forma esperada de una respuesta, ajustada a la función y validada antes de aceptarse.
- **Resultado parcial**: Contenido válido que puede reutilizarse después de un defecto localizado o error transitorio.
- **Métrica agregada**: Distribución anónima de tiempos, éxito y volumen por función, etapa, modelo y período.

## Criterios de éxito

- **SC-001**: Una calificación visual legible de una página alcanza una mediana inferior a 45 segundos y un percentil 95 inferior a 90 segundos bajo disponibilidad normal del proveedor.
- **SC-002**: Una digitalización legible de una página alcanza una mediana inferior a 60 segundos y un percentil 95 inferior a 120 segundos bajo disponibilidad normal del proveedor.
- **SC-003**: Al menos el 95 % de las presentaciones estándar de ocho diapositivas con imágenes termina en menos de 120 segundos bajo disponibilidad normal de proveedores.
- **SC-004**: Al menos el 95 % de trabajos muestra una etapa inicial en menos de dos segundos y conserva progreso hasta un estado terminal o recuperable.
- **SC-005**: Tres profesores pueden iniciar simultáneamente calificación, digitalización y presentación sin que la calificación espere a la finalización de la presentación.
- **SC-006**: El 100 % de las pruebas de referencia conserva nota final, desglose por respuesta, cobertura y necesidad de revisión dentro de las tolerancias aprobadas previamente.
- **SC-007**: Una diapositiva defectuosa no provoca regeneración de las diapositivas que ya cumplen todos los controles.
- **SC-008**: Cero reintentos, reinicios o despliegues de prueba producen entregas, calificaciones, presentaciones o archivos duplicados.
- **SC-009**: El 100 % de rutas de modelo activas coincide con la capacidad declarada o muestra una confirmación explícita de la excepción.
- **SC-010**: El administrador puede identificar en menos de un minuto qué etapa, proveedor o modelo explica una demora reciente sin acceder a contenido del estudiante.
- **SC-011**: Una prueba controlada con 30 imágenes válidas de 30 estudiantes acepta el lote completo y termina con 30 resultados independientes, cero pérdidas, cero duplicados y cero asignaciones incorrectas.
- **SC-012**: Un fallo aislado inducido dentro de una cola de 30 trabajos deja 29 trabajos avanzando normalmente y el caso afectado en un estado reintentable o de revisión claramente identificado.
- **SC-013**: En el 100 % de las vistas de estudiante y profesor incluidas en la prueba de regresión, una entrega recién enviada muestra “Calificando” y ninguna nota numérica hasta que exista un resultado real.

## Evolución 032: recuperación compatible implementada; metas reales pendientes de medición

[032 Calificación e impacto docente](../032-calificacion-impacto-docente/spec.md), FR-004–006 y FR-024–025: reintentos consistentes, reutilización compatible, identidad/estados grupales y separación de espera de capacidad. Mantiene metas de velocidad y configuraciones; no retira verificadores, no cambia modelos y no acredita benchmarks de proveedor sin una corrida real autorizada.

## Supuestos

- DeepSeek V4 Flash Vision Exp se conserva como referencia visual inicial porque las métricas actuales muestran el mejor tiempo exitoso en calificación por imagen.
- La generación de imágenes seguirá siendo una función independiente de la redacción de presentaciones.
- Los objetivos se evaluarán con documentos comparables y proveedores disponibles; las caídas externas se medirán separadamente.
- No se reducirán evaluadores, explicaciones ni controles de cobertura únicamente para cumplir una meta de tiempo.
- La primera capacidad institucional requerida es de tres profesores concurrentes; se medirá antes de ampliar el número.
- Cada posición de la cola grupal representa un paquete de evidencia de un estudiante; si contiene varias páginas, continúa siendo un solo trabajo y una sola calificación.
- La iniciativa no modifica notas ya publicadas ni reprocesa automáticamente evidencia histórica.

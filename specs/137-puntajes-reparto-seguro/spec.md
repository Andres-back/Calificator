# Especificación: reparto de puntos y actualización confirmada de notas

**Rama**: `codex/137-puntajes-reparto-seguro` | **Creada**:2026-10-30 | **Estado**: alcance y plan aprobados por el usuario el2026-10-30, incluido reparto por bloques | **Issue**: [292](https://github.com/Andres-back/Calificator/issues/292).

## Aclaraciones

### Sesión2026-10-30

- Q: ¿Conservar notas anteriores o permitir actualizarlas aparte? → A: Permitir actualizarlas con vista previa y confirmación, respetando ajustes manuales.
- Q: ¿Incluir rangos y secciones? → A: Sí; preguntas1–5 comparten2 puntos y6–9 comparten3. Cambiar un valor individual redistribuye solo dentro del bloque, sin mover los demás.
- El usuario aprobó corregir el bloqueo preservando versiones, reparto automático por tipo/valores fijados y actualización separada con historial; no autoriza cambios masivos en producción ni IA.

## Escenarios de usuario y pruebas

### Historia1 — Repartir sin sumar a mano (Prioridad:P1)

Como docente quiero asignar puntos por pregunta, tipo o bloque conservando el total de la evaluación. La cifra de un grupo es su total, no el valor de cada pregunta.

**Razón de prioridad**: un cambio de máximo no debe dejar un reparto inválido ni exigir ajustar todas las preguntas manualmente.

**Prueba independiente**: evaluación sintética de9 preguntas: siete ABCD y dos abiertas, máximo5.

**Aceptación**:
1. Abiertas comparten2,50 y ABCD comparten2,50: abiertas1,25 cada una y las demás comparten exactamente el resto, sin inflar el total por redondeo.
2. Rangos1–5 y6–9 reciben2 y3: sus valores iniciales son0,40 y0,75 por pregunta respectivamente.
3. Al fijar un valor individual, solo las preguntas no fijadas de su bloque reciben el remanente. Se puede liberar un valor fijado. Ningún punto puede ser negativo, cero o exceder el presupuesto.
4. Se pueden usar secciones existentes sin confundir preguntas con numeración repetida. Los rangos se eligen por posición y muestran las preguntas incluidas.
5. Grupos vacíos, superpuestos, incompletos o imposibles muestran una explicación antes de guardar; nunca corrigen silenciosamente la intención docente.

### Historia2 — Guardar sin perder el contenido anterior (Prioridad:P1)

Como docente quiero guardar un reparto incluso en evaluaciones antiguas con entregas, conservando los documentos, evidencias y puntajes anteriores.

**Razón de prioridad**: el conflicto reportado impide corregir los valores; retirar el bloqueo sin conservar contexto dañaría la trazabilidad.

**Prueba independiente**: evaluación antigua con documento, sin versión y con24 entregas sintéticas; evaluación ya versionada; otra con trabajos pendientes.

**Aceptación**:
1. Guardar solo el reparto conserva una referencia inmutable al estado anterior y crea la nueva versión. Las notas actuales no cambian por guardar máximos.
2. La referencia de un estado antiguo observado se identifica como tal, sin afirmar que reconstruye versiones desconocidas del pasado. No se asocia una entrega a otra evaluación.
3. Un cambio simultáneo, una calificación en curso o cambios de texto/soluciones no autorizados para este flujo conservan el borrador y exigen revisar; no se eluden los bloqueos de contenido.
4. El editor existente permite guardar cambios exclusivamente de puntos con las mismas protecciones, sin obligar a copiar o digitalizar de nuevo.

### Historia3 — Aplicar a notas anteriores solo después de confirmar (Prioridad:P1)

Como docente quiero ver la nota anterior y la propuesta antes de actualizar las calificaciones con el nuevo reparto, sin otra llamada a IA.

**Razón de prioridad**: cambiar máximos no equivale a aceptar una nueva nota; no deben desaparecer decisiones docentes.

**Prueba independiente**: notas completas, parciales, publicadas, pendientes, editadas manualmente, cambiadas en otra sesión y una repetición de la misma solicitud.

**Aceptación**:
1. El botón independiente muestra notas anteriores/propuestas y exclusiones; cancelar no cambia nada. Las fracciones logradas de cada respuesta determinan los nuevos puntos, no otra opinión de IA.
2. Las notas con decisiones manuales, componentes no puntuados o sin correspondencia inequívoca se conservan y explican; pendientes nunca se convierten en cero.
3. Confirmar actualiza exclusivamente la selección vigente y comprobada, crea historial y conserva evidencia, valoraciones originales y versiones de desglose. No publica notas que estaban pendientes ni reabre las publicadas por defecto.
4. Un fallo parcial informa qué cambió y qué se conservó. Repetir o recuperar la misma solicitud no duplica ajustes; cambiar su contenido requiere otra confirmación.
5. Una nueva recalificación de una entrega actualizada explícitamente usa el reparto confirmado, sin alterar sus imágenes, preguntas o soluciones; se conserva la referencia anterior en el historial.

### Casos límite

-1/9/100 preguntas; decimales con coma; bloques de tamaño distinto; último resto; todos los valores fijados; presupuesto menor que el mínimo representable.
- Secciones anidadas y numeración repetida: usar identidad inequívoca y rechazar solapamiento. Sin secciones se ofrecen tipos/rangos, sin inventarlas.
- Otros profesores y estudiantes no pueden leer o aplicar los cambios. Permisos revocados, cuenta cambiada y respuestas tardías no revelan datos ni aplican nuevas operaciones.
- Operaciones académicas en curso y versiones obsoletas: conservar datos y explicar cuándo reintentar. No repetir IA.
- Cambios de escala, texto, soluciones, rúbrica o evidencia están fuera del reparto; no usarlo para eludir el editor ni sus revisiones.

## Requisitos

### Requisitos funcionales

- **FR-001**: Ofrecer reparto por todas las preguntas, tipo, sección existente o bloques/rangos, con miembros visibles y sin duplicados u omisiones.
- **FR-002**: Mantener el máximo global y cada presupuesto exactamente; redistribuir solo remanentes no fijados y permitir liberar un valor fijado.
- **FR-003**: Mostrar cifras legibles sin ceros decimales innecesarios, aceptar coma decimal y explicar redondeos mínimos y repartos imposibles antes de guardar.
- **FR-004**: Guardar solo puntos conservando contenido y contexto anterior, incluidas evaluaciones antiguas; mantener conflictos auténticos y el borrador.
- **FR-005**: Mantener intactas las notas anteriores al guardar un reparto y separar su actualización mediante vista previa y confirmación.
- **FR-006**: Calcular la propuesta proporcionalmente al logro ya registrado de cada respuesta, sin llamadas a IA, conservando pendientes y ajustes docentes mediante exclusiones explícitas.
- **FR-007**: Aplicar únicamente calificaciones autorizadas y sin cambios simultáneos; conservar historial, evidencia, valoraciones y contexto de la recalificación posterior, sin publicación automática.
- **FR-008**: Permitir recuperación idempotente con resultados por estudiante y errores claros, sin duplicar cambios ni aceptar una selección distinta bajo la misma confirmación.
- **FR-009**: Mantener permisos docentes/administrativos y privacidad; otro profesor o estudiante no puede consultar ni modificar el reparto o sus notas.
- **FR-010**: Funcionar desde360px hasta escritorio, ambos temas, teclado y texto ampliado, con acciones, errores y confirmaciones accesibles.

### Entidades clave

- **Bloque de puntos**: identidad, título, preguntas incluidas, presupuesto y valores fijados. Su máximo es colectivo.
- **Versión del reparto**: referencia al contenido inmutable y reparto actual; distingue una referencia antigua observada de un original certificado.
- **Propuesta de actualización**: nota anterior/propuesta, versión comprobada y razón de exclusión si procede.
- **Confirmación recuperable**: selección exacta, versiones esperadas, responsable y resultados auditablemente vinculados.

## Criterios de éxito

- **SC-001**: Ambos ejemplos suman exactamente5; al cambiar una pregunta se conservan los presupuestos de todos los bloques y las preguntas fijadas. Casos imposibles no se guardan.
- **SC-002**: En la muestra antigua de24 entregas, guardar solo puntos modifica cero notas/evidencias, conserva una referencia anterior y no permite cambios concurrentes o de contenido por el flujo de reparto.
- **SC-003**: La actualización confirmada produce las notas previsualizadas únicamente en casos vigentes y sin decisiones manuales; repetir la solicitud crea cero versiones duplicadas. Ningún pendiente se transforma en cero ni se publica por esta operación.
- **SC-004**: Flujos completos en360/390/768/1440px y dos temas sin desbordamiento horizontal; accesos denegados a terceros y cero llamadas a IA en toda la validación.

## Supuestos

- Se cambia el máximo de cada pregunta, no la escala global, su contenido ni las respuestas. El reparto por sección130 sigue siendo compatible y no se aplica dos veces.
- Preservar ajustes manuales implica excluir la calificación completa si no puede trasladarse sin alterar una decisión docente; la exclusión queda visible para revisión individual.
- Se usan primero datos sintéticos locales. La consulta productiva autorizada fue únicamente agregada de la evaluación indicada:9 preguntas,24 entregas y ningún proceso activo al consultarla; no se ejecutó ningún cambio.
- Aprobar la implementación no autoriza fusión, despliegue, llamadas a IA, recalificación masiva ni actualización de notas productivas sin la confirmación funcional correspondiente.

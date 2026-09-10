# Especificación: Centro unificado de calificación

**Rama**: `codex/033-centro-calificacion` | **Creada**: 2026-09-09 | **Estado**: Especificación y plan aprobados por «adelante» el 2026-09-09; implementación en curso | **Issue**: [#68](https://github.com/Andres-back/Calificator/issues/68)

El docente necesita revisar un examen y encontrar inconsistencias sin reconstruir el contexto entre carga, revisión y boletín. Esta evolución concreta la navegación que 032 no consolidó. La especificación responsable de calificaciones continúa siendo 008 y la del desglose 016; 033 coordina su evolución, no crea otra fuente de notas.

## Escenarios de usuario y pruebas

### Historia 1 - Entrar una vez y continuar con el mismo examen (Prioridad: P1)

Como docente quiero abrir «Calificar y revisar» desde una evaluación, mis pendientes o la materia y conservar evaluación, estudiante y pregunta durante toda la sesión.

**Razón de prioridad**: Repetir selecciones y buscar pantallas aumenta el trabajo docente.

**Prueba independiente**: Entrar desde los tres accesos y un enlace antiguo, consultar el mismo alumno y regresar con el contexto conservado.

**Aceptación**:
1. Dada una evaluación seleccionada, al abrir «Calificar y revisar», se abre su centro con nombre, materia y grupo correctos, sin solicitar nuevamente la materia.
2. Dado un enlace de reclamo o resultado, al abrirlo, se selecciona el estudiante y, si está identificado, el componente relacionado; una referencia obsoleta se informa.
3. Dado un filtro y una selección, al recargar o usar atrás/adelante, se restaura el contexto válido. Los cambios sin guardar requieren guardar, descartar o permanecer antes de abandonar su contexto.
4. Dado un permiso de lectura sin modificación, se puede consultar el centro sin acciones de carga, ajuste o publicación; el estudiante mantiene exclusivamente sus resultados autorizados.

### Historia 2 - Revisar la respuesta junto a su evidencia (Prioridad: P1)

Como docente quiero ver la pregunta o criterio seleccionado, respuesta del estudiante, referencia, puntaje y motivo junto a la hoja correspondiente, y corregirlos en el mismo lugar.

**Razón de prioridad**: La explicación solo ayuda si se puede contrastar rápidamente con el examen.

**Prueba independiente**: Corregir dos preguntas de una entrega multihoja y continuar al siguiente alumno sin perder cambios ni publicar accidentalmente.

**Aceptación**:
1. Dado un alumno con desglose, al seleccionar una pregunta se muestra su contenido, referencia, razón del puntaje y mejora, con las páginas asociadas accesibles; si la asociación no existe, se indica y permite recorrer todas las hojas.
2. Dada una pregunta con edición, al guardar y seguir se confirma persistencia y fórmula antes de avanzar; un error o conflicto conserva el borrador y evita avanzar. Seguir pregunta y seguir estudiante son acciones distintas.
3. Dado el último alumno del filtro, al finalizar se muestra el número revisado y el número todavía pendiente; cambiar el filtro durante una actualización no salta alumnos silenciosamente.
4. Dado un celular, al alternar evidencia/revisión se conservan pregunta, edición, página y posición; con teclado virtual abierto se alcanzan guardar y cerrar.
5. Dada una entrega antigua sin desglose, se muestra la nota global y evidencia disponibles con aviso de detalle no disponible; nunca se inventan puntajes por pregunta.

### Historia 3 - Encontrar y atender inconsistencias (Prioridad: P1)

Como docente quiero una lista priorizada de lo que necesita revisión y un acceso directo a la pregunta, hoja o reclamo afectado.

**Razón de prioridad**: Ayuda a concentrar revisión humana en errores posibles sin presentar la sugerencia automática como verdad.

**Prueba independiente**: Examinar casos sintéticos con cobertura incompleta, lectura ilegible, discrepancia registrada, reclamo abierto y sin señal disponible.

**Aceptación**:
1. Dada una señal registrada, se muestra tipo, razón, origen, alcance y acción; un puntaje bajo o una respuesta incorrecta no se etiquetan automáticamente como error de la IA.
2. Dada una señal vinculada a pregunta, abrirla selecciona alumno, pregunta y hoja cuando exista; para un bloqueo global o reclamo sin pregunta se abre el detalle correspondiente sin adivinar una asociación.
3. Dada falta de información o de detalle cargado, se muestra «Sin información suficiente» o «Cargando revisión», nunca «Sin inconsistencias» por defecto.
4. Dada una corrección o resolución de PQRS, solo después del guardado se actualizan contadores y estado. Una señal histórica queda distinguible de un bloqueo vigente.
5. Dada coincidencia o confianza declarada por modelos, se presenta como señal informativa; no como exactitud comprobada. Los bloqueos vigentes del sistema siguen condicionando las decisiones permitidas.

### Historia 4 - Cargar, revisar y publicar sin salir (Prioridad: P1)

Como docente quiero incorporar evidencias de varios alumnos, consultar la cola y decidir las notas desde el mismo centro.

**Razón de prioridad**: La carga y la revisión pertenecen a una misma actividad docente.

**Prueba independiente**: Cargar dos trabajos de alumnos distintos, navegar mientras se procesan, revisar uno y publicar una selección autorizada.

**Aceptación**:
1. Dado el examen abierto, «Añadir entregas» muestra sus alumnos y permite asignar explícitamente cada paquete completo; jamás identifica al alumno solo por nombre del archivo.
2. Dada una carga confirmada, aparece el estado real por alumno y se puede seguir revisando; recargar recupera la cola. Error, espera o ausencia de nota no se presentan como cero.
3. Dado un alumno sin entrega, «Establecer nota» usa el flujo existente y solicita el motivo; solicitar reemplazo conserva las reglas de paquete completo.
4. Dadas sugerencias guardadas, confirmar y publicar son decisiones explícitas y diferentes. Una operación grupal muestra éxitos y fallos individuales sin repetir los éxitos al reintentar.
5. Dada necesidad de consultar notas del examen, el resumen dentro del centro permite hacerlo; el boletín general permanece como informe de la materia, sin exigir visitarlo para terminar la calificación.

### Casos límite

- Evaluación eliminada, materia ajena, permisos revocados, estudiante retirado y enlace con identificadores incompatibles: acceso denegado o referencia no disponible sin cargar contenido ajeno.
- Cero alumnos, ninguna entrega, filtros sin coincidencias y ausencia de preguntas: estados específicos con siguiente acción habilitada según permisos.
- Cambios simultáneos, cambio de pregunta/alumno/modo/filtro/ruta con borrador, desconexión y cierre: no descartar silenciosamente; no prometer guardar archivos elegidos tras recargar.
- Imagen/PDF de varias hojas, evidencia online sin archivo, asociación parcial y archivo no disponible: alternativa visible según contenido real.
- Actualizaciones de cola mientras se revisa: no mover automáticamente la selección ni alterar el texto escrito.
- Un cero confirmado sigue siendo cero; una nota pendiente sigue siendo pendiente.

## Requisitos

### Requisitos funcionales

- **FR-001**: Todos los accesos docentes de calificación DEBEN converger en un centro conservando el contexto conocido, con compatibilidad de enlaces previos.
- **FR-002**: El centro DEBE mantener materia, evaluación, alumno, pregunta, página y filtro; validar relaciones y proteger cambios pendientes durante toda transición.
- **FR-003**: La lista DEBE incluir alumnos sin entrega y distinguir cola, procesamiento, lista para revisar, atención necesaria, error, confirmada y publicada según datos persistidos.
- **FR-004**: Pregunta/criterio, respuesta, referencia, puntaje, explicación y evidencia DEBEN poder contrastarse en una misma mesa; no se exige recorrer todas las preguntas para editar una.
- **FR-005**: Guardar, seguir pregunta, seguir alumno, confirmar y publicar DEBEN ser distinguibles; el avance exige guardado exitoso cuando exista edición y los conflictos conservan el borrador.
- **FR-006**: El centro DEBE ofrecer filtros «Por revisar», «Con alertas», «Procesando», «Publicadas» y «Todas», con contadores de alcance explícito e información desconocida visible.
- **FR-007**: Las alertas DEBEN derivarse de información disponible y explicar causa, origen y alcance; no inferir errores por nota baja ni exactitud por confianza declarada.
- **FR-008**: Abrir una alerta DEBE enfocar su elemento verificable; corregir o resolver DEBE actualizarla tras persistencia y conservar trazabilidad histórica.
- **FR-009**: Añadir entregas, consultar cola, reintentar fallo, pedir reemplazo y establecer nota manual DEBEN estar disponibles en contexto según permisos y reglas existentes.
- **FR-010**: La carga DEBE conservar asociación explícita alumno-paquete, orden multihoja y límites existentes; recarga recupera trabajos confirmados sin duplicarlos.
- **FR-011**: Publicación individual/grupal DEBE mantener revisión humana, bloqueos vigentes y resultados parciales; abrir el centro no cambia una nota ni inicia inferencias.
- **FR-012**: Las pantallas DEBEN ser utilizables en las cinco resoluciones acordadas y ambos temas, con teclado, foco visible, controles principales de 44 px y desplazamiento accesible.
- **FR-013**: Datos y permisos de lectura, calificación, publicación y boletín DEBEN conservar autorización independiente en servidor y cliente; no ampliar privilegios por unificar vistas.
- **FR-014**: Notas históricas sin desglose, entregas online y evidencia física DEBEN tener una representación fiel con ausencia de datos explícita.
- **FR-015**: La transición DEBE reutilizar historial, fórmula, cola y medición existentes, retirar acciones redundantes y acreditar ausencia de consumidores antes de retirar pantallas antiguas.
- **FR-016**: La carga de la mesa DEBE consultar detalle únicamente según selección, sin descargar todas las evidencias ni efectuar una llamada por cada pregunta de cada alumno para construir el listado.

### Entidades clave

- **Contexto de revisión**: materia, evaluación, alumno, calificación, componente, página, modo y filtro actualmente seleccionados.
- **Fila de alumno**: alumno matriculado, entrega/calificación vigente y trabajo activo, con estado y resumen de atención.
- **Señal de revisión**: causa conocida, origen, alcance global o componente, páginas registradas, vigencia y posible acción docente.
- **Borrador de ajuste**: componente, cambios y versión de partida; pendiente hasta confirmación del guardado.
- **Paquete de evidencia**: archivos ordenados de un único alumno y evaluación; conserva las reglas de 007.

## Criterios de éxito

- **SC-001**: Desde una tarjeta de evaluación se accede a revisión en una acción y no se repite selección de materia/evaluación; todos los enlaces de la matriz de compatibilidad conservan contexto válido.
- **SC-002**: Abrir una alerta de pregunta permite contrastarla con su evidencia en máximo dos acciones; editar no exige desplazarse al final del examen.
- **SC-003**: Los casos de guardar/avanzar, conflicto, desconexión y cambio de contexto conservan todos los cambios o piden descarte explícito; cero publicaciones implícitas.
- **SC-004**: Cargar, seguir el procesamiento, revisar y publicar dos trabajos se completa dentro del centro; el ensayo sintético de 30 alumnos no pierde ni duplica entregas.
- **SC-005**: En 360×800, 390×844, 768×1024, 1366×768 y 1920×1080, claro/oscuro, no hay desbordamiento de página ni controles inaccesibles; evidencia y listas pueden desplazarse y el foco sigue el elemento abierto.
- **SC-006**: Toda alerta del conjunto controlado corresponde a una señal documentada; falta de datos, cero, respuesta incorrecta y error de procesamiento se distinguen sin falsos «todo correcto».
- **SC-007**: El flujo requiere cero cambios de pantalla para pasar de revisar a cargar otra entrega y regresar al mismo alumno; permisos y enlaces anteriores tienen regresión permitida/denegada documentada.
- **SC-008**: La lista de 30 alumnos aparece antes de cargar sus archivos; abrir un alumno no descarga evidencias de los otros 29. Las mediciones de tiempo humano siguen separadas de la espera automática.

## Supuestos

- «Centro» designa un espacio de trabajo con lista y detalle. Pendientes/alertas son filtros; carga y publicación son acciones contextuales, no cinco pantallas nuevas.
- En escritorio ancho se proponen lista, evidencia y pregunta. En pantallas intermedias se colapsa la lista; en móvil se alternan evidencia/revisión conservando estado.
- Se conserva el boletín completo para seguimiento transversal; creación/edición del examen permanece en Evaluaciones. Esas funciones no son pasos obligatorios para revisar una entrega.
- Alcance: diseño e implementación futura de experiencia docente y proyecciones mínimas de lectura si hacen falta. No cambia modelos, prompts, fórmula, permisos ni inicia piloto o llamadas de IA reales.
- Retirar código desconectado no supone retirar APIs de salón o lote que puedan tener otros consumidores.
- El usuario aprobó el diseño resultante con «adelante» el 2026-09-09. La implementación sigue rama, PR y CI; este registro no equivale a despliegue realizado.

## Aclaraciones

### Sesión 2026-09-09

- El usuario autorizó crear y diseñar 033 mediante «haslo» tras la propuesta de centro unificado. Las decisiones de presentación se concretan aquí para revisión; no se registra aprobación inexistente de implementación.
- No se necesitan preguntas adicionales para documentar el alcance: autorización, privacidad, estados, historia, dispositivos y compatibilidad se conservan de las especificaciones vigentes.
- Posteriormente el usuario aprobó el diseño y la implementación con «adelante». Las etiquetas spec-approved y plan-approved se registraron en #68.

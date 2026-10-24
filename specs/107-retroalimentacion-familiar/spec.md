# Especificación: retroalimentación familiar temporal y modelos por calidad

**Rama**: `codex/107-retroalimentacion-familiar` | **Creada**: 2026-10-20 | **Estado**: Alcance y plan aprobados por el usuario el 2026-10-20 mediante respuestas sucesivas «aprove» | **Issue**: [#223](https://github.com/Andres-back/Calificator/issues/223)

Evoluciona 008-calificaciones, 012-ia-jobs-produccion, 047-retroalimentacion-formativa y los permisos/contextos de Xali. No sustituye 101-digitalizacion-visual-completa ni autoriza mezclar sus cambios pendientes. Se conserva el flujo autenticado de profesor y estudiante.

**Solicitud**: usar modelos adecuados a velocidad y corrección, revisar la utilidad de la retroalimentación y ofrecer dos formatos complementarios: hoja completa con estudiante y retroalimentación, solo para que el docente imprima/recorte y entregue cada ficha por separado, y un enlace individual directo que permite leer y preguntar a Xali sin cuenta ni inicio de sesión. El docente controla la vigencia y puede desactivar/reactivar. La opción A elegida excluye compartir una hoja nominal completa con el grupo de familias.

**Separación aprobada el 2026-10-21**: el usuario confirmó «Sí, separar la comparación y mantener los modelos actuales». La validación experimental de 20 actividades y referencia docente (SC-001/003) continúa **pendiente, no realizada**, en [issue #236](https://github.com/Andres-back/Calificator/issues/236). No bloquea construir/entregar lista, fichas y enlaces de resultados ya revisados por su docente, pero sigue siendo obligatoria antes de recomendar/activar nuevos modelos o afirmar mejora académica demostrada. Esta entrega conserva defaults y revisión docente; no certifica la corrección semántica por pruebas sintéticas. FR-001/002/005 se conserva como restricción e interfaz de registro, no como experimento completado.

## Ajuste operativo aprobado: Xali rápido y ruta explícita (2026-10-21)

El usuario aprobó «adelante glm flash» tras comparar tres llamadas sintéticas: GLM-5.3-Flash 4,42 s, Qwen3.8-Flash 3,63 s y MiMo-V2.6-Flash 19,04 s. Es una muestra exploratoria, no una validación docente ni una garantía de latencia. La autorización permite elegir GLM en la ruta administrativa de **Xali de los enlaces**, con razonamiento bajo y respuesta breve. No autoriza cambiar modelos de extracción, calificación, verificación o refinamiento; la comparación académica del issue #236 permanece pendiente. Esta precisión exceptúa únicamente el asistente explicativo de las restricciones anteriores sobre activación de modelos, no la valoración de estudiantes.

Aclaración posterior del usuario, misma fecha: proveedor, modelo y respaldo deben poder elegirse desde el frontend administrativo de la nube, incluyendo texto de recursos. Se autoriza configurar esas rutas en OpenCode, conservando imágenes, digitalización y evaluadores como estaban. Hotfix de seguimiento: [#238](https://github.com/Andres-back/Calificator/issues/238). No se desactivan proveedores globales que tengan otros consumidores ni se fija GLM dentro del código.

- **FR-028**: El asistente de la devolución DEBE respetar exclusivamente su ruta principal y respaldo explícitamente administrados. No debe intentar otros proveedores institucionales por prioridad ni presentar una plantilla local como una respuesta de IA satisfactoria. Sin configuración utilizable o si falla, se conserva la lectura y se informa el fallo; no hay envío externo alternativo oculto.
- **FR-029**: Este flujo DEBE solicitar una respuesta breve con explicación pertinente, acción practicable y ejemplo nuevo coherente, sin alterar notas ni ampliar el contexto autorizado. El perfil compacto debe enviar al proveedor el esfuerzo bajo compatible con el modelo seleccionado, con presupuesto acotado y un solo intento de transporte por ruta explícita; no repite esa petición tras timeout, error HTTP o truncado. Un respaldo solo se permite si el administrador lo eligió expresamente; la configuración aprobada para el piloto no tiene respaldo.
- **FR-030**: La política anterior DEBE ser opt-in para no cambiar la cascada, controles ni modelos de otras funciones. Proveedor y modelo continúan administrables; no se fija un modelo dentro de la lógica de negocio. La entrega requiere regresiones de aislamiento, errores y conservación de contexto, PR/CI y comprobación operativa sin afirmar calidad académica demostrada.
- **FR-031**: El frontend administrativo DEBE exponer la ruta real del asistente de devolución y conservar la edición existente del texto general/por herramienta. Estas rutas textuales DEBEN ejecutar solo la selección principal y respaldo explícitos del administrador; cambiar modelo/proveedor posteriormente no requiere editar código. Imágenes, embeddings, digitalización y evaluadores conservan sus rutas y comportamiento; no se presentan recomendaciones de la nota como un nuevo cálculo ni se modifican recursos guardados.

Aceptación: principal OpenCode con respaldo nulo → una única petición OpenCode; error/truncado/configuración no disponible → ninguna petición a OpenAI/Groq/Ollama ni plantilla exitosa. GLM en perfil compacto → `reasoning_effort=low` real y sin `thinking=disabled`. Un consumidor sin ese perfil conserva su comportamiento anterior.

## Clarifications

### Session 2026-10-20

- Q: ¿Se prefiere una entrada común con código familiar o enlaces privados por familia? → A: No son alternativas excluyentes: el usuario quiere una hoja donde aparezcan estudiantes y su retroalimentación para imprimir/recortar o enviar a un grupo, y enlaces individuales por estudiante con asistente para preguntar sobre la evaluación y retroalimentación sin ingresar a la plataforma. Esto elimina la cuenta y el inicio de sesión para el destinatario; no equivale a autorizar automáticamente la exposición de datos de todos a todas las familias.
- Q: ¿Cómo se manejará la visibilidad de la hoja completa frente a las familias? → A: El usuario eligió «a»: hoja completa únicamente para el docente, que puede imprimir, recortar y entregar devoluciones separadas; cada familia recibe únicamente el enlace individual correspondiente. No se ofrece hoja nominal pública o compartida con todo el grupo. Esta respuesta resuelve la audiencia que seguía abierta en la aclaración anterior.
- Q: ¿Qué intervalo y destinatario debe conservar el acceso a Xali? → A: El usuario exige como máximo cinco preguntas cada diez minutos mientras el profesor mantenga activo el enlace, y confirma que el acceso es por estudiante, no por familia ni por coincidencia de apellidos. Se concreta como ventana móvil de 600 segundos por estudiante/evaluación, compartida entre sus enlaces y dispositivos; renovar o reactivar no reinicia el consumo aún vigente.

## Escenarios de usuario y pruebas

### Historia 1 - Calificar y devolver una explicación coherente (Prioridad: P1)

El profesor necesita rapidez sin perder corrección. La nota debe derivarse de las preguntas valoradas, y la retroalimentación debe describir lo que el estudiante realmente hizo y cómo mejorar.

**Razón de prioridad**: Cambiar de modelo solo por velocidad puede introducir descuentos injustificados o totales que no coinciden con sus propios puntos. No se debe compartir una felicitación o explicación incompatible con el resultado autorizado.

**Prueba independiente**: Contrastar configuraciones por etapa con un conjunto de referencia previamente corregido y probar discrepancias de puntajes, mensajes genéricos, falta de evidencia y fallos del proveedor sin alterar notas históricas.

**Aceptación**:
1. **Dado** un resultado global distinto de la suma por preguntas, **cuando** se consolida, **entonces** se conserva la salida original como trazabilidad, se aplica el cálculo verificable y se comunica cualquier inconsistencia pendiente; no se confirma automáticamente un resultado incompleto.
2. **Dado** una respuesta breve que cumple lo solicitado, **cuando** se revisa, **entonces** no se descuentan puntos por no repetir el sujeto, ampliar la oración o añadir detalles no exigidos; ortografía solo puntúa si el instrumento lo establece.
3. **Dado** componentes correctos e incorrectos, **cuando** se propone retroalimentación, **entonces** reconoce un logro observado, identifica el error pertinente y propone una acción concreta sin inventar evidencia ni afirmar perfección.
4. **Dado** evidencia ilegible, ausente o desacuerdo material, **cuando** termina el procesamiento, **entonces** se pide revisión docente; no se presenta un cero ni una devolución definitiva como sustituto de la lectura.
5. **Dado** un candidato a modelo, **cuando** se evalúa su activación, **entonces** se comparan por separado tiempos, corrección por pregunta, coherencia del total, errores de retroalimentación y carga de revisión docente con la referencia vigente.

### Historia 2 - Compartir un resultado durante tres días (Prioridad: P1)

Desde la calificación o la lista de notas, el docente selecciona los resultados que ya revisó, elige «Compartir con estudiante o familia», comprueba una vista previa de lo visible y entrega un acceso temporal por el medio que prefiera.

**Razón de prioridad**: Una familia puede consultar desde un celular prestado sin disponer de computador ni tener que recorrer el panel del profesor.

**Prueba independiente**: Crear un acceso a un resultado autorizado, abrirlo sin una cuenta docente y comprobar el alcance antes, durante y después de su vigencia.

**Aceptación**:
1. **Dado** una nota confirmada y una retroalimentación que el docente autoriza compartir, **cuando** crea el acceso, **entonces** ve una vista previa, los destinatarios y el vencimiento; compartir no vuelve a calificar ni cambia la nota.
2. **Dado** el plazo predeterminado, **cuando** se activa a una fecha/hora, **entonces** vence exactamente 72 horas después y la fecha se muestra en lenguaje comprensible para el profesor y la familia.
3. **Dado** una nota sugerida o con revisión material pendiente, **cuando** se intenta compartir, **entonces** se explica qué falta; el enlace no publica ese borrador ni evita los controles docentes.
4. **Dado** una selección con resultados autorizados y pendientes, **cuando** se preparan accesos en lote, **entonces** se muestran incluidos/excluidos y sus razones, sin declarar éxito de todos ni alterar los pendientes.
5. **Dado** un acceso válido, **cuando** se abre, **entonces** se muestran primero estudiante, actividad, nota y explicación; después la retroalimentación y las preguntas a Xali. La evidencia propia solo se ofrece si el docente la habilitó.

### Historia 3 - Hoja grupal imprimible y enlaces individuales sin cuenta (Prioridad: P1)

El docente selecciona estudiantes de una evaluación y prepara una hoja con nombre y retroalimentación, disponible solo para él. Puede imprimirla para recortar y entregar cada ficha por separado. También puede generar un enlace individual por estudiante; el padre o niño lo abre directamente y pregunta a Xali, sin registro, contraseña de alumno ni navegación por el panel. La hoja completa no se publica ni se envía al grupo de familias.

**Razón de prioridad**: La devolución debe servir en papel o desde un celular con pocos pasos. Compartir la hoja completa con familias, a diferencia de recortarla, permitiría leer recomendaciones ajenas; no debe activarse por confusión con un acceso individual.

**Prueba independiente**: Preparar una hoja de tres estudiantes, comprobar su impresión sin pérdida de texto y abrir dos enlaces individuales desde navegadores sin sesión. Intentar consultar otro estudiante y comprobar su rechazo.

**Aceptación**:
1. **Dado** varios resultados autorizados, **cuando** el docente prepara la hoja, **entonces** aparecen el nombre de cada estudiante y su retroalimentación completa en fichas distinguibles, con vista previa y marcas de corte, sin obligar a generar una evaluación o documento independiente por alumno.
2. **Dado** la hoja completa, **cuando** se imprime, **entonces** el docente puede entregar cada recorte sin información de otros estudiantes; un texto largo no se trunca ni se reduce hasta volverlo ilegible.
3. **Dado** un enlace individual vigente, **cuando** un padre o niño lo abre sin sesión, **entonces** ve directamente el resultado autorizado y puede preguntar a Xali, sin crear cuenta ni introducir la contraseña de la plataforma.
4. **Dado** un enlace individual, **cuando** se cambia una referencia o se pregunta por otro alumno, **entonces** no aparecen nombres, resultados, documentos o conversaciones ajenas.
5. **Dado** una hoja con varios estudiantes, **cuando** alguien sin permiso docente intenta abrirla o compartirla como enlace familiar, **entonces** no obtiene la lista completa ni las recomendaciones de otros; la entrega familiar solo permite fichas o enlaces individuales.
6. **Dado** varios hijos o materias, **cuando** se abre el enlace de un estudiante, **entonces** no se agrupan hermanos automáticamente ni se permite buscar alumnos de otros docentes; los enlaces individuales se entregan por separado a sus destinatarios.

### Historia 4 - Preguntar a Xali desde el acceso temporal (Prioridad: P1)

El estudiante o su acudiente pregunta «¿Por qué esta nota?», «¿Qué debe mejorar?» o «¿Cómo podemos practicar?» desde el enlace individual, sin registrarse ni iniciar sesión en la plataforma. Xali no se ofrece como un chat colectivo que permita consultar alumnos de una hoja grupal.

**Razón de prioridad**: La retroalimentación debe poder convertirse en orientación comprensible y útil aun cuando la familia solo tenga un celular.

**Prueba independiente**: Preguntar sobre una pregunta concreta, una nota modificada, otro estudiante, un solucionario no autorizado y un acceso revocado mientras se espera respuesta.

**Aceptación**:
1. **Dado** un acceso vigente a una calificación revisada, **cuando** se pregunta por un puntaje, **entonces** Xali usa únicamente el desglose, criterios, evidencia permitida y retroalimentación autorizada de ese estudiante/actividad; no inventa razones ni atribuye decisiones al docente sin registro.
2. **Dado** una pregunta de apoyo, **cuando** responde, **entonces** usa lenguaje apropiado al grado y distingue explicación de la nota, orientación para el adulto y práctica nueva; no cambia notas ni registra una reclamación en nombre del alumno.
3. **Dado** una petición de datos ajenos, instrucciones internas o soluciones no liberadas, **cuando** se responde, **entonces** se mantiene el límite de acceso y se ofrece orientación permitida.
4. **Dado** un error, lentitud o límite de uso de Xali, **cuando** no puede responder, **entonces** siguen disponibles la nota y retroalimentación autorizadas mientras el acceso sea válido; se explica el fallo sin bloquear la lectura ni inventar una respuesta.
5. **Dado** un acceso que vence o se desactiva durante la consulta, **cuando** se intenta entregar la respuesta, **entonces** no se entrega información después del vencimiento/revocación y se comunica el cierre.
6. **Dado** cinco preguntas nuevas aceptadas durante los últimos diez minutos para un estudiante/evaluación, **cuando** llega una sexta, **entonces** no se consulta al modelo y se indica cuánto falta para volver a preguntar; la nota y la retroalimentación siguen legibles mientras el enlace sea válido.
7. **Dado** varios dispositivos, pestañas o enlaces del mismo estudiante/evaluación, **cuando** se pregunta simultáneamente o se renueva/reactiva un enlace, **entonces** todos comparten el límite de cinco preguntas en la ventana móvil; un reintento de la misma petición cuenta una sola vez. Al vencimiento prevalece el cierre del acceso, aunque quede cupo.

### Historia 5 - Controlar, reactivar y revisar el acceso desde el celular (Prioridad: P1)

El profesor encuentra qué accesos están activos, cuándo vencen y qué comparten. Puede detenerlos o abrir una nueva vigencia sin borrar las evidencias ni generar otra calificación.

**Razón de prioridad**: La pérdida de control de un enlace debe poder resolverse con una acción clara, sin pedir soporte o manipular datos académicos.

**Prueba independiente**: Cambiar estados de un acceso y probarlo en otra pestaña, con una conversación abierta y desde un celular con teclado visible.

**Aceptación**:
1. **Dado** un acceso activo, **cuando** se desactiva, **entonces** la siguiente consulta, imagen o pregunta queda bloqueada aunque se hubiera abierto antes; las notas/evidencias conservan su historial.
2. **Dado** un acceso vencido o desactivado, **cuando** se reactiva, **entonces** el docente elige una nueva vigencia y confirma su alcance; el reloj anterior no se prolonga automáticamente y no se incluyen notas nuevas.
3. **Dado** una sospecha de que se compartió indebidamente, **cuando** el docente renueva la credencial de acceso, **entonces** la anterior deja de funcionar; esta acción se distingue de reactivar.
4. **Dado** un cambio posterior de nota o retroalimentación, **cuando** existe una publicación temporal previa, **entonces** esa publicación se suspende hasta que el docente autorice expresamente la nueva revisión; no mezcla una explicación antigua con otra nota.
5. **Dado** un celular de 360 o 390 px, **cuando** la familia lee y escribe, **entonces** no aparecen paneles del profesor, no se tapa la conversación con el teclado y las acciones permanecen comprensibles y accesibles.

### Casos límite

- Vencimiento exacto, reloj del dispositivo incorrecto, varias pestañas y reactivación mientras otra solicitud sigue abierta: la vigencia real prevalece sobre el estado mostrado previamente.
- El docente pierde acceso a una materia, se retira un destinatario o cambia la relación con la entrega: no persiste un acceso huérfano por conservar un enlace antiguo.
- Una familia tiene varios hijos: cada enlace individual conserva estudiante y actividad; no se mezclan conversaciones, nombres, notas, archivos o criterios.
- Dos familias comparten celular: salir del acceso individual o abrir otro no mezcla notas ni conversaciones de la familia anterior.
- Estudiantes con apellidos iguales no comparten acceso, conversaciones ni cupo; la identidad académica del estudiante/evaluación es la referencia, no su nombre, apellido, parentesco supuesto o dirección de conexión.
- Seis preguntas simultáneas, recarga, cambio de dispositivo o renovación/reactivación no permiten superar cinco preguntas aceptadas en los últimos 600 segundos. El cupo se libera al salir cada pregunta de esa ventana, no al cambiar el minuto del reloj; reintentar una misma petición no la contabiliza ni procesa dos veces.
- Enlace incorrecto, intentos repetidos, referencia adivinada o enlace reenviado: respuesta mínima y límites de intentos/uso. Sin cuenta, quien obtenga el enlace individual podrá usarlo mientras esté activo; se advierte al docente y se ofrece revocación/renovación.
- Imagen sin lectura segura, datos incompletos, feedback vacío o contradictorio: no inventar información para poder compartir.
- Nota histórica confirmada por el docente sin desglose automático: conservarla y mostrar solo la explicación disponible, sin reconstruir puntajes ni inventar una justificación por pregunta. La autorización temporal no exige recalificarla.
- Un enlace válido a una nota no concede permiso para ver el documento original de digitalización del profesor, solucionarios ocultos, notas internas, otros alumnos o credenciales de cuentas.
- Un enlace revocado no borra información que alguien ya vio, copió o fotografió; no se promete recuperar capturas externas. Se bloquean las nuevas consultas.
- La impresión es para entrega por el docente; expirar un enlace no retira papel ni archivos que ya se entregaron. Una hoja general no incluirá enlaces individuales utilizables por cualquiera: enviarlos juntos al grupo eliminaría su aislamiento por destinatario.
- Proveedor no disponible, consumo excesivo o respuesta de Xali tardía: la lectura válida sigue separada de la conversación; reintentar no duplica accesos ni altera resultados.
- Acciones por lote con fallos parciales o repetidas por mala conectividad: confirmar qué accesos se prepararon y cuáles faltan, sin mostrar un éxito falso.

## Requisitos

### Requisitos funcionales

- **FR-001**: La selección de modelos DEBE ser administrable por etapa y conservar la configuración usada en cada nueva calificación, sin reescribir ni volver a procesar registros existentes. DeepSeek principal/Luna segundo revisor es una candidatura, no una sustitución global ya validada.
- **FR-002**: Antes de activar una configuración nueva por defecto, DEBEN compararse corrección por pregunta, coherencia de nota, incidencias de retroalimentación, tiempo por etapa y tiempo de revisión docente con la referencia vigente; una mejora de velocidad no compensa un error académico grave.
- **FR-003**: En nuevas valoraciones con desglose, la nota calculada DEBE provenir de los puntos autorizados por pregunta, pesos, ajustes docentes explícitos y redondeo vigentes; una nota global sugerida, confianza alta o acuerdo verbal del verificador no pueden sustituir ese cálculo ni cubrir componentes pendientes. Las decisiones docentes históricas sin desglose se conservan y no se reconstruyen para compartirlas.
- **FR-004**: La retroalimentación DEBE poder revisarse y editarse por el docente; distinguir aciertos observados, dificultad concreta y siguiente acción pertinente. No DEBE inventar errores, felicitar por perfección inexistente ni presentar incertidumbre de lectura como fallo del alumno.
- **FR-005**: La calidad DEBE revisarse con las cinco dimensiones vigentes —corrección, especificidad, claridad, utilidad y adecuación—, conservando versión y evaluador; una incidencia grave se registra aparte y no se oculta en el promedio.

Precisión de FR-004 autorizada por el usuario el 2026-10-20: «podemos hacer otra llamada a la ia de open code si es necesario». Se permite una revisión textual adicional selectiva cuando hay señales de devolución genérica o falta de explicación/acción, no una nueva calificación ni una llamada obligatoria en cada entrega. El resultado sigue siendo borrador sujeto a revisión docente; conservar texto original y notas, fallo seguro y límites de tiempo/gasto. Esto no autoriza activarla en producción, sustituir la referencia humana de FR-005 ni dar por satisfecho el corpus de FR-002.

- **FR-006**: El docente autorizado DEBE poder preparar acceso a uno o varios resultados seleccionados y previsualizar exactamente qué información compartirá. Solo resultados confirmados y autorizados para esa publicación temporal pueden quedar visibles; las sugerencias pendientes permanecen privadas.
- **FR-007**: Crear un acceso NO DEBE recalificar, modificar una nota, publicar automáticamente el libro de notas, crear usuarios familiares ni cambiar permisos generales. El docente controla selección, vigencia y autorización del mensaje.
- **FR-008**: Cada acceso DEBE tener una duración finita, de 72 horas por defecto, con fecha/hora de vencimiento visible. El alcance aprobado permite seleccionar de 1 a 30 días y nunca habilita vigencia indefinida.
- **FR-009**: El docente DEBE poder desactivar, reactivar con nueva vigencia y renovar la credencial. No DEBE reactivarse solo ni volver a habilitar credenciales reemplazadas. Reactivar conserva exclusivamente el alcance que el docente vuelve a confirmar.
- **FR-010**: La vigencia y el permiso DEBEN comprobarse en cada nueva consulta, evidencia y conversación, incluida la entrega de una respuesta tardía. Un acceso expirado, revocado o fuera de alcance no puede reutilizar una sesión anterior para seguir consultando.
- **FR-011**: La hoja completa nominal DEBE estar disponible exclusivamente al docente autorizado para imprimir/recortar y entregar fichas por separado. NO DEBE tener publicación familiar colectiva, enlace público ni acceso de grupo. No se ofrece búsqueda pública por nombre/documento ni acceso inferido por apellido/grado.
- **FR-012**: El enlace individual DEBE limitarse a la identidad académica del estudiante y evaluación/resultado seleccionados, sin inferir parentesco ni incorporar hermanos, otras materias o nuevos resultados automáticamente. Coincidir en uno o ambos apellidos no vincula estudiantes ni autoriza acceso. Si un adulto recibe varios enlaces, cada estudiante conserva contexto y conversación separados; no se crea una agrupación familiar.
- **FR-013**: El acceso temporal DEBE ser distinto de la cuenta docente/estudiantil y no revelar contraseñas de esas cuentas; las credenciales no deben ser previsibles ni aparecer en registros, analítica, vistas previas externas o enlaces públicos de buscadores.
- **FR-014**: Se DEBEN ofrecer hoja completa imprimible/recortable solo para el docente y enlace individual directo con Xali, sin registro ni inicio de sesión para el destinatario. Según la opción A elegida, cada familia recibe únicamente su recorte o enlace individual; queda excluida la hoja nominal compartida con todas las familias.
- **FR-015**: La vista del enlace individual del estudiante DEBE priorizar estudiante, actividad, nota y explicación, retroalimentación y acceso a Xali. La evidencia propia será opcional y deshabilitada por defecto; no incluye originales de digitalización docente ni solucionarios no liberados.
- **FR-016**: Xali DEBE responder exclusivamente a partir del resultado y contexto autorizado de la revisión compartida, reconocer información faltante, explicar sin humillar y ofrecer una acción o práctica nueva pertinente. No cambia notas, confirma evaluaciones, atribuye decisiones sin respaldo ni revela datos ajenos o instrucciones internas.
- **FR-017**: La vista y Xali DEBEN respetar las reglas existentes de soluciones liberadas, separación de roles y acceso postentrega. Tener un enlace no equivale a permiso de docente, matrícula general ni identidad verificada de acudiente.
- **FR-018**: Una edición de nota, desglose o retroalimentación posterior DEBE suspender la publicación temporal afectada hasta que el docente vuelva a autorizarla; se conserva la revisión que se compartió para auditoría, sin mostrar versiones mezcladas.
- **FR-019**: Lectura y conversación DEBEN quedar separadas: una caída o límite del agente no impide leer el resultado autorizado durante su vigencia; errores y reintentos no inventan respuestas ni duplican operaciones.
- **FR-020**: Xali desde enlaces temporales DEBE admitir como máximo cinco preguntas nuevas aceptadas por estudiante/evaluación en cualquier ventana móvil de 600 segundos, solo mientras el acceso esté activo y vigente. El cupo se comparte entre pestañas, dispositivos y enlaces del mismo estudiante/evaluación; renovar, reactivar o sustituir la credencial no reinicia el consumo dentro de esa ventana. El límite no se agrupa por familia, apellido, clase o dirección de conexión. Deben conservarse además controles independientes contra intentos de acceso abusivos y consumo global, sin relajar los controles de los flujos autenticados existentes.
- **FR-021**: Crear, suspender, reactivar, renovar, autorizar una nueva revisión y retirar destinatarios DEBE dejar trazabilidad de emisor, alcance, revisión y fecha; sin registrar credenciales privadas ni divulgar preguntas familiares a alumnos ajenos.
- **FR-022**: El docente DEBE poder ver resultados del lote, estados activo/vencido/desactivado/suspendido y causas de fallo. Solo ofrece el acceso mediante copiar/compartir elegido por el docente; no envía mensajes, correos o notificaciones externos automáticamente.
- **FR-023**: La experiencia DEBE funcionar desde 360 px hasta escritorio, en ambos temas y con teclado; usar textos comprensibles, controles táctiles de al menos 44×44 px y sin paneles del rol profesor en la consulta familiar.
- **FR-024**: El cambio DEBE preservar notas, evidencias, publicaciones, cuentas y conversaciones ya existentes. Crear/expirar un acceso no borra registros académicos; nuevas funciones pueden deshabilitarse sin impedir el uso del flujo vigente.
- **FR-025**: La hoja docente DEBE conservar íntegros nombre y retroalimentación por estudiante, admitir una selección o todos los resultados elegibles, ofrecer vista previa e impresión en papel Carta/A4 y permitir recortar devoluciones sin mezclar alumnos. Si una ficha extensa necesita continuación, debe identificarla claramente, sin truncar ni encoger excesivamente el texto. No se ofrece una versión colectiva para familias ni se distribuyen notas/evidencias de terceros.
- **FR-026**: Los enlaces individuales DEBEN poder prepararse en lote, pero entregarse de forma separada al destinatario elegido por el profesor. No se publicará una lista colectiva de enlaces que dé acceso a Xali, notas o evidencias de todos los alumnos. El enlace directo es una credencial: no equivale a verificar identidad ni impide un reenvío.
- **FR-027**: El control de preguntas DEBE impedir exceder el cupo incluso con solicitudes simultáneas y contar cada petición aceptada una sola vez, incluidos sus reintentos automáticos. Abrir/leer el resultado y los envíos rechazados por cupo o acceso inválido no consumen preguntas. Una pregunta aceptada conserva su contabilización aunque falle el proveedor; un error no habilita consumo ilimitado ni ejecuciones duplicadas. Al alcanzar el límite se DEBE indicar en lenguaje sencillo el tiempo restante hasta liberar cupo, sin invocar al modelo para solicitudes bloqueadas ni impedir la lectura aún autorizada; al expirar/desactivar se bloquean lectura y conversación, aunque sobre cupo.

### Entidades clave

Precisión de entrega aprobada el 2026-10-23, issue #255 y [Spec120](../120-retroalimentacion-entrega-clara/spec.md): FR-003/004/006/018 distinguen nota oficial de autorización de la devolución. Un docente puede autorizar explícitamente un resumen revisado (nota y mensaje) conservando privados los avisos originales y omitiendo todo desglose incompleto o no validado, también del contexto de Xali. Esto no publica automáticamente preguntas pendientes ni altera la nota. La revisión queda ligada a la fuente vigente e invalidada por sus cambios. Se conserva la vía coherente previa y las reglas de acceso, privacidad y cuota; SC-002/003 no se interpretan como impedimento para compartir un resumen humano que no certifica el desglose. La validación pedagógica independiente sigue pendiente en #236.

- **Configuración de valoración**: selección por etapa, versión, evidencia de evaluación y estado de habilitación; no equivale al nombre de un único modelo para toda la aplicación.
- **Revisión compartible de resultado**: nota y desglose autorizados, retroalimentación revisada, reglas de evidencia/soluciones y fecha de la decisión docente.
- **Acceso temporal**: emisor, estudiante/evaluación y resultado permitidos, vigencia, estado y revisión autorizada; no representa una familia ni contiene una contraseña de cuenta.
- **Hoja y ficha de devolución**: selección autorizada de una evaluación, nombre y retroalimentación por estudiante, orden de impresión y continuidad; la hoja completa docente y el acceso individual tienen audiencias distintas.
- **Conversación temporal**: preguntas y respuestas ligadas al acceso, estudiante, evaluación y revisión; su existencia no amplía permisos ni evita el vencimiento.
- **Cupo de preguntas**: peticiones nuevas aceptadas y sus instantes por estudiante/evaluación, compartidas entre sus enlaces durante los últimos 600 segundos; no depende de apellidos, dispositivo o renovación de credencial.
- **Registro de control y calidad**: cambios del acceso y evaluaciones de corrección, especificidad, claridad, utilidad y adecuación, con incidencias importantes separadas del promedio.

## Criterios de éxito

- **SC-001**: En un corpus previo a la activación, de al menos 20 actividades variadas con corrección docente independiente, se informa el resultado de ambas configuraciones sin omisiones: errores por pregunta, notas globales incoherentes, incidencias graves de feedback, tiempo de procesamiento y tiempo de revisión. No se activa por defecto un candidato con errores graves no resueltos ni menor concordancia que la referencia vigente; cualquier limitación o desacuerdo queda visible.
- **SC-002**: El 100 % de casos de prueba de total discrepante, respuesta breve válida, escritura ilegible, componente faltante y felicitación contradictoria conserva los datos originales y bloquea la confirmación/publicación automática insegura.
- **SC-003**: En los resultados autorizados del conjunto de validación, un revisor docente asigna al menos 4/5 en cada una de las cinco dimensiones del feedback y registra cero errores académicos graves sin resolver antes de permitir compartir. Esto es una puerta de validación, no un resultado ya obtenido.
- **SC-004**: Desde una nota elegible, el docente prepara un acceso individual en un máximo de cuatro acciones principales —compartir, revisar alcance, confirmar vigencia y copiar—; el destinatario entra directamente con el enlace y sin registro, inicio de sesión o contraseña de la plataforma.
- **SC-005**: El 100 % de intentos probados antes/después del vencimiento exacto, desactivación, renovación, retiro de alumno, cambio de permiso y manipulación de identidad respeta el alcance; una petición iniciada antes del cierre tampoco entrega información después de ese cierre.
- **SC-006**: El 100 % de pruebas de dos familias/dos hijos/dos dispositivos compartidos evita cruces de resultados/conversaciones y soluciones no autorizadas mediante enlaces individuales; la hoja completa requiere permiso docente y no divulga colectivamente accesos, notas ni evidencias a las familias.
- **SC-007**: Consulta y gestión verificados en 360/390/1440 px, dos motores y ambos temas; sin desbordamiento horizontal, botones tapados ni editor inutilizable al reducir el espacio por teclado. La emulación no se presenta como prueba física de iPhone/Android.
- **SC-008**: Crear/reactivar/reintentar/expirar accesos y cambiar la configuración de futuros trabajos produce cero modificaciones en notas, evidencias o cuentas previamente guardadas en las pruebas de regresión; fallos de Xali no impiden leer un resultado todavía autorizado.
- **SC-009**: Una muestra de 30 estudiantes, con mensajes breves y otros de hasta 1500 caracteres, se previsualiza e imprime en Carta y A4 con el 100 % del texto conservado, identificación clara y recortes sin datos ajenos; cada continuación se identifica y la hoja completa no se ofrece para consulta familiar colectiva.
- **SC-010**: En pruebas con tiempo controlado, las primeras cinco preguntas nuevas válidas se aceptan y la sexta se rechaza sin llamada al modelo hasta que salga una pregunta de la ventana móvil de 600 segundos. El 100 % de pruebas de concurrencia, reintentos, varios dispositivos, renovación/reactivación y apellidos coincidentes conserva el cupo por estudiante/evaluación sin cruces ni duplicados. El tiempo de espera mostrado coincide con la liberación real; lectura permitida durante la espera y bloqueo tras vencimiento/desactivación se comprueban por separado.

## Supuestos

- El teléfono necesita conexión a Internet para abrir el resultado y preguntar; no se instala una aplicación ni se exige computador. No se promete un tutor sin conexión.
- Duración inicial aprobada: tres días exactos; selección acotada entre 1 y 30 días. Expirar oculta nuevas consultas, no destruye el registro académico ni puede retirar capturas que alguien hizo fuera de la aplicación.
- El profesor identifica y autoriza los destinatarios; el sistema no conoce relaciones familiares verificadas y no las deduce de apellidos, documentos, grado o cuentas previas. No se crea un rol general de padre ni cuenta nueva; para abrir el enlace individual no se solicita inicio de sesión. Quien lo reciba podría reenviarlo, por lo que se advierte esa limitación y se ofrecen expiración, revocación y renovación.
- Cada enlace individual corresponde a un estudiante/resultado, aunque un padre reciba varios para sus hijos; no da acceso automático a notas de otros profesores ni a todas las materias del estudiante.
- La restricción solicitada es cinco preguntas en los últimos diez minutos por estudiante/evaluación, no cinco por familiar o dispositivo. El reloj y el cupo efectivos los determina el sistema; renovar/reactivar no los reinicia artificialmente. Se registra como requisito a verificar e implementar, no como comportamiento actual ya comprobado. No se cambian los límites de otros flujos sin revisar su compatibilidad en el plan.
- La opción A resuelve la visibilidad: hoja completa solo para el docente e impresión recortable; devoluciones a familias mediante recortes o enlaces individuales. No se implementa una lista nominal compartida con el grupo ni un portal de selección pública de alumnos.
- Cada publicación temporal conserva la revisión autorizada. Si esa revisión cambia, se suspende antes de mostrar información nueva; el profesor decide si vuelve a autorizarla.
- La configuración propuesta es mantener el principal actual y validar Luna como segundo revisor, no utilizar Luna para todo. La única hoja comparada y tres variantes de verificación no demuestran calidad general. El corpus docente de validación aún no se considera disponible ni aprobado.
- Se reutilizan las dimensiones de calidad existentes y el contexto postentrega de Xali; no se usa el tutor público como atajo para resolver evaluaciones activas, recuperar claves internas o cambiar notas.
- La hoja recortable se coordina con el issue #206 y la propuesta 098 pendiente: reutilizar su capacidad si ya está disponible o acordar su incorporación mínima antes de implementar, sin modificar ni absorber trabajo ajeno no fusionado. La solicitud de impresión queda dentro del alcance funcional, no se da por terminada.
- Fuera de alcance: envío automático por WhatsApp/correo, reclamación formal familiar, modificación de notas por el chat, búsqueda pública de alumnos, generación de acceso permanente, reconocimiento automático de parentesco, borrado de datos históricos e inferencias pagadas con nuevos datos reales sin autorización.
- La constitución exige aprobar especificación y plan antes de implementar. Ambos recibieron aprobación humana el 2026-10-20, registrada en #223. Continúan los controles de Checklist, Tasks y Analyze antes de implementar. No se autoriza por ello fusión, activación de modelos o despliegue; no hay hooks de extensión configurados. Plantilla activa resuelta desde el override de proyecto.
- Spec122 (#257) amplía la entrega: aceptación/publicación académica y autorización del mensaje mediante una decisión global explícita, conservación de ajustes y copia autenticada repetible de enlaces nuevos. No hay publicación automática, listas públicas del grupo ni renovación al copiar. Las credenciales históricas que solo tienen hash no se reconstruyen ni reemplazan sin confirmación.

# Especificación: retroalimentación unificada y conversación recuperable

**Rama**: `codex/126-retroalimentacion-unificada-chat` | **Creada**: 2026-10-24 | **Estado**: Aprobada por el usuario el 2026-10-24, incluida revisión de requisitos y decoración del chat | **Issue**: [#266](https://github.com/Andres-back/Calificator/issues/266)

Extiende las funciones de entrega de Spec107, Spec120 y Spec122: no crea otro sistema de enlaces ni otra autoridad de calificación. Solicitud: unificar la retroalimentación individual y del grupo, recuperar el chat al volver al enlace y presentar explicaciones legibles en celular y computador. Las capturas ilustran problemas de presentación; el enlace privado aportado no se incorpora a documentos, pruebas ni registros.

## Escenarios de usuario y pruebas

### Historia 1 - Una misma retroalimentación desde cualquier acceso (Prioridad: P1)

El profesor revisa y prepara la misma devolución desde la pestaña de un estudiante o desde la opción del grupo. Encuentra el mismo mensaje, estado y acciones; no debe aprender dos formularios ni preguntarse cuál llegará al destinatario.

**Razón de prioridad**: La duplicidad visual oculta que editar una propuesta, confirmar una nota y autorizar su entrega son decisiones diferentes.

**Prueba independiente**: Con una evaluación sintética y tres estudiantes, entrar por ambas rutas, corregir un mensaje y comprobar la misma revisión visible; imprimir y copiar enlaces sin modificar notas ni evidencias.

**Aceptación**:
1. **Dada** una devolución, **cuando** se abre desde el estudiante o el grupo, **entonces** se usa la misma interfaz de revisión y entrega, con el mismo texto vigente, estado y alcance.
2. **Dada** una selección previa, **cuando** se abre la retroalimentación del grupo, **entonces** se conserva esa selección y se identifican los incluidos; sin selección se presenta el grupo sin publicar ni seleccionar silenciosamente a todos.
3. **Dado** un texto en edición, **cuando** se cambia de estudiante o se cierra, **entonces** se puede guardar o descartar expresamente; no se pierde sin aviso ni se publica por navegar.
4. **Dada** una nota confirmada y una devolución autorizada, **cuando** se copia o imprime, **entonces** se entrega exactamente esa revisión, con las reglas de vigencia, evidencia y privacidad existentes.
5. **Dado** un lote mixto, **cuando** el profesor elige aceptar/publicar o entregar, **entonces** ve el alcance exacto y los fallos parciales; no se eliminan avisos históricos ni se aprueban resultados sin la decisión docente vigente.

### Historia 2 - Volver al enlace sin perder la conversación (Prioridad: P1)

El estudiante o acudiente vuelve a un enlace vigente desde el mismo navegador y recupera sus preguntas y respuestas, incluidas las que estaban pendientes, sin reenviarlas ni consumir otra pregunta.

**Razón de prioridad**: Cerrar una pestaña no debe borrar la orientación ni inducir a repetir consultas pagadas.

**Prueba independiente**: Enviar preguntas sintéticas, salir, volver y contrastar el contenido, orden y cupo. Repetir con otro navegador, otro enlace y un acceso desactivado.

**Aceptación**:
1. **Dada** una conversación nueva, **cuando** se recarga o reabre en el mismo navegador mientras el acceso siga vigente, **entonces** se recuperan sus mensajes disponibles, ordenados y sin duplicados.
2. **Dada** una pregunta aceptada aún pendiente, **cuando** se reabre, **entonces** se recupera su estado sin volver a pedir una respuesta ni consumir cupo adicional.
3. **Dado** otro navegador con el mismo enlace, **cuando** lo abre, **entonces** no ve conversaciones del primer navegador; compartir un enlace no comparte sus preguntas privadas.
4. **Dado** un enlace vencido, desactivado, renovado o una revisión sustituida, **cuando** se consulta su conversación anterior, **entonces** no se obtiene contenido por conservar una pantalla o identidad anterior.
5. **Dado** un navegador que no puede recordar la conversación, **cuando** se usa el chat, **entonces** sigue funcionando durante esa visita y explica de forma discreta que no podrá recuperarla después.

### Historia 3 - Entender la explicación sin símbolos de formato (Prioridad: P1)

El lector distingue la explicación, un paso concreto y un ejemplo cuando la respuesta los contiene. No ve asteriscos de formato ni un bloque de texto excesivo; tampoco se inventan secciones o contenido académico para decorar.

**Razón de prioridad**: Una respuesta útil pierde claridad si se muestra su marcado en lugar de su presentación.

**Prueba independiente**: Presentar respuestas sintéticas con énfasis, listas, tablas, fórmulas, párrafos, texto sin estructura y contenido externo no permitido, en ambos temas y tamaños de pantalla.

**Aceptación**:
1. **Dada** una respuesta con énfasis y listas válidos, **cuando** se lee, **entonces** se muestran como énfasis y listas, no como caracteres de marcado; también se trata el ejemplo habitual de espacios interiores en el énfasis.
2. **Dada** una respuesta con pasos y ejemplo identificables, **cuando** se presenta, **entonces** esas partes son fáciles de distinguir sin duplicar frases ni alterar su sentido.
3. **Dado** contenido antiguo o sin estructura, **cuando** se abre, **entonces** se conserva íntegro y legible, sin inventar logros, soluciones, recursos o afirmaciones de calidad.
4. **Dado** contenido externo o instrucciones incrustadas en una respuesta, **cuando** se presenta, **entonces** no ejecuta instrucciones, carga rastreadores ni revela datos del enlace.

### Casos límite

- Cero confirmado frente a nota ausente; mensaje provisional, vacío o desactualizado; docente sin permiso; edición simultánea y cambios sin guardar.
- Lote de treinta estudiantes, mensaje docente de 6.000 caracteres y respuesta de chat de hasta 8.000 caracteres; continuaciones de impresión sin recortes ni mezcla de alumnos.
- Dos pestañas del mismo navegador, dos navegadores con el mismo enlace, dos enlaces en el mismo navegador y perfil de navegador compartido por varias personas.
- Pregunta aceptada cuya confirmación HTTP se pierde, respuesta que llega durante la recuperación, caída de red y cierre del acceso durante una lectura o respuesta.
- Historial anterior sin identidad del lector, textos ya purgados, metadatos locales corruptos/borrados o navegación privada: no se atribuyen conversaciones antiguas al nuevo visitante.
- Intentos de recuperar mensajes de otro ámbito o reutilizar una petición; sexta pregunta en diez minutos desde distintos dispositivos; recarga, renovación y reactivación sin reiniciar el cupo.
- Tablas anchas, fórmulas, cadenas largas, marcado incompleto, enlaces e imágenes externas y HTML; teclado móvil abierto, zoom, lector de pantalla y tema oscuro.

## Requisitos

### Requisitos funcionales

- **FR-001**: Ambas entradas docentes DEBEN usar una única experiencia de retroalimentación con modos individual y grupo, el mismo mensaje vigente, estado y acciones de entrega. No se mantiene un segundo editor independiente para el mismo mensaje compartido.
- **FR-002**: La interfaz DEBE distinguir propuesta original, edición docente y devolución autorizada. La original permanece disponible en el historial; la vista de entrega y el enlace muestran la revisión autorizada, no una mezcla de versiones.
- **FR-003**: El docente DEBE poder editar y guardar el mensaje sin recalificar ni cambiar la nota. Guardar, confirmar/publicar y autorizar entrega siguen siendo decisiones explícitas, con conservación de ajustes, permisos y controles de concurrencia existentes.
- **FR-004**: La gestión común DEBE conservar selección individual/grupal, búsqueda, impresión, motivos existentes, copia individual y conjunta de enlaces, autorización en lote y controles de vigencia, evidencia y revocación. Abrirla no ejecuta esas acciones.
- **FR-005**: Cambiar de estudiante, cerrar o cambiar de evaluación DEBE proteger las ediciones no guardadas y limpiar los datos del contexto anterior. El éxito parcial debe identificar incluidos, pendientes y acciones recuperables.
- **FR-006**: Las conversaciones nuevas DEBEN recuperarse al regresar desde el mismo navegador al mismo acceso y revisión vigentes, con todas las páginas de mensajes aún conservados y estados pendientes recuperables, sin duplicados.
- **FR-007**: El historial DEBE estar separado entre navegadores, estudiantes, accesos y revisiones. No debe asociar retrospectivamente preguntas sin una identidad de conversación demostrable ni prometer recuperación desde otro dispositivo.
- **FR-008**: Cada lectura, recuperación y respuesta DEBE comprobar el permiso y la vigencia actuales. Desactivación, vencimiento, renovación o sustitución de la revisión impiden recuperar contenido fuera del nuevo ámbito. Se mantiene la política de conservación y purga existente.
- **FR-009**: Recuperar historial o consultar un pendiente NO DEBE invocar a IA, reenviar una pregunta aceptada ni consumir cupo adicional. Las cinco preguntas aceptadas en cualquier ventana móvil de diez minutos siguen compartidas por estudiante/evaluación, entre enlaces, conversaciones y dispositivos.
- **FR-010**: El navegador NO DEBE conservar el enlace secreto, mensajes, respuestas, nombres, notas o evidencias para esta función. Solo puede recordar un identificador opaco de continuidad; si no puede hacerlo, ofrece un modo temporal explicado sin bloquear la lectura.
- **FR-011**: Las respuestas DEBEN mostrar párrafos, énfasis, listas, tablas y fórmulas permitidas de forma legible. Se preservan texto sustantivo, advertencias y significado; los títulos de pasos y ejemplos solo se destacan cuando existen en el contenido.
- **FR-012**: La presentación pública NO DEBE ejecutar contenido incrustado ni cargar imágenes, rastreadores o destinos externos propuestos por el mensaje. Preguntas del visitante se muestran como texto y no como instrucciones de presentación.
- **FR-013**: La decoración DEBE diferenciar visualmente pregunta y respuesta, con avatar/icono, superficies y acentos discretos; explicación, pasos y ejemplos presentes pueden tener bloques identificables. Reutiliza iconos y recursos locales existentes de forma accesible, sin tapar contenido, sugerir logros no observados o generar recursos pagados automáticamente. Leer, reformatear y recuperar no realizan nuevas llamadas a IA.
- **FR-014**: La interfaz DEBE funcionar desde 360 px hasta escritorio en ambos temas, con botones táctiles de al menos 44×44 px, foco y navegación por teclado, texto ampliable y desplazamiento localizado de tablas, sin desbordamiento de toda la página ni acciones ocultas por el teclado.
- **FR-015**: La entrega DEBE conservar notas, evidencias, matrícula, cuentas, modelos configurados, análisis históricos y enlaces existentes. No realiza envíos externos, reescrituras masivas de mensajes ni recalificaciones; solo persiste una decisión explícita o una pregunta nueva autorizada.

### Entidades clave

- **Devolución docente**: mensaje propuesto, revisión editada y autorización de entrega ligada a la fuente académica vigente; la nota tiene su propia decisión e historial.
- **Espacio de retroalimentación**: selección, modo individual/grupo, estudiante enfocado, edición no guardada y acciones comunes; no es otra fuente académica.
- **Conversación de navegador**: continuidad opaca de un lector en un acceso, revisión y credencial vigentes; no representa identidad verificada de estudiante o acudiente.
- **Pregunta y respuesta**: petición aceptada una vez, estado, fechas y texto permitido; se conserva conforme al acceso y la política de retención.
- **Cupo compartido**: las admisiones de un estudiante/evaluación en diez minutos; no pertenece a un navegador o conversación.

## Criterios de éxito

- **SC-001**: En la matriz de ambos accesos docentes, dos docentes y estados de devolución, el 100 % muestra el mismo mensaje/estado y dispone de la misma revisión y entrega; un mensaje guardado no exige editarlo otra vez en otro formulario.
- **SC-002**: Una muestra de treinta estudiantes con notas mixtas conserva selección y funciones de impresión/copia/entrega en lote; el 100 % de errores parciales identifica su causa y ningún estudiante se publica por abrir la pantalla.
- **SC-003**: Veinticinco intercambios sintéticos y una pregunta pendiente se recuperan tras recarga y reapertura en orden, sin pérdida ni duplicados; la recuperación produce cero preguntas nuevas aceptadas.
- **SC-004**: El 100 % de intentos de lectura entre navegadores, estudiantes, revisiones o credenciales distintas se rechaza sin revelar contenido; también se bloquea una lectura cuyo acceso cambia durante la consulta.
- **SC-005**: El 100 % de casos de marcado y espacios habituales se presenta sin asteriscos de énfasis visibles, conservando texto significativo. Los casos de contenido externo no producen solicitudes externas ni ejecución de instrucciones.
- **SC-006**: En 360, 390, 768 y 1440 px, dos motores y ambos temas, no hay texto cortado, botones inaccesibles o desbordamiento de página; la emulación no se reporta como prueba física de iPhone/Android.
- **SC-007**: Las primeras cinco preguntas válidas compartidas se admiten y la sexta espera; recargar o cambiar de conversación no altera esa cuenta. Recuperar, reformatear e imprimir producen cero llamadas a IA y cero modificaciones académicas.

## Supuestos

- La continuidad se limita al mismo perfil de navegador, con conexión y almacenamiento disponible. En un dispositivo compartido, quienes usen ese perfil y posean el enlace podrán continuar la misma conversación; no se afirma identificar personas. Borrar los datos locales pierde su referencia de recuperación.
- Las conversaciones anteriores a este cambio no se pueden asignar con seguridad a un navegador. Se conservan para trazabilidad, pero no se muestran como historial recuperable a un nuevo lector. No se cambia la política de purga existente.
- Unificar no equivale a ocultar el grupo ni eliminar la copia rápida individual: ambas entradas enfocan el mismo espacio y revisión. Tampoco equivale a aceptar o publicar automáticamente.
- Este alcance mejora presentación y continuidad, no cambia modelos, límites de generación ni contexto académico del asistente. No activa generación de imágenes/gráficos pagados por conversación ni promete validación pedagógica independiente.
- Se reutilizan impresión, motivos, publicaciones y controles existentes. Fuera de alcance: historial entre dispositivos, cuentas de familiares, chat colectivo, búsqueda pública de alumnos y envío automático de mensajes.
- El plan incluye el soporte mínimo de persistencia segura además del frontend. Spec107/120/122 seguirán siendo propietarias de calificación y entrega; la implementación deberá añadir referencias explícitas a esta ampliación de continuidad, sin contradecir sus restricciones de privacidad.
- El usuario aprobó alcance, plan y revisión de requisitos el 2026-10-24: «Si y decoremos la conversacion para que no sea plana apruebo». No se asume autorización de fusión o despliegue.

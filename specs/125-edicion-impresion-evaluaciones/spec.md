# Especificación: edición e impresión de evaluaciones claras

**Rama**: `codex/125-edicion-impresion-evaluaciones` | **Creada**: 2026-10-24 | **Estado**: Alcance y plan aprobados; revisión de requisitos autorizada | **Issue**: [#262](https://github.com/Andres-back/Calificator/issues/262)

**Solicitud**: mejorar la visualización en computador y la edición de preguntas en celular/computador; reutilizar o proponer ilustraciones aisladas sin fondo apropiadas para impresión en blanco y negro; controlar letra, espacio de respuesta y composición para acercarse a una cantidad deseada de hojas.

## Escenarios de usuario y pruebas

### Historia 1 - Ver la evaluación y revisar sus materiales (Prioridad: P1)

Como docente quiero leer la evaluación completa con una escala apropiada para mi pantalla y ampliar una figura antes de añadirla, sin confundir un material de pregunta con la evaluación final.

**Razón de prioridad**: una hoja excesivamente ampliada o una imagen reducida dentro de un cuadro dificulta comprobar lo que recibirán los estudiantes.

**Prueba independiente**: abrir una evaluación sintética de varias páginas en computador y celular, cambiar la escala y revisar una imagen vertical y otra horizontal sin guardar cambios.

**Aceptación**:
1. **Dada** una pantalla de computador, **cuando** se abre «Visualizar», **entonces** la primera hoja aparece centrada y completa a una escala inicial útil; se puede elegir «Página completa», «Ancho» o «100 %», ampliar y recorrer todas las páginas.
2. **Dado** un celular, **cuando** se abre la misma evaluación, **entonces** se conserva la lectura al ancho, el desplazamiento continuo y el acceso a las herramientas, sin desplazamiento horizontal de la interfaz.
3. **Dada** una figura o una hoja completa propuesta como material, **cuando** se revisa, **entonces** puede ampliarse en un área de lectura suficiente y se indica que se añadirá ese material, no una copia editable de toda la evaluación.
4. **Dado** un documento largo o una conexión lenta, **cuando** se visualiza o falla la carga, **entonces** se muestra progreso o una opción de reintento sin bloquear cerrar, descargar o volver al editor.

### Historia 2 - Editar una pregunta sin perderse (Prioridad: P1)

Como docente quiero concentrarme en una pregunta, pasar a otra rápidamente y encontrar por separado sus opciones, material y solución privada.

**Razón de prioridad**: agrandar únicamente la ventana no resuelve los controles anidados y la cantidad de información visible a la vez.

**Prueba independiente**: modificar un borrador sintético de veinte preguntas en ambas pantallas, navegar entre preguntas, revisar un material, cancelar y guardar explícitamente en pruebas independientes.

**Aceptación**:
1. **Dada** una evaluación, **cuando** se abre para editar, **entonces** se presenta una pregunta principal y un selector con número y comienzo del enunciado; en computador hay navegación lateral y en celular un selector compacto con anterior/siguiente.
2. **Dada** una pregunta, **cuando** se edita, **entonces** enunciado, opciones y material se distinguen de solución privada, puntaje y criterios; todos siguen accesibles sin mostrar simultáneamente formularios extensos de otras preguntas.
3. **Dado** el teclado del celular, **cuando** se escribe o cambia de pregunta, **entonces** el campo activo queda visible, el borrador no se pierde y guardar/cancelar siguen accesibles. Cerrar con cambios exige decidir si conservar o descartar.
4. **Dado** un cambio de orden solicitado expresamente, **cuando** se guarda, **entonces** se conserva la correspondencia entre pregunta, opciones, solución y material; la composición de impresión nunca cambia ese orden por iniciativa propia.

### Historia 3 - Preparar hojas legibles y aprovechar el espacio (Prioridad: P1)

Como docente quiero ajustar el tamaño de letra impresa, el espacio para contestar y la distribución de preguntas cortas, y saber cuántas hojas ocupa antes de imprimir.

**Razón de prioridad**: las preguntas cerradas no necesitan el mismo espacio que una explicación o un dibujo, pero reducir páginas no debe eliminar contenido ni impedir responder.

**Prueba independiente**: preparar una evaluación mixta con lectura, ABCD, verdadero/falso, respuesta corta, respuesta larga y dibujo; comparar su vista final, PDF y Word antes y después de ajustar la presentación.

**Aceptación**:
1. **Dada** una evaluación, **cuando** se abre «Formato de impresión», **entonces** se elige distribución compacta, media o amplia y, por separado, blanco y negro o color. Se ajusta opcionalmente la letra entre10 y18 puntos; ese control cambia el documento, no el tamaño de los controles de la aplicación.
2. **Dadas** preguntas con diferentes respuestas esperadas, **cuando** se elige el espacio para responder, **entonces** puede dejarse automático por tipo o ajustarse por pregunta; las preguntas abiertas y de dibujo conservan espacio útil.
3. **Dadas** opciones o preguntas cerradas cortas, **cuando** se usa el perfil compacto, **entonces** pueden distribuirse en dos columnas cuando quepan, conservando el orden de lectura, numeración y letras de opciones; los bloques largos se mantienen a ancho completo.
4. **Dada** una meta de hojas, **cuando** se solicita ajustar, **entonces** se muestra la cantidad real obtenida en el PDF y las decisiones de presentación propuestas antes de aplicarlas; nunca se cambia el contenido ni se reduce letra o espacio por debajo de los mínimos permitidos.
5. **Dada** una meta imposible, **cuando** no cabe el contenido, **entonces** se informa cuántas hojas necesita y se permite cambiar la meta o los ajustes; no se promete una cantidad falsa ni se recortan lectura, figuras o preguntas.
6. **Dada** una configuración guardada, **cuando** se reabre o exporta, **entonces** se conserva; una versión anterior usa su propia presentación. Word conserva contenido y ajustes, indicando que su paginación puede variar según el programa con que se abra.
7. **Dada** una figura sencilla con rótulos legibles a tamaño reducido, **cuando** el docente elige composición lateral, **entonces** la pregunta y su espacio de respuesta pueden colocarse al lado de la figura sin recortarla, estirarla ni perder su asociación; las figuras detalladas conservan una alternativa a ancho completo.

### Historia 4 - Añadir una ilustración útil sin desperdiciar tinta (Prioridad: P2)

Como docente quiero reutilizar los motivos disponibles o pedir una ilustración aislada para una pregunta, revisarla y comprobar cómo se verá en blanco y negro.

**Razón de prioridad**: ya existe una biblioteca; no es necesario pagar una imagen nueva por cada adorno. Una figura necesaria para responder requiere más cuidado que una decoración.

**Prueba independiente**: elegir un motivo existente y preparar propuestas sintéticas de una figura aislada, una tabla y una imagen con información por color, sin llamadas pagadas.

**Aceptación**:
1. **Dada** una pregunta, **cuando** se añade material, **entonces** se ofrecen biblioteca, archivo y propuesta con IA, diferenciando «Decoración» de «Necesario para responder» y exigiendo revisión antes de incorporarlo.
2. **Dada** la generación de ilustración, **cuando** el docente la solicita expresamente, **entonces** se pide una sola figura aislada, sin hoja, encabezado, preguntas, soluciones ni datos personales; se prioriza un trazo claro y poca tinta.
3. **Dada** una ruta capaz de producir transparencia, **cuando** devuelve una ilustración, **entonces** se comprueba que tenga fondo realmente transparente antes de presentarla como «sin fondo». Si esa capacidad no está disponible, se explica y se permite biblioteca o archivo; no se presenta un fondo blanco como transparente.
4. **Dado** un material científico, una tabla o un gráfico, **cuando** se adapta la presentación, **entonces** no se sustituyen automáticamente sus datos, etiquetas, escala ni significado por un motivo decorativo. Si el color es necesario para responder, no se elimina automáticamente.
5. **Dado** un cambio de tamaño, posición permitida o vista en blanco y negro, **cuando** se aplica, **entonces** no provoca una nueva llamada a IA y conserva el original del material.

### Casos límite

- Documentos extensos, primera/última pregunta, enunciados y opciones muy largos, tablas que exceden el ancho y figuras con rótulos pequeños.
- Imágenes que son hojas completas: permitir revisarlas a tamaño útil sin afirmar que son una figura aislada ni sustituir la evaluación por ellas.
- Evaluaciones antiguas sin ajustes de impresión o sin una versión visual: mantienen su comportamiento mientras no se guarden nuevos ajustes explícitos; su recalificación no queda bloqueada por crear una presentación.
- Evaluaciones con entregas o notas: cambiar la presentación no modifica evidencias, notas, versiones de entrega ni decisiones docentes existentes.
- Una lectura o imagen compartida con varias preguntas no se duplica en cada una, no se pierde ni se separa de su referencia.
- Una pregunta o una figura más alta que la hoja requiere una composición legible; no usar una regla que evite todos los saltos y termine desbordando el papel.
- Zoom de la página y tamaño de letra impresa son controles distintos. En zoom ampliado puede desplazarse el documento, pero nunca toda la aplicación fuera de pantalla.
- Fallo de imagen, generación o exportación: conservar el borrador y el original; ofrecer reintento explícito sin llamadas o cambios silenciosos.
- Editar simultáneamente en dos pestañas no debe sobrescribir cambios más recientes ni mezclar configuración y preguntas de versiones diferentes.

## Requisitos

### Requisitos funcionales

- **FR-001**: El visor DEBE ofrecer escala de página completa, ancho y 100 %, además de ampliación y lectura continua; el inicio DEBE adaptarse a computador o celular sin perder el punto de lectura al cambiar de escala.
- **FR-002**: La revisión de material DEBE permitir ampliarlo con controles accesibles y distinguir material de una pregunta, decoración y vista final de la evaluación.
- **FR-003**: El editor DEBE concentrar la edición en una pregunta, ofrecer navegación directa y anterior/siguiente, conservar el borrador y separar controles principales de opciones avanzadas sin eliminar funciones existentes.
- **FR-004**: Editor, visor y preparación de impresión DEBEN funcionar desde 360 px, en claro y oscuro, con teclado móvil, objetivos táctiles de al menos 44 × 44 px y sin desbordamiento horizontal de la interfaz; el texto de entrada móvil DEBE evitar ampliaciones involuntarias al enfocar.
- **FR-005**: La configuración imprimible DEBE permitir exactamente tres distribuciones —compacta, media y amplia—, color independiente, tamaño entre10 y18 puntos y espacio de respuesta automático o por pregunta, sin modificar el contenido académico.
- **FR-006**: La composición compacta DEBE aprovechar dos columnas para opciones o preguntas cerradas cortas solo cuando sean legibles; DEBE permitir una figura de tamaño acotado al lado del enunciado y su respuesta cuando sus detalles sigan siendo legibles, con alternativa apilada a ancho completo. DEBE mantener proporción de la figura, orden lógico, numeración, identidad y correspondencia de soluciones y reservar ancho/espacio suficiente para lectura, respuestas abiertas y dibujos. Aprovechar espacio no autoriza recortar contenido ni reducir las áreas útiles de respuesta.
- **FR-007**: El docente DEBE poder indicar una meta de entre 1 y 20 hojas y previsualizar el resultado. El sistema DEBE informar el número real de hojas del PDF, respetar los mínimos de legibilidad y explicar cuando no puede alcanzar la meta sin pérdida; aplicar una propuesta requiere confirmación explícita.
- **FR-008**: La presentación guardada DEBE persistir por evaluación y por versión y aplicarse de forma coherente al visor, PDF y Word. La ausencia de configuración DEBE conservar el comportamiento anterior; no se garantiza paginación idéntica en distintos programas de Word.
- **FR-009**: El flujo de material DEBE reutilizar la biblioteca existente, aceptar archivos y diferenciar decoración de material necesario para responder; cambiar presentación o elegir biblioteca NO DEBE generar gastos de IA.
- **FR-010**: Una propuesta de ilustración con IA DEBE solicitar una figura aislada apta para impresión, sin formularios, soluciones o datos personales. La transparencia DEBE verificarse y depender de capacidades reales del destino configurado; una capacidad ausente DEBE tener una alternativa clara, no un resultado engañoso.
- **FR-011**: El sistema DEBE ofrecer una vista de impresión en blanco y negro y conservar el original; NO DEBE degradar sin advertencia información cuyo significado dependa del color, rótulos, datos, escala o detalle de una figura académica.
- **FR-012**: Estos cambios NO DEBEN recalificar, modificar notas/evidencias/entregas existentes, divulgar soluciones privadas, reordenar contenido automáticamente ni alterar proveedores o modelos institucionales. Los cambios de contenido explícitos mantienen las reglas actuales de versión y permisos.
- **FR-013**: Toda lectura/escritura/exportación nueva DEBE aplicar autorización de docente propietario o administrador competente en servidor y cliente; el estudiante y personas ajenas no pueden editar ni obtener material o soluciones privadas.
- **FR-014**: Las operaciones demoradas DEBEN mostrar estado, permitir navegación y conservar borradores; los ajustes de paginación DEBEN tener trabajo acotado y ninguna generación de contenido oculta. Generar una ilustración exige acción explícita, conserva la ruta institucional configurable y no repite llamadas automáticamente.
- **FR-015**: Guardar ajustes DEBE detectar una versión desactualizada y evitar sobrescrituras silenciosas; una actualización meramente visual NO DEBE invalidar claves ni reasignar versiones a entregas o notas anteriores.

### Entidades clave

- **Presentación de evaluación**: perfil, letra impresa, espacios por pregunta, composición, preferencia de blanco y negro y meta orientativa de hojas; pertenece a la evaluación y a la versión exportada.
- **Propuesta de composición**: ajustes candidatos, cantidad real de hojas y advertencias, sin cambiar el contenido antes de aceptarse.
- **Material de pregunta**: original, uso decorativo o académico, presentación derivada y revisión docente; conserva la relación con su pregunta y el control de acceso.
- **Borrador de edición**: pregunta activa y cambios locales no publicados, preservados durante navegación y revisión de materiales.

## Criterios de éxito

- **SC-001**: En 360, 390, 768, 1440 y 1920 px, los recorridos de visualizar, editar y preparar impresión no presentan controles fuera de pantalla ni desplazamiento horizontal global; se validan en claro/oscuro y motores de navegador usados en iPhone y Android.
- **SC-002**: En una evaluación sintética de veinte preguntas, se puede abrir cualquier pregunta directamente, editarla, ir a la siguiente y volver conservando el borrador, con una sola pregunta principal expandida.
- **SC-003**: En un conjunto sintético mixto, todas las preguntas, opciones, lecturas y figuras aparecen completas en vista final, PDF y Word; no cambian identidad, orden, puntajes ni soluciones al ajustar exclusivamente la presentación.
- **SC-004**: El número de hojas mostrado coincide con el PDF generado en todos los casos de aceptación; una meta imposible produce una explicación y nunca recorte de contenido o letra inferior al mínimo.
- **SC-005**: Reabrir una evaluación o exportar una versión anterior recupera sus propios ajustes sin tocar notas, evidencias o versiones de entregas; las pruebas de evaluación antigua y recalificación no presentan regresiones.
- **SC-006**: Seleccionar biblioteca, ajustar tamaño o cambiar a blanco y negro realiza cero llamadas a IA. Las propuestas sintéticas incluyen tanto transparencia válida como ausencia de capacidad, con mensajes y alternativas correctos.
- **SC-007**: Los casos de permisos, cancelación, error de exportación, conflicto de edición y conservación de datos pasan antes de abrir el PR de implementación; no se afirma usabilidad validada por docentes sin una prueba real autorizada.

## Supuestos y límites

- Alcance, plan y revisión de requisitos aprobados. La solicitud posterior del usuario autoriza llevar esta función a producción mediante PR, todos los controles verdes y despliegue reproducible desde main. No autoriza modificar evaluaciones reales ni llamadas pagadas de prueba.
- La meta cuenta caras/páginas del PDF, no hojas físicas impresas a doble cara; el papel conserva el formato ya soportado por el exportador de evaluaciones. Añadir otros tamaños de papel queda fuera de esta entrega.
- Las distribuciones usan10,5 puntos para compacta,12 para media y14 para amplia; se permite ajuste manual dentro del rango. No se aplica un formato nuevo a evaluaciones antiguas sin confirmación.
- Se limita esta entrega a composición por bloques y navegación enfocada, no a un editor libre con capas, texto alrededor de siluetas o maquetación de revista.
- No se regenera ni reemplaza automáticamente una figura existente. La reproducción fiel de originales y la separación de elementos al digitalizar siguen en Spec124 / issue #261; esta especificación es propietaria de la presentación y composición posteriores.
- La biblioteca entregada en Spec123 se reutiliza, no se amplía con cientos de imágenes nuevas. Las figuras académicas no son intercambiables con motivos decorativos.
- La transparencia real y los parámetros de una ruta de imágenes se comprobarán contra sus capacidades y documentación oficial antes de implementarla; no se promete que cualquier proveedor la soporte.

## Aprobación y aclaración

El usuario aprobó el plan y autorizó revisar los ocho requisitos y continuar el2026-10-24: «sí porque actualmente si genero una evaluación me da solo texto y ya». Los apoyos se deben poder añadir también al borrador recién generado, con biblioteca, tabla/gráfico o ilustración revisada. No implica generar imágenes pagadas automáticamente para cada pregunta ni sustituir enunciados por imágenes de hojas completas.

El2026-10-24, tras revisar la muestra de alimentos, el usuario precisó que la figura debía ocupar menos espacio y compartir fila con la pregunta para aprovechar mejor cada hoja. Es composición lateral de bloques dentro de la historia3, no un editor libre ni un cambio de contenido, orden o puntajes. Primero se contrastará una muestra local conservando las respuestas abiertas; no se declara desplegado este formato por generar el PDF de ejemplo.

Después pidió expresamente tres modos «compacta, media o amplia» y que las mejoras se reflejen en producción para dejar de generar evaluaciones solo con texto. El flujo permite añadir biblioteca, subida, tabla/gráfica o propuesta de ilustración al borrador recién generado, con revisión docente y sin imágenes de pago automáticas. Blanco y negro/color es una decisión independiente y persistente, no dos plantillas desconectadas del visor.

## Coordinación documental 130

[Spec130](../130-digitalizacion-secciones/spec.md), issue #274, amplía este contrato bajo aprobación registrada. Editor contextual por secciones y recorrido común en PDF/Word, sin duplicar lectura legacy. Conserva compacta/media/amplia, formatos y referencias de material. Presupuestos confirmados muestran subtotales derivados de las preguntas. El estado de pruebas y las limitaciones están en su guía de validación; no supone activación en producción.

## Evolución 128: formato independiente en la copia

[128-materias-notas-reutilizacion](../128-materias-notas-reutilizacion/spec.md), issue #270, conserva configuración de impresión al usar una evaluación en otra materia propia. Remapea también las claves de diccionario de espacios por pregunta y tamaño/posición por bloque a sus nuevas identidades. La copia puede editarse sin modificar el original; las exportaciones usan recursos propios y no muestran solucionarios en la versión del estudiante. No cambia distribución ni generación de imágenes.

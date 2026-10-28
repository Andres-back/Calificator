# Especificación: escaneo conservador de evidencias para calificación

**Rama**: `codex/131-escaneo-evidencias` | **Creada**: 2026-10-26 | **Actualizada**: 2026-10-27 | **Estado**: Especificación y plan ampliados aprobados por el usuario mediante «adelate aprove»; implementación autorizada, todavía no entregada | **Issue**: [#276](https://github.com/Andres-back/Calificator/issues/276)

## Escenarios de usuario y pruebas

### Historia 1 - Fotografiar y preparar la hoja sin complicaciones (Prioridad: P1)

Como docente, quiero que una foto tomada de lado, con fondo de mesa o iluminación irregular se prepare para leerla mejor antes de calificar, conservando lo que realmente escribió el estudiante.

**Razón de prioridad**: una hoja bien encuadrada aprovecha mejor la imagen enviada al calificador; una mejora que borre una marca sería peor que el problema original.

**Prueba independiente**: capturar o subir una hoja plana inclinada, revisar los bordes propuestos, aceptar la preparación y comprobar que preguntas, respuestas y márgenes relevantes siguen presentes.

**Aceptación**:
1. **Dada** una captura móvil, **cuando** el profesor regresa a la aplicación, **entonces** sigue usando la cámara normal del dispositivo y dispone de una vista amplia para revisar la preparación; en computador conserva su webcam y selector.
2. **Dada** una hoja plana distinguible, **cuando** se propone el escaneo, **entonces** se señalan sus cuatro esquinas y se previsualiza una copia enderezada, sin afirmar que la detección sea infalible ni enviarla a calificar automáticamente.
3. **Dado** un recorte incorrecto o dudoso, **cuando** el docente lo revisa, **entonces** puede ajustar esquinas, ampliar, girar, restablecer o utilizar la foto completa, también mediante controles que no exijan arrastrar.
4. **Dada** una foto que ya es legible, **cuando** no necesita cambios, **entonces** puede conservarla sin recorrer un asistente largo ni pagar una llamada adicional de IA.

### Historia 2 - Mejorar la lectura sin cambiar las respuestas (Prioridad: P1)

Como docente, necesito que el lápiz tenue, los colores, los signos matemáticos, los dibujos y los tachones conserven su significado, y poder comparar la preparación con el archivo recibido.

**Prueba independiente**: comparar originales y copias preparadas de una muestra anotada con lápiz, respuestas ABCD/VF, decimales, signos menos, dibujos y anotaciones cerca del borde.

**Aceptación**:
1. **Dada** una foto con sombras moderadas, **cuando** se aplica la mejora de lectura, **entonces** se propone un ajuste moderado de iluminación y contraste, manteniendo una salida en color y la posibilidad de deshacerlo.
2. **Dadas** marcas tenues o figuras, **cuando** se prepara la foto, **entonces** no se reconstruyen letras, eliminan tachones, rellenan respuestas ni se sustituye la evidencia por un redibujado generado.
3. **Dado** un reflejo saturado, una parte oculta o una imagen demasiado borrosa, **cuando** no hay información suficiente, **entonces** se explica el límite y se ofrece repetir la foto o conservarla con advertencia, sin prometer recuperación inexistente.
4. **Dada** una propuesta aceptada, **cuando** el docente envía la entrega, **entonces** puede saber qué imagen se utilizará y posteriormente comparar esa versión con la fuente conservada bajo sus permisos.

### Historia 3 - Conservar el contexto, el historial y el funcionamiento actual (Prioridad: P1)

Como docente, quiero preparar varias hojas sin mezclarlas con otro estudiante, conservar los originales nuevos y que una recalificación utilice una evidencia reproducible.

**Prueba independiente**: preparar diez fotos, cambiar orden/rotación, cancelar un ajuste, cambiar de estudiante durante el procesamiento y recalificar una entrega nueva; verificar identidad, historial y permisos.

**Aceptación**:
1. Cada página mantiene su propia foto, orden y decisión de preparación. Un resultado tardío o cancelado nunca se aplica a otra página, estudiante, evaluación o sesión, tampoco al volver al contexto anterior.
2. El envío conserva los archivos originales recibidos y la versión preparada por separado, con procedencia y decisiones revisables; no reescribe evidencias ni notas históricas.
3. Todos los participantes de una misma revisión de IA consumen las mismas páginas preparadas y su orden. Recalificar reutiliza esa versión; cambiar su preparación después es una operación expresa de cambio de evidencia con historial, no un cambio silencioso de lectura.
4. Un fallo de procesamiento o una función deshabilitada mantiene una ruta para entregar sin escaneo. No hay nuevas barreras académicas, duplicados por reintento o publicación de originales en enlaces familiares por defecto.

### Historia 4 - Identificar las respuestas de un vistazo (Prioridad: P2)

Como docente, quiero distinguir las respuestas correctas en verde, las que necesitan revisión en amarillo y las incorrectas en rojo, sin que seleccionar una pregunta o cambiar de pantalla oculte su estado.

**Razón de prioridad**: permite concentrar la revisión en las respuestas dudosas y entender el desglose sin leer todos sus detalles. La señalización no debe convertirse en otra decisión de calificación.

**Prueba independiente**: abrir un desglose sintético con respuestas correctas, incorrectas, parciales, ilegibles, sin puntaje y con avisos; seleccionar cada pregunta en celular y computador y contrastar color, etiqueta e icono con su estado vigente, sin modificar los datos.

**Aceptación**:
1. **Dada** una respuesta correcta ya evaluada y sin aviso propio pendiente, **cuando** se presenta su botón/tarjeta, **entonces** se identifica en verde con texto «Correcta» y símbolo de acierto.
2. **Dada** una respuesta con revisión pendiente, parcial, ilegible, no evaluable o sin información suficiente, **cuando** se presenta, **entonces** se identifica en amarillo con una etiqueta que distingue su situación; una ausencia de lectura no se convierte en «Incorrecta» por defecto.
3. **Dada** una respuesta cuyo estado vigente es incorrecto y no tiene revisión pendiente, **cuando** se presenta, **entonces** se identifica en rojo con texto «Incorrecta» y símbolo correspondiente, no con el icono de acierto.
4. **Dada** una pregunta seleccionada o un cambio de tema/tamaño, **cuando** se navega por el desglose, **entonces** su estado sigue identificable por color y texto/icono, y la selección tiene una marca distinta. No cambia nota, estado guardado, permisos o disponibilidad de publicación/enlaces.

### Historia 5 - Ver de cerca la evidencia de la pregunta seleccionada (Prioridad: P1)

Como docente, quiero que al seleccionar una pregunta en el desglose se muestre ampliada la zona donde el estudiante respondió, para contrastar rápidamente la fotografía con la transcripción y el puntaje sin buscarla en toda la hoja.

**Razón de prioridad**: comprobar la evidencia real facilita revisar respuestas escritas, dibujos y procedimientos; ampliar solamente el texto transcrito no permite detectar errores de lectura.

**Prueba independiente**: seleccionar preguntas de un desglose sintético con zonas conocidas en distintas hojas y comprobar que cada fragmento corresponde a la respuesta y versión correctas; repetir sin ubicación disponible y durante una edición de puntaje.

**Aceptación**:
1. **Dada** una pregunta con ubicación de evidencia disponible y válida, **cuando** se selecciona, **entonces** aparece su fragmento fotográfico ampliado con un margen de contexto y la hoja identificada, junto a la respuesta cuando el espacio lo permita. La ubicación se presenta como una ayuda revisable, no una lectura infalible.
2. **Dado** un celular, **cuando** el profesor necesita inspeccionar el fragmento, **entonces** puede abrir una vista amplia, ampliar/reducir y desplazar la imagen, ver la hoja completa y regresar sin perder la pregunta o los cambios de puntaje no guardados. En computador puede revisar evidencia y respuesta en paralelo cuando quepan de forma legible.
3. **Dada** una ubicación ausente, inválida o de una versión anterior, **cuando** se selecciona la pregunta, **entonces** se ofrece la hoja asociada con zoom manual o un selector de hojas; no se señala una zona inventada ni se bloquea la calificación. Una respuesta en varias zonas/hojas permite consultar todas las referencias disponibles.
4. **Dado** cualquier acercamiento, **cuando** se abre, ajusta o cierra, **entonces** no se modifica la evidencia, la nota o su estado, ni se envía otra llamada a IA. Los modelos siguen recibiendo las páginas completas previstas; la ampliación es solamente una ayuda de lectura docente.

### Historia 6 - Recibir una propuesta automática cuando el borde local no aparece (Prioridad: P1)

Como docente en celular, quiero que al tomar una foto se propongan las cuatro esquinas sin tener que colocarlas siempre a mano, manteniendo el control del encuadre y de mi evidencia.

**Prueba independiente**: tomar una foto con borde distinguible pero sin propuesta local; recibir la sugerencia asistida, comparar con la hoja completa y confirmar o corregir antes de enviar. Repetir con ausencia de borde, fallo de red y cambio de estudiante.

**Aceptación**:
1. La detección local se intenta primero. Si no encuentra un contorno claro y la ayuda asistida está habilitada para ese docente, se propone el borde mediante el proveedor configurado, sin pedir otra captura ni enviar a calificar.
2. La ayuda solo devuelve una propuesta geométrica: no redibuja la hoja, transcribe, evalúa o completa respuestas. Un contorno incierto o inválido deja la foto completa y ajuste manual disponibles.
3. Se informa cuando se consulta ayuda externa. Un fallo, cancelación o espera agotada no pierde la foto ni bloquea continuar; no hay reintentos o proveedores alternativos ocultos.
4. La propuesta se aplica únicamente a la misma foto, orientación y contexto pendientes; nunca sustituye una corrección manual más reciente. El docente puede comparar y debe aceptar antes del envío.
5. El administrador puede elegir proveedor y modelo compatibles para esta ayuda sin cambiar el código o los modelos de calificación. Desactivarla no altera las evidencias o notas existentes.

### Casos límite

- Hoja de respuestas pequeña, tira ABCD, foto previamente recortada, papel de color o cuaderno cuadriculado: no exigir A4 ni confundir una tabla interior con el borde del documento.
- Dos hojas en una foto, rectángulos de mesa, reflejos, dedos o bordes fuera de la imagen: pedir revisión o conservar la foto completa; no inventar un contorno seguro.
- Página curvada o doblada: la corrección de hoja plana no promete descurvarla ni recuperar contenido oculto.
- Orientación de cámara, fotos reflejadas y giros del profesor: no rotar dos veces ni invertir el orden de las respuestas.
- Archivo no compatible, foto grande que excede la capacidad del escáner, poca memoria o navegador sin soporte: conservar el avance y ofrecer alternativa comprensible, sin cambiar la extensión para simular otro formato.
- Interrupción de red, pestaña oculta, cambio de cuenta, reemplazo/eliminación de página y resultado perdido: cancelar o recuperar por identidad sin mezclar alumnos ni generar otra calificación.
- PDF subido, digitalización del enunciado y entrega del estudiante: mantienen el flujo actual; el primer alcance es evidencia fotográfica preparada por el docente, no un cambio automático de todos los consumidores.
- Original antiguo no conservado: mostrar la evidencia disponible como tal; nunca presentarla como el archivo original de cámara recuperado.
- Color de respuesta: priorizar el aviso vigente del componente sobre un acierto/error provisional; un aviso general del análisis no cambia indiscriminadamente el color de todas las preguntas ni reabre avisos históricos resueltos.
- Puntaje cero, sin puntaje y sin lectura son situaciones distintas. No inferir corrección a partir solo del número o de la nitidez de la foto. Las parciales mantienen su etiqueta «Parcial» y no añaden un bloqueo de publicación.
- Una respuesta puede ocupar varias zonas, continuar en otra hoja o incluir dibujo/procedimiento. No reducirla silenciosamente al primer renglón ni confundir preguntas con el mismo número impreso de secciones diferentes.
- El giro, la perspectiva, el cambio de evidencia y la elección de original/preparada cambian el marco de la imagen: no reutilizar una ubicación sobre otra versión o página. Ante referencia desactualizada, mostrar la hoja correcta sin señalamiento preciso.
- Cambiar rápidamente de pregunta/estudiante o recibir tarde una imagen no debe mostrar un fragmento ajeno. Ampliar, cerrar o girar el teléfono no pierde una edición de puntaje ni fuerza un cambio de pestaña o foco.

## Requisitos

### Requisitos funcionales

- **FR-001**: Ofrecer preparación tipo escáner después de tomar o seleccionar una fotografía de evidencia docente, conservando captura nativa móvil, webcam de computador y alternativa de archivos actuales.
- **FR-002**: Proponer bordes y corregir perspectiva de una hoja plana cuando resulte suficientemente clara; ante ambigüedad conservar el encuadre completo para revisión, sin asumir tamaño o proporción de hoja fijos.
- **FR-003**: Permitir ajustar cuatro esquinas, girar, ampliar, comparar antes/después y restablecer; ofrecer alternativa accesible a arrastrar y una acción clara para usar el original.
- **FR-004**: Conservar preguntas, respuestas, figuras, signos, tachones, colores y marcas relevantes en la preparación aceptada; no generar, completar, reinterpretar o borrar contenido de la evidencia.
- **FR-005**: Ofrecer mejora moderada de iluminación/contraste revisable y desactivable. No aplicar blanco y negro duro, limpieza de escritura o enfoque agresivo automáticamente.
- **FR-006**: Mostrar advertencias localizadas y comprensibles de calidad, diferenciando lo que se ajustó de lo que no puede recuperarse; no etiquetar una mejora estética como prueba de lectura o calificación correcta.
- **FR-007**: Hacer visible la preparación elegida antes del envío explícito, con estados por página; capturar, abrir el editor o comparar no envía ni califica automáticamente.
- **FR-008**: Conservar de forma privada los originales recibidos de las capturas nuevas incluidas en este flujo, separados de las copias preparadas, con procedencia comprobable y controles de retención actuales. No prometer recuperación de originales históricos ausentes.
- **FR-009**: Vincular de forma inequívoca cada original, preparación, orden y decisión a su página/entrega; un fallo, cambio de contexto o reintento no debe mezclar alumnos, duplicar evidencias o reemplazar una decisión más reciente.
- **FR-010**: Garantizar que extracción, valoración y revisiones de una misma ejecución utilicen las mismas páginas y preparación; conservar esa elección al recalificar y requerir cambio explícito de evidencia para alterarla después.
- **FR-011**: Mantener una ruta sin escaneo con los límites y permisos vigentes si el docente no lo necesita o el dispositivo/procesamiento falla. Solo archivos corruptos o sin detalle útil mantienen los rechazos actuales; una detección incierta no añade otro bloqueo.
- **FR-012**: Respetar los límites existentes de cantidad, tamaño y páginas, y no volver a comprimir repetidamente una foto preparada en sucesivas etapas de envío a los modelos.
- **FR-013**: Procesar sin bloquear la interfaz, mostrar avance/cancelación y liberar recursos al cerrar, repetir o cambiar de estudiante. El modo local no incluye inferencias; la ayuda geométrica opcional se rige exclusivamente por FR-027 a FR-031, sin servicios de reconstrucción de imagen.
- **FR-014**: Hacer operables revisión y edición desde360px a escritorio, ambos temas y orientación horizontal, con zoom, foco, controles táctiles accesibles y texto ampliado.
- **FR-015**: Aplicar los permisos vigentes a originales, derivados e historial; no revelar fotografías, ubicación de captura, rutas privadas o datos sensibles en registros generales ni en enlaces compartidos por defecto.
- **FR-016**: Mantener notas, decisiones docentes, evidencias antiguas, fórmulas, modelos y presupuestos de llamadas existentes; el procesamiento nuevo no recalifica ni migra registros anteriores automáticamente.
- **FR-017**: Admitir el flujo actual cuando no se solicita escaneo; habilitar la nueva capacidad gradualmente y poder deshabilitar nuevas preparaciones sin perder originales, historial o lectura de versiones ya creadas.
- **FR-018**: Verificar conservación de contenido, permisos, recuperación, uso de recursos y recorrido real en teléfonos antes de activación general; cualquier mejora de OCR o calificación debe demostrarse por comparación controlada, no deducirse solo de una foto más blanca.
- **FR-019**: Identificar en la revisión de respuestas las correctas en verde, las que necesitan revisión en amarillo y las incorrectas en rojo, utilizando el estado efectivo vigente del componente y dando prioridad a sus avisos pendientes. Estados parciales/ilegibles/no evaluables/incompletos deben tener etiquetas explícitas y no aparecer como errores definitivos por defecto.
- **FR-020**: Mantener color semántico, etiqueta e icono coherentes entre botón de pregunta y tarjeta, también al seleccionarla, en ambos temas y desde celular a escritorio. La comprensión no debe depender únicamente del color; la selección, el foco y los puntajes deben seguir siendo distinguibles.
- **FR-021**: Limitar esta señalización a presentación: no recalcular notas, cambiar estados guardados, reabrir revisiones resueltas, alterar decisiones docentes o impedir publicar/compartir/imprimir. No confundir calidad de fotografía con corrección de una respuesta ni divulgar información adicional en vistas con permisos restringidos.
- **FR-022**: Mostrar en el desglose docente un acercamiento a la evidencia fotográfica de la pregunta seleccionada cuando exista una ubicación válida, identificando la hoja y conservando contexto alrededor de la respuesta; abarcar también dibujos, procedimientos y continuaciones disponibles.
- **FR-023**: Permitir ampliar/reducir, desplazar, restablecer, consultar la hoja completa y regresar a la respuesta desde celular o computador, con controles táctiles y de teclado. Conservar selección, foco pertinente y ediciones no guardadas; no exigir desplazarse a otra sección para encontrar la evidencia.
- **FR-024**: Asociar cada ubicación a la pregunta y versión exactas de su evidencia. No aplicar una referencia a otra hoja, estudiante, revisión u orientación; si falta o no puede comprobarse, ofrecer hoja asociada/selector y zoom manual sin inventar precisión ni impedir la revisión.
- **FR-025**: Mantener el acercamiento como visualización docente: no recortar o sustituir archivos conservados o enviados a los evaluadores, no cambiar notas/estados y no añadir llamadas a IA o recalificaciones para localizar respuestas antiguas. La falta de ubicación no cambia el color académico de una respuesta.
- **FR-026**: Conservar los permisos vigentes de lectura al ampliar o cambiar de variante; no publicar nuevos fragmentos, originales privados o ubicaciones en enlaces familiares por defecto. Una respuesta tardía o una referencia obsoleta no puede revelar evidencia de otro contexto.
- **FR-027**: Intentar primero el borde local y permitir ayuda visual externa opcional solo cuando no haya propuesta clara, con avance comprensible y alternativa manual/original siempre disponible. Una solicitud no supera una llamada ni20s de espera; no reintenta o cambia de proveedor automáticamente.
- **FR-028**: Validar que la ayuda devuelve exclusivamente cuatro esquinas normalizadas de una hoja visible sobre la misma foto orientada, con geometría válida; abstenerse si no hay una única hoja identificable. No aceptar imágenes reconstruidas, texto académico o instrucciones de la foto como control de la operación.
- **FR-029**: Conservar la fuente, comparación y aceptación docente. Vincular sugerencia a foto, orientación y contexto; descartar resultados tardíos tras edición manual, cancelación, giro o cambio de estudiante. No enviar otra inferencia por volver a abrir la misma propuesta dentro de su vigencia.
- **FR-030**: Configurar proveedor/modelo de esta ayuda desde la administración existente mediante capacidad visual comprobada, sin nombres de modelos en el flujo académico ni alterar otras rutas. La ayuda comienza deshabilitada y carece de permiso para recalificar o publicar.
- **FR-031**: Autorizar y limitar las consultas por docente/contexto, minimizar la foto enviada sin metadatos y excluirla de registros generales. Guardar únicamente identidad de solicitud, huella, estado y geometría necesaria para impedir duplicados, nunca una copia adicional de la foto en la caché de sugerencias. Una respuesta dudosa se cuenta como abstención, no como éxito.

- **FR-032**: La propuesta puede aproximar los bordes para reducir fondo vacío, manteniendo margen de seguridad y revisión explícita. La falta de un contorno perfecto no obliga a abstenerse; las propuestas ambiguas o que puedan excluir contenido deben conservar la foto completa/manual. Una hoja curva no se trata como plana mediante un recorte interior.
- **FR-033**: «Preparar hoja» ocupa toda la pantalla disponible. Al abrir y restablecer, las cuatro esquinas de la foto caben juntas sin desplazamiento interno de la imagen; ampliar permite recorrer los detalles y volver a encajar. Controles accesibles, giro, cancelación, original y aceptación se conservan en móvil, horizontal y escritorio, con desplazamiento de controles cuando el alto no alcance.

### Entidades clave

- **Fuente de evidencia**: archivo recibido, conservado sin sobrescritura para las nuevas capturas de este flujo.
- **Propuesta de escaneo**: bordes, giro y mejora visual que todavía se pueden revisar o descartar.
- **Página preparada**: copia aceptada y trazable destinada a lectura, con su orden y relación con la fuente.
- **Versión de preparación**: conjunto inmutable de decisiones/páginas que gobierna una revisión y sus reintentos.
- **Diagnóstico de calidad**: señales y advertencias, no una certificación de exactitud del contenido.
- **Presentación del estado de respuesta**: color, etiqueta e icono derivados de su estado vigente; no es otra calificación ni otro dato académico almacenado.
- **Ubicación de respuesta**: referencia opcional y revisable a una o varias zonas de la evidencia concreta de una pregunta; identifica hoja y versión, sin sustituir la fotografía ni certificar exactitud de lectura.
- **Vista de acercamiento**: estado temporal de ampliación/desplazamiento para revisar la evidencia; no es un nuevo recorte académico ni una modificación del archivo.

## Criterios de éxito

- **SC-001**: En el banco de30 fotos sintéticas anotadas, todas las preparaciones aceptadas conservan el100% de las marcas pertinentes de referencia; cualquier pérdida conocida impide liberar ese perfil de mejora.
- **SC-002**: En al menos el90% de la submuestra previamente definida de hojas planas completas y legibles, la propuesta conserva todos los márgenes anotados sin corrección manual; el resto ofrece revisión/foto completa, sin falsos éxitos. Se publica tamaño y composición de esa submuestra.
- **SC-003**: Todos los intentos ensayados de cancelación, cambio de contexto y reintento conservan identidad y páginas correctas, con cero calificaciones o archivos persistentes duplicados.
- **SC-004**: En nuevas entregas procesadas, el100% de las fuentes/derivados se verifica contra su registro; ningún rol no autorizado o enlace familiar recibe el original privado. Versiones y entregas anteriores conservan sus datos.
- **SC-005**: En los dispositivos de referencia documentados, al menos el95% de las vistas previas cálidas termina en3s o menos; la carga fría se mide aparte. Todo agotamiento del límite de espera ofrece continuar sin escaneo, sin perder la foto.
- **SC-006**: Los recorridos completos funcionan en360/390/768/1440, ambos temas, texto ampliado y horizontal; se prueba además un iPhone y un Android físicos, sin controles inaccesibles o contenido oculto.
- **SC-007**: Un paquete de diez hojas puede prepararse y entregarse en orden sin decodificarlas todas simultáneamente; el modo local no añade llamadas a IA y la ayuda opcional respeta FR-027. Todos los evaluadores de su ejecución utilizan la misma preparación registrada.
- **SC-008**: Antes de declarar mejora de lectura/calificación se dispone de un informe por pares con errores de transcripción, conservación de marcas y, cuando se autoricen esas llamadas, discrepancias de calificación y tiempo respecto a referencia humana; sin ese experimento solo se declara preparación/conservación verificadas.
- **SC-009**: En la matriz de estados de respuestas, el100% de botones/tarjetas conserva el tono y etiqueta previstos al seleccionar, navegar y cambiar de tema/tamaño; avisos individuales prevalecen, ningún caso ilegible/incompleto se convierte en error por falta de datos, y el recorrido produce cero escrituras o cambios de nota/estado/permisos.
- **SC-010**: En el banco sintético con zonas de referencia conocidas, cada pregunta con ubicación válida muestra su zona y todas sus continuaciones disponibles; ningún caso inválido/desactualizado muestra un señalamiento sobre otra evidencia. Los casos sin ubicación permiten hoja completa y zoom manual. Seleccionar/ampliar produce cero escrituras académicas o llamadas adicionales a IA, conserva el puntaje en edición y supera los recorridos móvil/escritorio de SC-006. Este criterio verifica asociación y geometría, no acredita por sí solo la precisión de ubicaciones propuestas por un modelo.

- **SC-011**: En360/390px, horizontal y1440px, las cuatro esquinas son visibles simultáneamente al encajar una hoja vertical u horizontal; no hay desbordamiento horizontal del diálogo. Las propuestas nuevas retienen todas las zonas anotadas en el banco congelado, sin rebajar SC-001/002 ni considerar la reducción de fondo prueba de mejora de calificación. La prueba física Android/iPhone se registra por separado.

## Supuestos

- Ampliación directa2026-10-27: se autoriza una nueva fase de hasta15 llamadas a la API, incluidos errores, rechazos y reintentos. Las tres llamadas iniciales y la llamada Android anterior permanecen agotadas en sus registros; no se reinician. Presupuesto compartido y durable previo a cada llamada nueva, solo fotografías sin identificadores, respuestas guardadas antes del análisis. Se usarán únicamente las llamadas necesarias, sin cambios de notas, evidencias o configuración productiva.

- Prueba física ampliada autorizada el2026-10-27: «si que llame a api necesito que quede para porbar como real». Se añade una única llamada nueva para una foto Android declarada sin datos personales, separada de las tres llamadas anteriores agotadas. Solo esquinas, sin reintento, nota, evidencia guardada o configuración productiva. Enlace privado temporal30min y presupuesto reservado antes de invocar; errores o acuses inciertos también consumen el único intento. La página estática ordinaria permanece sin API; esta excepción de laboratorio se identifica expresamente al docente y exige confirmar que la hoja no contiene nombres ni otros identificadores.

- Autorización adicional2026-10-27: el usuario permite una comprobación con imagen artificial y pide preferir DeepSeek V4.1 Flash, o un modelo visual disponible, mencionando también MiMo2.6. Se conserva el máximo total de tres llamadas: la verificación cuenta como una; solo un modelo que la supere recibe después copias anónimas. Perfil experimental explícito según documentación, no modificación/bypass del catálogo, verificación o routing de producción. Ante fallo incierto no se repite la llamada.

- Ampliación aprobada mediante «asi es aprove» el2026-10-27: probar MiMo visual para proponer esquinas cuando la detección local se abstiene, conservar ajuste/aceptación y ofrecer etapa configurable en administración. Presupuesto independiente: máximo tres llamadas de prueba, incluidos fallos, sobre las tres copias locales ya anonimizadas; sin reintentos, cambios de producción o acceso a otras evidencias. La autorización previa de cero inferencias describe el experimento local anterior, no invalida ni amplía este nuevo presupuesto. Ninguna precisión o latencia de MiMo se considera comprobada antes de medirla.

- La petición inicial autorizó inspección y diseño. El usuario indicó después «adelante», pidió señalización verde/amarillo/rojo y añadió acercamiento a la evidencia; el2026-10-27 aprobó continuar con «adelate aprove». Se registra autorización de implementación y el issue276; tareas y análisis siguen siendo puertas previas al código. No implica autorización de evidencias reales, llamadas a IA, fusión o producción.
- Ampliación expresa del2026-10-27: autorizó usar fotografías reales anonimizadas y preferir copias locales disponibles. Se limita esta comprobación a tres copias revisadas sin identificadores, eliminación de metadatos y preparación/visualización local; cero inferencias externas, cambios de notas o evidencias productivas. No reutilizar las autorizaciones históricas de proveedores como presupuesto de IA de este experimento ni equiparar fotos de teléfono con una prueba física interactiva actual.
- Primera integración de escaneo: calificar desde materia y cambiar evidencia del docente, que ya usan el selector común. El modo salón/lotes heredados conservan sus contratos; su migración al escáner sería una extensión posterior explícita. El acercamiento de lectura sí se ofrece sobre la evidencia autorizada disponible en el desglose, incluidas páginas de PDF existentes, sin preparar de nuevo esos archivos.
- No se pretende clonar la marca o la interfaz de CamScanner: se adopta el flujo de captura/revisión/recorte geométrico.
- Se conserva una representación color natural y otra de lectura suave, no una colección de filtros. Descurvado de libros, eliminación de manos, reconstrucción generativa, reconocimiento de nombres para asignar estudiante y soporte universal de HEIC quedan fuera.
- El giro, la perspectiva, la iluminación y la compresión sí cambian píxeles; la garantía buscada es conservar el contenido observado y mantener la fuente verificable, no afirmar igualdad píxel a píxel.

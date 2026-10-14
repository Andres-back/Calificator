# Especificación: escribir evaluaciones sin saturación en celular

**Rama**: `codex/097-escritura-docente-movil` | **Creada**: 2026-10-13 | **Estado**: Alcance/plan aprobados; revisión autorizada antes de implementar | **Issue**: [#204](https://github.com/Andres-back/Calificator/issues/204)

El usuario aclaró que sucede prácticamente igual en Android y aprobó «perfecto adelante» después de explicar el plan y solicitar aprobación/revisión de requisitos. Autoriza implementar; no fusionar ni desplegar. No proporcionó captura física, por lo que la validación de dispositivo real seguirá diferenciada de la emulación.

Solicitud: «Mejoremos el UI para celular, ya que entré en iPhone y se ve como saturado cuando voy a escribir». Por el contexto del PR #203, se acota a preparar y revisar evaluaciones con IA y su formulario manual. No se rediseña toda la aplicación ni se cambia la calificación. La demo y los registros deben conservarse.

## Escenarios de usuario y pruebas

### Historia 1 - Escribir cómodamente en el teléfono (Prioridad: P1)

Como docente, quiero escribir el tema o una pregunta sin que títulos, ayudas y botones compitan con el teclado por el espacio disponible.

**Razón de prioridad**: El docente reportó incomodidad real en iPhone; adaptar solamente el ancho no asegura una escritura cómoda.

**Prueba independiente**: Abrir el creador sin activar automáticamente el teclado, enfocar el tema y escribir con espacio visible reducido; terminar de escribir y recuperar las opciones sin perder texto.

**Aceptación**:
1. **Dado** un celular, **cuando** abre el creador, **entonces** ve una pantalla compacta y el teclado no se abre antes de tocar un campo.
2. **Dado** un campo editable enfocado, **cuando** comienza a escribir, **entonces** el campo y su etiqueta son alcanzables sin cabecera, acciones o ayudas superpuestas; la cabecera se reduce a lo esencial.
3. **Dado** texto en edición, **cuando** pulsa «Listo» o cierra el teclado, **entonces** conserva el texto y recupera las opciones normales sin generar ni guardar por esa acción.
4. **Dado** preguntas o rúbrica en revisión, **cuando** edita una respuesta, enunciado o peso, **entonces** conserva la posición y no se reemplaza el control enfocado durante la escritura.

### Historia 2 - Encontrar opciones sin recorrer un formulario saturado (Prioridad: P1)

Como docente, quiero ver primero lo indispensable y abrir ajustes, criterios y ayudas solo cuando los necesite, manteniendo mi control de la evaluación.

**Razón de prioridad**: Ocultar navegación innecesaria debe facilitar el trabajo, no eliminar opciones o revisión humana.

**Prueba independiente**: Preparar una evaluación en papel, desplegar criterios y personalización, plegarlos y verificar que se conserva el contenido y su resumen.

**Aceptación**:
1. **Dado** una materia seleccionada, **cuando** abre el formulario, **entonces** el contexto se muestra de forma breve sin pedir nuevamente grado/área.
2. **Dado** ajustes opcionales configurados, **cuando** los pliega, **entonces** mantiene las elecciones y puede consultarlas desde un resumen compacto.
3. **Dado** creación manual, **cuando** agrega o edita preguntas/respuestas, **entonces** los controles «Agregar» y eliminar son legibles, alcanzables y no parten palabras.
4. **Dado** un error que impide continuar, **cuando** intenta la acción correspondiente, **entonces** ve un aviso sencillo y puede llegar al campo que necesita corregir aunque esté plegado.

### Historia 3 - Volver a usar el formulario sin perder trabajo (Prioridad: P2)

Como docente, quiero continuar el mismo borrador después de girar el teléfono o terminar de escribir, sin perder preguntas, criterios ni cambios locales.

**Razón de prioridad**: La mejora visual debe proteger el contenido y la versión estable de demo.

**Prueba independiente**: Cambiar orientación, cerrar/abrir teclado y volver a preparar/revisar un borrador sintético; comprobar contenido, permisos y ausencia de escrituras inesperadas.

**Aceptación**:
1. **Dado** una edición en curso, **cuando** cambia orientación o el espacio visible, **entonces** conserva texto, selección, preguntas, criterios y estado.
2. **Dado** un guardado o generación pendiente/fallida, **cuando** termina de escribir o pliega opciones, **entonces** conserva el trabajo, ve el estado y no duplica solicitudes.
3. **Dado** un computador, **cuando** abre los mismos flujos, **entonces** conserva la funcionalidad y no entra involuntariamente en el modo compacto de escritura.

### Casos límite

- Safari y aplicación instalada en iPhone, Chrome y aplicación instalada en Android: probar espacios visibles reducidos sin afirmar que la emulación sea un teclado físico.
- Teclado externo, zoom de accesibilidad y barras del navegador: no confundirlos con un cambio de materia/etapa ni bloquear zoom o scroll.
- Altura visible pequeña o apaisado: priorizar el campo activo y permitir desplazamiento; nunca comprimir botones por debajo del tamaño táctil.
- Abrir manual/editar evaluación publicada: preservar estado, advertencias relevantes y guardado explícito; no recalificar ni perder preguntas.
- Borrador previo con opciones activas: plegar no desmarca criterios ni borra material, texto pendiente de agregar, respuestas o pesos.
- Error en una sección plegada o conflicto de versión: mostrar acceso a corrección, sin ocultar bloqueos ni sobrescribir.
- Foco y accesibilidad: cerrar, terminar escritura y volver deben ser operables; no perder selección/cursor por reemplazar el campo.
- Falta de información sobre espacio visible: mantener un formulario usable con desplazamiento normal, sin bloquear la escritura.

## Requisitos

### Requisitos funcionales

- **FR-001**: Los formularios de creación/revisión de IA y creación/edición manual DEBEN priorizar escritura en celular, conservando dos etapas de IA y métodos existentes.
- **FR-002**: Abrir estos formularios en celular NO DEBE activar el teclado por enfoque automático de un campo de texto; el docente decide cuándo escribir.
- **FR-003**: Durante la escritura móvil, la cabecera DEBE ser compacta, el campo enfocado y su etiqueta alcanzables, y los elementos secundarios no deben taparlos.
- **FR-004**: El formulario DEBE adaptarse al espacio realmente visible al abrir/cerrar teclado o girar el teléfono, con un desplazamiento principal y acciones alcanzables, sin desbordamiento horizontal.
- **FR-005**: «Listo» DEBE finalizar la escritura sin generar, guardar, publicar ni descartar texto; el contexto normal vuelve al terminar de editar.
- **FR-006**: Contexto, títulos y ayudas redundantes DEBEN reducirse; criterios, rúbrica, referencia y ajustes opcionales siguen disponibles bajo secciones desplegables con resumen de elecciones.
- **FR-007**: Pliegues, orientación y cambios de espacio DEBEN conservar texto, cursor/selección mientras se escribe, valores pendientes, preguntas, respuestas, criterios, pesos y borradores existentes.
- **FR-008**: Errores críticos y estados pendientes/fallidos DEBEN seguir siendo comprensibles y accesibles, con una acción que localice el campo a corregir cuando sea necesario.
- **FR-009**: Textos y controles DEBEN ser legibles, con objetivos táctiles de al menos 44 × 44; botones como «Agregar» no deben dividir palabras ni perder su contexto accesible.
- **FR-010**: El computador, permisos, conflictos de versión, documentos y reglas de guardado/publicación DEBEN conservar el funcionamiento actual; no afectar formularios ajenos a este alcance.
- **FR-011**: El ajuste NO DEBE cambiar notas, evidencias, alumnos, claves, proveedores, criterios académicos, fórmulas ni contenido persistido por navegar, enfocar o plegar; cero llamadas IA por esos gestos.
- **FR-012**: La implementación DEBE esperar aprobación del alcance/plan y revisión de requisitos; fusión/producción requieren CI verde y autorización independiente. Las pruebas visuales usan datos sintéticos.

### Entidades clave

- **Edición en curso**: campo activo y contenido del borrador actual, sin una evaluación adicional.
- **Evaluación y criterios**: preguntas, respuestas, pesos, referencias, estado y versión existentes que deben conservarse.
- **Presentación móvil**: estado visual transitorio de escritura/opciones; no altera datos académicos.

## Criterios de éxito

- **SC-001**: En los recorridos móviles de apertura probados, ningún campo textual queda enfocado automáticamente antes de la acción del docente.
- **SC-002**: Con ancho 360/390 y altura visible de al menos 300, el control activo y su etiqueta son alcanzables, sin superposición; el área de texto conserva al menos 72 píxeles de alto y los controles táctiles al menos 44 × 44.
- **SC-003**: El 100 % de las combinaciones probadas de escribir/terminar/plegar/girar conserva texto y ajustes; «Listo» produce cero escrituras remotas y cero generación IA.
- **SC-004**: En 360/390 y 768/1280/1440, ambos temas, no hay desbordamiento horizontal y permanece un desplazamiento principal operable. Los errores permiten abrir y alcanzar su corrección.
- **SC-005**: Los recorridos existentes de guardar mismo ID, publicar por separado, recuperar borradores y consultar documentos conservan permisos y contenido; consultar/escribir localmente no modifica notas ni evidencias.
- **SC-006**: La validación distingue expresamente simulaciones de espacio reducido de la comprobación en un teléfono real; se solicita una captura o prueba real del docente para verificar su caso específico.

## Supuestos

- Por el contexto inmediato, se comienza con crear/editar evaluaciones, no con todos los módulos de la aplicación. El usuario aclaró que sucede prácticamente igual en Android; no se recibió captura física.
- Un modo visual de escritura es transitorio: no introduce nuevas etapas obligatorias ni decide cómo calificar.
- Safari/aplicación instalada y Android deben conservar soporte, zoom y navegación; escritorio no debe perder su organización actual.
- Los formularios manuales reutilizan las reglas actuales; no se rediseñan interpretación de imágenes, generación ni formularios de administración.
- Alcance/plan y revisión de requisitos fueron autorizados por «perfecto adelante». Fusión/despliegue requieren autorización independiente y CI verde.

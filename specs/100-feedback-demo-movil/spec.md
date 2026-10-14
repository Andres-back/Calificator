# Especificación: retroalimentación legible y demo en el celular

**Rama**: `codex/100-feedback-demo-movil` | **Creada**: 2026-10-14 | **Estado**: Alcance/plan aprobados; acceso directo simplificado confirmado con «si adelante» | **Issue**: [#209](https://github.com/Andres-back/Calificator/issues/209)

Evolución de 008-calificaciones y 002-arquitectura-roles-seguridad. Complementa 099 sin sustituir permisos, navegación, guardado ni revisión. Impresión 098 fuera de alcance. Clarificación aprobada: basta un acceso directo; botón «Añadir al inicio», guía manual, sin extensión ni controlador de instalación automática. Esta aclaración sustituye las referencias originales a «Descargar demo»/oferta nativa en la historia 3.

## Escenarios de usuario y pruebas

### Historia 1 - Leer y editar la retroalimentación cómodamente (Prioridad: P1)

El docente necesita leer toda la retroalimentación sin un recuadro diminuto y editarla cuando corresponda, tanto en celular como en computador.

**Razón de prioridad**: El texto actual obliga a desplazarse dentro de cuatro líneas y dificulta revisar lo que recibirá el estudiante.

**Prueba independiente**: Abrir un mensaje largo; leerlo completo con el desplazamiento habitual de la página, editarlo y conservar el borrador hasta guardar o descartar explícitamente.

**Aceptación**:
1. **Dado** un mensaje largo, **cuando** se abre Retroalimentación, **entonces** se muestra íntegro, con párrafos legibles y sin una caja pequeña con desplazamiento propio.
2. **Dado** un docente autorizado, **cuando** selecciona Editar, **entonces** dispone de un editor que crece con el contenido y conserva las protecciones de cambios sin guardar.
3. **Dado** un usuario sin permiso de edición, **cuando** consulta la sección, **entonces** no puede modificar ni guardar el mensaje.
4. **Dado** un borrador con aviso de revisión provisional, **cuando** se muestra o edita, **entonces** no se elimina ni se reescribe su contenido automáticamente.

### Historia 2 - Entender la nota y ajustar puntajes sin confusión (Prioridad: P1)

El docente debe distinguir la propuesta de la IA, el cálculo por respuestas y una decisión confirmada. Los puntajes no necesitan ceros decorativos, pero sí toda su precisión real.

**Razón de prioridad**: Dos números distintos sin explicar preguntas pendientes pueden interpretarse como dos notas oficiales.

**Prueba independiente**: Mostrar una propuesta 2.5 y un cálculo 1.85 con dos respuestas sin puntaje; abrir un puntaje 0.6250 sin modificarlo.

**Aceptación**:
1. **Dado** un desglose con respuestas sin puntuar, **cuando** se muestra el cálculo, **entonces** se identifica como provisional y se indica cuántas preguntas o criterios faltan por puntuar; no se presenta como nota final.
2. **Dado** una propuesta global diferente del desglose, **cuando** no hay decisión docente, **entonces** ambos valores se identifican sin atribuir el desacuerdo a una decisión inexistente.
3. **Dado** un puntaje 0.0000, 0.7000 o 0.6250, **cuando** se abre su edición, **entonces** se ve 0, 0.7 o 0.625 respectivamente, sin cambio académico ni borrador sucio por abrirlo.
4. **Dado** un máximo real 0.625, **cuando** se edita, **entonces** ese límite se comunica y aplica sin redondearlo a un máximo distinto.
5. **Dado** una respuesta con cero y otra sin puntaje, **cuando** se explica el cálculo, **entonces** se distingue cero evaluado de información pendiente.

### Historia 3 - Encontrar la demo desde la pantalla de inicio (Prioridad: P2)

Profesores y estudiantes quieren un botón «Añadir al inicio» con pasos para crear un acceso directo al programa, sin buscar la dirección cada vez.

**Razón de prioridad**: Facilitar el regreso al programa sin añadir pasos a los flujos académicos.

**Prueba independiente**: Abrir el botón desde inicio, acceso y menú de cuenta; consultar pasos de Android/iPhone y cerrar sin cambiar sesión o datos.

**Aceptación**:
1. **Dado** un visitante o usuario en navegador, **cuando** busca la demo, **entonces** encuentra el botón en inicio/acceso y, si inició sesión, en su menú de cuenta.
2. **Dado** un Android, **cuando** toca el botón, **entonces** recibe pasos del menú de Chrome para Agregar a pantalla principal o Instalar si aparece; puede cerrar la ayuda sin cambiar sesión o datos.
3. **Dado** un iPhone, **cuando** toca el botón, **entonces** recibe pasos de Safari para Compartir y Agregar a inicio; puede cambiar entre ambas guías y no recibe una descarga ficticia.
4. **Dado** que abrió la app desde su icono, **cuando** entra, **entonces** se respeta su sesión y su rol; sin sesión vigente se solicita acceso normal.
5. **Dado** que está usando la app instalada, **cuando** navega, **entonces** no se insiste en instalarla otra vez.

### Casos límite

- Texto vacío, muy largo, con saltos de línea o caracteres especiales: lectura fiel, estado vacío comprensible y sin interpretar contenido como instrucciones o formato ejecutable.
- Error al guardar, borrador pendiente, cambio de estudiante o sección y descarte: no perder cambios en silencio; conservar guardas y recuperación actuales.
- Desglose incompleto con todos los puntajes presentes: advertir revisión pendiente sin afirmar que faltan cero respuestas; sin desglose no inventar cálculo.
- Nota confirmada distinta del cálculo: conservar la decisión y el historial; no sustituirla por un valor provisional.
- Ayuda cerrada, opción de añadir no disponible, navegador integrado o falta de conexión: orientación recuperable, sin bloqueo ni instalación automática.
- Consultar instrucciones no acredita instalación. Fuera de la app instalada no siempre se conoce una instalación previa.
- Pantallas de 360 px, teclado abierto, orientación horizontal y escritorio: controles alcanzables sin desbordamiento ni barras que tapen el editor.

## Requisitos

### Requisitos funcionales

- **FR-001**: Mostrar la retroalimentación completa como lectura cómoda por defecto, con separación de párrafos y desplazamiento normal de la página.
- **FR-002**: Permitir edición explícita solo a usuarios autorizados, con editor creciente y preservación de guardado, error y protección de borradores actuales; descartar requiere una acción explícita.
- **FR-003**: Identificar el cálculo incompleto como provisional, distinguir puntaje cero de ausente y comunicar pendientes sin inventar notas ni causas.
- **FR-004**: Distinguir propuesta de IA, cálculo por respuestas y nota confirmada, conservando reglas de cálculo, decisiones y trazabilidad existentes.
- **FR-005**: Quitar únicamente ceros decimales redundantes de los puntajes editables, sin pérdida de precisión, cambio por apertura ni desplazamiento del cursor mientras se escribe; comunicar el máximo real.
- **FR-006**: Ofrecer «Añadir al inicio» en inicio y acceso, y dentro del menú de cuenta para todos los roles, sin nueva sección lateral ni distraer de iniciar sesión.
- **FR-007**: Mostrar guía para agregar al inicio en iPhone y Android, cerrar de forma segura y orientar ante navegador integrado u opción ausente, sin iniciar instalación automática.
- **FR-008**: Conservar sesión, permisos, ruta de entrada y nombre/icono de XCalificator al abrir desde inicio; no insistir en instalar mientras se usa la app instalada ni afirmar instalación sin evidencia.
- **FR-009**: Mantener interfaz accesible en celular y computador, ambos temas, con controles táctiles de al menos 44 px, lectura sin desbordamiento horizontal y teclado sin controles superpuestos.
- **FR-010**: No modificar notas, respuestas, evidencias, contraseñas ni contenido guardado por consultar o instalar; no generar nueva retroalimentación, recalificar ni prometer funcionamiento sin internet.

### Entidades clave

- **Retroalimentación**: texto guardado y borrador docente, sujeto a permisos y guardado explícito existentes.
- **Explicación de nota**: propuesta, desglose, pendientes y decisión docente, sin una segunda nota oficial.
- **Puntaje**: valor y máximo exactos; presentación sin ceros redundantes no altera su significado.
- **Acceso desde inicio**: disponibilidad de instalación, ayuda, cancelación y detección disponible de uso instalado; no contiene datos académicos ni credenciales.

## Criterios de éxito

- **SC-001**: Un mensaje de 2000 caracteres se lee completo sin desplazamiento dentro de una caja pequeña en 360, 390 y 1440 px; editar requiere como máximo una activación desde la sección.
- **SC-002**: Los escenarios de desglose completo, incompleto, cero evaluado y nota confirmada identifican correctamente cada valor y sus pendientes, sin atribuciones docentes inexistentes.
- **SC-003**: Abrir puntajes 0.0000, 0.7000 y 0.6250 conserva el 100 % de su valor y no produce guardado ni cambios pendientes por sí solo.
- **SC-004**: Desde cada entrada prevista, una activación muestra la guía; cerrarla no cambia sesión, rol ni datos. No se insiste en añadir desde la app instalada.
- **SC-005**: Cero mutaciones académicas, de evidencia o credenciales como resultado de consultar, cambiar a lectura o usar la ayuda de instalación.

## Supuestos

- «Añadir al inicio» guía al acceso directo web; sin extensión, archivo Android, tienda ni nueva capacidad de instalación automática.
- Se requiere conexión para los flujos actuales. No se incorpora trabajo sin conexión ni se cambia la política de actualización de la app.
- La disponibilidad de instalación depende del navegador; siempre habrá una alternativa de ayuda sin prometer soporte universal.
- La fase demo exige cambio acotado, CI verde y autorización separada antes de fusionar/desplegar. No se usan pruebas con estudiantes reales para este ajuste visual.

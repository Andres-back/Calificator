# Especificación: recursos docentes fáciles de encontrar y revisar

**Rama**: `codex/106-recursos-vista-clara` | **Creada**: 2026-10-18 | **Estado**: Aprobada para implementación | **Issue**: [#220](https://github.com/Andres-back/Calificator/issues/220)

Evolución de 006 (recursos) y su listado dentro de materias (003). El usuario aprobó spec/plan y revisión de requisitos para continuar con implementación. No autoriza fusionar ni desplegar.

Línea base local sintética: a 390×844 px, primera tarjeta en Y=1141, cuerpo de guía en Y=1160 y editor fuera de pantalla al pulsar Editar. Ocho acciones preceden al material y varios botones miden 40 px. No son mediciones de docentes ni de producción.

## Escenarios de usuario y pruebas

### Historia 1 - Encontrar y abrir (Prioridad: P1)

Como profesor desde el celular, quiero encontrar materiales por nombre, materia o tipo y abrirlos sin atravesar contadores y explicaciones repetidas.

**Razón de prioridad**: reducir desplazamiento y evitar que Editar parezca la única manera de ver el recurso.

**Prueba independiente**: localizar un material entre seis, combinar filtros, abrirlo y volver conservando contexto.

**Aceptación**:
1. **Dada** la biblioteca con recursos, **cuando** entra sin filtros, **entonces** ve búsqueda y título/Ver recurso de la primera tarjeta en la primera pantalla móvil de referencia; resúmenes y ayudas quedan desplegables.
2. **Dadas** materias y tipos, **cuando** combina búsqueda/filtros o los limpia, **entonces** la lista y cantidad corresponden a la selección; cero coincidencias no se presenta como biblioteca vacía.
3. **Dada** una tarjeta, **cuando** pulsa Ver recurso, **entonces** abre lectura sin editar/asignar y al volver conserva origen y filtros válidos de esa cuenta.

### Historia 2 - Leer antes de decidir (Prioridad: P1)

Como profesor, quiero contenido protagonista, estado comprensible y acciones autorizadas fáciles de encontrar.

**Razón de prioridad**: revisar pedagógicamente el material precede a editarlo, asignarlo o imprimirlo.

**Prueba independiente**: abrir guía, cuento, lectura e interactivo, consultar criterios y opciones de descarga sin cambiar datos.

**Aceptación**:
1. **Dado** un recurso sin incidencias bloqueantes, **cuando** lo abre, **entonces** ve título, estado y comienzo del contenido en la primera pantalla; criterios y ayudas secundarios siguen consultables sin expandirse por defecto.
2. **Dadas** acciones disponibles, **cuando** las consulta, **entonces** encuentra Editar, Asignar/Abrir actividad y Descargar según permiso, sin duplicados; duplicar, compartir, eliminar y gestión ocasional quedan en Más. Eliminar exige confirmación separada.
3. **Dado** Descargar, **cuando** elige documento para estudiantes o solucionario docente, **entonces** distingue cuál abrirá; las soluciones solo se ofrecen al autor autorizado. La impresión no incorpora controles administrativos ni soluciones por una selección accidental.
4. **Dado** un material asignado, **cuando** consulta su estado, **entonces** distingue apoyo visible/oculto y actividad visible/oculta, además de entregas abiertas/cerradas. Origen IA no implica que algo publicado siga en borrador.

### Historia 3 - Editar sin perderse (Prioridad: P1)

Como profesor, quiero llegar al editor al pulsar Editar, disponer de espacio para escribir y guardar/cancelar sin perder cambios por accidente.

**Razón de prioridad**: un editor fuera de pantalla parece un botón que no responde; perder cambios obliga a repetir trabajo.

**Prueba independiente**: editar título/contenido/criterios, reducir espacio visible, simular error de guardado y cancelar con/sin cambios.

**Aceptación**:
1. **Dado** Editar contenido/criterios, **cuando** lo activa, **entonces** el editor/sección queda visible con foco predecible, sin abrir teclado antes de elegir un campo.
2. **Dados** cambios locales, **cuando** escribe, cambia tamaño o falla guardar, **entonces** conserva valores y llega a Guardar/Cancelar sin controles superpuestos al campo activo.
3. **Dados** cambios sin guardar, **cuando** cancela o navega dentro de la app, **entonces** puede continuar o descartar explícitamente; recargar/cerrar utiliza la advertencia disponible del navegador. Sin cambios no exige confirmación. Otra cuenta no recibe el borrador anterior.

### Historia 4 - Acciones coherentes y accesibles (Prioridad: P2)

Como profesor, quiero los mismos nombres y acciones coherentes en biblioteca y Recursos de la materia, sin botones que no puedo usar.

**Prueba independiente**: comparar autor, docente de solo lectura y estudiante con ejemplos autorizados; recorrer ambos temas y tamaños.

**Aceptación**:
1. **Dado** acceso de solo lectura, material ajeno o estudiante, **cuando** abre enlaces directos/menús, **entonces** no ve modificación ni solucionario que no le correspondan; los errores de autorización no simulan éxito.
2. **Dado** móvil o escritorio, **cuando** usa contenido, menús y edición, **entonces** tiene controles de al menos 44×44 px, entradas móviles de 16 px, nombres/foco accesibles y ningún campo tapado ni scroll horizontal de página.

### Casos límite

- Biblioteca vacía, cero coincidencias y error: mensajes distintos, limpiar/reintentar sin perder filtros. Recursos históricos sin materia aparecen bajo Sin materia.
- Títulos/textos extensos, tablas, imágenes, cuadrículas y mapas: aprovechar ancho, scroll local identificado cuando corresponda; no desbordamiento de página ni recorte de información.
- Material incompleto o criterios que necesitan corrección: conservar avisos útiles; no esconder alertas bloqueantes para cumplir una meta visual.
- Alias de relacionar pares, formatos históricos y enlaces existentes: conservar acceso, contenido e identidad aunque cambie la etiqueta visual.
- Abrir menús, lectura o filtros: nunca publicar, retirar, convertir, duplicar ni repetir operaciones.
- Guardado en curso, doble toque o conexión incierta: no duplicar envío ni afirmar éxito antes de aceptación; conservar cambios ante error.
- Salida hacia acción ocasional con edición pendiente: resolver descarte antes de compartir/asignar/eliminar; no ejecutar la acción al cancelar el descarte.
- Cambio de cuenta, recurso retirado o permiso revocado: no exponer el borrador anterior, bloquear acciones no autorizadas y mostrar un error comprensible.

## Requisitos

### Requisitos funcionales

- **FR-001**: La biblioteca DEBE priorizar búsqueda y tarjetas; contadores/explicaciones secundarios DEBEN ser desplegables sin impedir encontrar recursos.
- **FR-002**: DEBE combinar búsqueda por título/materia/tipo con filtros explícitos por materia y tipo, limpiar filtros y distinguir carga, error, vacío y cero coincidencias, conservando formatos históricos y Sin materia. Si el listado es parcial, DEBE indicarlo y permitir cargar más sin duplicar recursos; no anunciar búsqueda global sobre datos aún no cargados.
- **FR-003**: Cada tarjeta DEBE ofrecer Ver recurso explícito, identidad, materia y estado; Asignar/Abrir actividad y Más según permisos. Abrir o filtrar NO DEBE modificar contenido ni asociaciones.
- **FR-004**: El detalle DEBE priorizar lectura con cabecera compacta y acciones jerarquizadas; criterios, ayuda y origen IA consultables sin saturar la portada. Las alertas que requieren acción NO DEBEN ocultarse.
- **FR-005**: Descargar DEBE diferenciar PDF para estudiantes y solucionario docente, conservar impresión y no ofrecer soluciones sin autorización de autor. Abrir menús NO DEBE iniciar descargas ni escrituras.
- **FR-006**: Biblioteca, detalle y materia DEBEN usar Recursos y estados coherentes sin confundir origen IA, publicación y recepción; rutas/vínculos previos DEBEN seguir funcionando.
- **FR-007**: Editar contenido/criterios DEBE llevar a la sección correspondiente con foco predecible sin forzar teclado; Guardar/Cancelar DEBEN ser accesibles durante la escritura.
- **FR-008**: Editar DEBE conservar valores/selección al cambiar tamaño o fallar guardado, advertir antes de descartar cambios y evitar envíos duplicados; sin cambios no exige confirmación. Otra cuenta NO DEBE ver ni apropiarse del borrador anterior.
- **FR-009**: La interfaz DEBE ofrecer solo acciones autorizadas según permiso, autoría y estado, incluidos enlaces directos y visibilidad. Ocultar botones NO sustituye la autorización existente en servidor.
- **FR-010**: Los recorridos DEBEN funcionar desde 360 px y escritorio, claro/oscuro y teclado, con controles 44×44 px, entradas móviles 16 px y sin superposición ni scroll horizontal de página; formatos anchos admiten scroll local identificado.
- **FR-011**: Volver DEBE conservar origen biblioteca/materia y filtros válidos para la cuenta actual, sin guardar contenido sensible en enlaces ni conceder acceso nuevo.
- **FR-012**: El cambio DEBE limitarse a frontend y pruebas: NO modificar generación/IA, contratos públicos, permisos del servidor, notas, evidencias, criterios, contenido ni asociaciones mediante acciones visuales. Las escrituras explícitas conservan operaciones actuales. Cualquier defecto backend DEBE informarse y acordarse por separado.

### Entidades clave

- **Recurso existente**: identidad, tipo, contenido, autor, materia y publicación, sin alterar su ciclo de vida.
- **Contexto de biblioteca**: búsqueda, materia/tipo, resultados y origen de una cuenta; sin contenido pedagógico ni credenciales.
- **Estado de visualización**: lectura, opciones o edición; independiente de publicación/asignación.
- **Borrador local de edición**: valores originales/actuales, sección activa, cambios pendientes y resultado de guardado; aislado por cuenta/recurso.
- **Acción disponible**: permiso, autoría, estado y propósito; no concede autorización nueva.

## Criterios de éxito

- **SC-001**: Con seis recursos, títulos de hasta 80 caracteres y sin alertas bloqueantes, en 360×800 y 390×844 se ven búsqueda y título/Ver recurso de la primera tarjeta sin desplazarse; en detalle se ve el comienzo del material en la primera pantalla. Alertas críticas conservan prioridad aunque excedan esa altura.
- **SC-002**: Desde tarjeta se abre lectura con una pulsación; desde detalle se elige PDF para estudiantes/solucionario en máximo dos pulsaciones, sin entrar a editar.
- **SC-003**: Editar deja visible el destino y accesible Guardar/Cancelar; altura reducida, errores y descarte no pierden cambios sin confirmación, salvo cierre forzado fuera del control de la app.
- **SC-004**: Biblioteca, materia, detalle, menús y edición verificados en dos motores, 360/390/1440 px, ambos temas y teclado; controles del alcance de 44×44 px sin desbordamiento de página ni campos tapados.
- **SC-005**: El 100 % de pruebas de acciones visuales conserva contenido, asociaciones y notas; permisos no ofrecen modificación/solucionario a quien no corresponda y reintentos no simulan éxito ni duplican operaciones.
- **SC-006**: Comparación antes/después de desplazamiento, pulsaciones y pérdida de contexto con el mismo conjunto sintético. El ahorro real de tiempo docente requiere medición posterior en aula y no se da por demostrado con estas pruebas.

## Supuestos

- Se reorganizan biblioteca y lectura/edición docente; no se rediseñan generador, juegos ni vista estudiantil. Se preservan y prueban como regresión.
- Filtros sobre el conjunto autorizado disponible, sin nuevos servicios ni búsqueda global de estudiantes.
- No se promete recuperación tras cierre forzado: conservación local durante sesión y protección de navegación/recarga normal, sin persistir contenido en almacenamiento compartido entre cuentas.
- Datos sintéticos y, si corresponde, base aislada para documentos/permisos; sin datos reales, IA pagada, VPS ni cambios en producción.
- Revisión local como línea base visual, no demostración de eficacia docente ni auditoría integral de seguridad. Backend solo diagnóstico de lectura.
- Especificación/plan y revisión de requisitos aprobados en este chat. Sin autorización de fusión o despliegue.

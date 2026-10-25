# Especificación: selección de cámaras e iconos administrativos

**Rama**: `codex/103-camaras-iconos-admin` | **Creada**: 2026-10-17 | **Estado**: Cámaras e iconos aprobados por el usuario el 2026-10-17 | **Issue**: [#214](https://github.com/Andres-back/Calificator/issues/214)

## Escenarios de usuario y pruebas

### Historia 1 - Elegir la cámara que sirve para fotografiar la hoja (Prioridad: P1)

Como docente con varias cámaras, quiero escoger la integrada, USB u otra disponible y cambiarla viendo cuál está activa, sin perder las fotos preparadas ni enviar una entrega por accidente.

**Razón de prioridad**: la captura integrada actual elige una cámara automáticamente, pero no permite escoger entre dispositivos.
**Prueba independiente**: elegir entre tres cámaras simuladas, capturar y revisar una foto, cancelar/reabrir y conservar la elección mientras permanezca la vista abierta; no se envía ninguna entrega.

**Aceptación**:
1. **Dado** permiso de cámara y varias cámaras autorizadas, **cuando** se abre la captura, **entonces** aparece «Cámara» con nombres comprensibles y la cámara activa identificada; sin nombre proporcionado se muestra «Cámara 1», «Cámara 2», etc.
2. **Dado** vídeo activo, **cuando** se selecciona otra cámara, **entonces** se apaga la anterior antes de iniciar la nueva y se bloquea tomar la foto hasta que el nuevo vídeo esté listo.
3. **Dado** cambios rápidos o cierre mientras se concede permiso, **cuando** termina una solicitud antigua, **entonces** su cámara se apaga sin reemplazar ni apagar la selección vigente.
4. **Dado** una cámara retirada o ocupada, **cuando** no puede iniciarse, **entonces** se informa de forma sencilla y se puede actualizar la lista, elegir otra o subir archivos, sin borrar hojas.
5. **Dado** una foto capturada para revisar, **cuando** está pendiente aceptar/repetir, **entonces** no se cambia la cámara ni se pierde esa foto por una actualización de dispositivos.

### Historia 2 - Reconocer las secciones de administración (Prioridad: P2)

Como administrador, quiero iconos ilustrados coherentes con XCalificator en Inicio, Usuarios, Roles y Correo, tanto en el menú como al entrar a sus pantallas.

**Razón de prioridad**: estas entradas usan símbolos genéricos mientras otras secciones ya tienen ilustraciones personalizadas.
**Prueba independiente**: recorrer administración con datos sintéticos en celular y escritorio; comprobar ilustración correspondiente, rótulos y permisos sin editar usuarios/configuración.

**Aceptación**:
1. **Dado** acceso administrativo, **cuando** se muestran Inicio, Usuarios, Roles y Correo, **entonces** tienen ilustraciones acordes con su función, conservando texto y navegación.
2. **Dado** la pantalla Usuarios, Roles o Correo, **cuando** se abre, **entonces** cabecera y navegación usan la misma identidad visual sin incrementar innecesariamente el alto del contenido.
3. **Dado** un usuario sin permiso para una sección, **cuando** se actualizan los iconos, **entonces** la sección sigue oculta/restringida y no obtiene nuevas funciones.

### Casos límite

- Sin permiso, sin cámara, una sola cámara o navegador que no permite listar todas: explicar o simplificar el control; mantener subida alternativa y no prometer acceso a dispositivos no autorizados.
- Conectar/desconectar una cámara: actualizar cuando el navegador lo permita; siempre ofrecer «Actualizar cámaras». No iniciar automáticamente otra cámara mientras se revisa una foto.
- Cámara elegida ausente al reabrir: ofrecer otra/default con decisión explícita y recuperación; no insistir indefinidamente en la ausente.
- Selección/permiso antiguo termina después de cambio, cancelación, envío, segundo plano o cambio de estudiante: no añadir fotos a otro contexto ni dejar cámaras encendidas.
- No registrar ni enviar identificadores/nombres de dispositivos fuera de la vista de captura. No solicitar micrófono.
- Un asset no carga: conservar un fallback legible y el texto; nunca dejar navegación inutilizable.
- Tema oscuro, ancho 360 px y nombres de cámara largos: controles accesibles, sin desbordamiento horizontal ni iconos con fondo blanco.

## Requisitos

### Requisitos funcionales

- **FR-001**: El docente DEBE poder seleccionar y cambiar entre las cámaras autorizadas disponibles; la lista DEBE identificar claramente la cámara activa y usar nombres alternativos si faltan etiquetas.
- **FR-002**: Al cambiar cámara el sistema DEBE apagar la anterior, bloquear captura mientras prepara vídeo y descartar resultados obsoletos sin afectar la cámara nueva.
- **FR-003**: La lista DEBE poder actualizarse manualmente y reaccionar a conexión/desconexión cuando haya soporte; errores DEBEN permitir elegir otra cámara o subir archivos sin perder hojas.
- **FR-004**: La elección DEBE conservarse mientras siga abierta la vista que prepara entregas, sin persistir identificadores en la cuenta, archivos, almacenamiento del navegador ni servidor; los permisos de vídeo y limpieza de la captura actual se conservan sin solicitar audio.
- **FR-005**: Revisar/repetir/aceptar, calidad, límites, orden, reemplazo y envío explícito DEBEN conservarse. Elegir cámara o aceptar foto NO DEBE calificar ni cambiar notas/evidencias guardadas.
- **FR-006**: Inicio, Usuarios, Roles y Correo DEBEN tener ilustraciones semánticas coherentes en el menú administrativo; Usuarios, Roles y Correo DEBEN identificarse igualmente en sus cabeceras. Se conservan rótulos, rutas y permisos.
- **FR-007**: Usuarios, Roles y Correo DEBEN disponer de tres ilustraciones específicas sin fondo, legibles sobre tema claro/oscuro y con recuperación si falla su carga; Inicio y secciones ya ilustradas reutilizan sus assets. Los iconos pequeños de editar, eliminar, buscar y estados se conservan.
- **FR-008**: Ambos incrementos DEBEN funcionar desde 360 px hasta escritorio con controles de al menos 44 × 44 px, foco/teclado accesibles, mensajes sencillos y sin saturar la pantalla ni cambiar funciones administrativas.
- **FR-009**: Se DEBE documentar la solicitud adicional de Xali docente contextual y visual en [su propuesta](./propuesta-xali-docente.md) y el issue #215, distinguiendo expresamente especificación de implementación; no cambia el bot en esta entrega.

### Entidades clave

- **Cámara disponible**: identidad efímera, nombre visible y disponibilidad autorizada en el dispositivo; no es un registro académico.
- **Preferencia de captura**: cámara elegida mientras vive la vista de preparación; termina al abandonarla y no pertenece al estudiante.
- **Identidad visual administrativa**: sección, ilustración local, rótulo existente y fallback; no concede permisos.

## Criterios de éxito

- **SC-001**: Con tres cámaras simuladas, todas pueden seleccionarse y producir una foto revisable; cambios rápidos, cancelación y desconexión dejan cero cámaras antiguas activas y cero entregas enviadas automáticamente.
- **SC-002**: Casos de ninguna/una/varias cámaras, permiso denegado y nombres vacíos terminan en control comprensible o recuperación; no pierden hojas existentes ni identificadores se guardan fuera de la vista.
- **SC-003**: Las cuatro entradas administrativas indicadas y las tres cabeceras usan ilustraciones correctas; no hay imágenes rotas ni rectángulos blancos sobre claro/oscuro.
- **SC-004**: En 360, 390 y 1440 px se puede cambiar cámara y recorrer administración sin desbordamiento horizontal; los permisos, operaciones y registros académicos permanecen intactos.

## Supuestos

- Evolución [127-camara-nativa-movil](../127-camara-nativa-movil/spec.md), issue #268: la selección de webcams de este incremento se conserva en PC, incluso con ventana estrecha; móvil prioriza cámara del dispositivo. No modifica ilustraciones administrativas ni Xali.

- Evolución de Spec 102 para captura y del sistema ilustrado existente; no incluye la digitalización visual pendiente de Spec 101 ni cambios de IA, datos o backend.
- Se usan solo las cámaras que el navegador autorice; no se instala aplicación nativa ni se promete acceso universal a todos los dispositivos del sistema.
- Se crean tres iconos nuevos para cuentas de todas las edades, permisos y correo; no se reutiliza una imagen de alumnos, IA o reclamos como si significara estas funciones.
- Se conserva iconografía funcional pequeña. No se transforma cada control administrativo en una ilustración ni se amplía a todas las pantallas del programa.
- Pruebas con cámaras/datos sintéticos; emulación no equivale a prueba física de hardware Android/iPhone/USB.
- El usuario aprobó spec, plan y revisión de requisitos de cámaras e iconos el 2026-10-17. El merge/despliegue de este nuevo alcance no está autorizado todavía.
- La petición adicional «mete la especificación» de Xali se documenta en el issue #215 sin ampliar la implementación aprobada de captura/administración. Requiere diseño y aprobación propios antes de cambiar el bot.

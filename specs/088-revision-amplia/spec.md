# Especificación: espacio de revisión docente amplio y compacto

**Rama**: `codex/088-revision-amplia` | **Creada**: 2026-10-06 | **Estado**: Implementado y validado localmente; pendiente de CI completo y revisión del PR | **Issue**: [#182](https://github.com/Andres-back/Calificator/issues/182)

## Escenarios de usuario y pruebas

### Historia 1 - Encontrar y cambiar de estudiante sin estrechez (Prioridad: P1)

Como docente, quiero una lista con nombres y notas legibles y cambiar de alumno aunque haya desplazado su revisión hasta abajo.

**Razón de prioridad**: La lista estrecha dificulta reconocer alumnos; desplazar toda la página para alternar revisiones añade trabajo.

**Prueba independiente**: En un examen de 30 alumnos ficticios a 1366×768, buscar un nombre largo, abrir su nota, llegar al final del detalle y seleccionar otro alumno sin regresar al inicio de la página.

**Aceptación**:

1. **Dado** un escritorio amplio y una nota abierta, **cuando** se consulta la lista, **entonces** nombre completo, estado, nota y selección son legibles sin comprimir el nombre en un espacio mínimo.
2. **Dado** un detalle desplazado, **cuando** se busca o cambia de alumno, **entonces** la lista sigue accesible y desplazarla no mueve el detalle por accidente.
3. **Dado** un nombre compuesto o largo, **cuando** se presenta, **entonces** puede ocupar varias líneas y consultarse completo sin ocultar la nota ni generar desplazamiento horizontal.
4. **Dado** búsqueda, filtro, selección múltiple o paginación, **cuando** cambia la distribución, **entonces** se conservan resultados, contadores, selección y acceso a los siguientes alumnos.

### Historia 2 - Dedicar pantalla a la revisión, no a cabeceras (Prioridad: P1)

Como docente, quiero reconocer materia, evaluación y alumno con una cabecera breve, reservando espacio para nota, evidencia y respuestas.

**Razón de prioridad**: Las cabeceras apiladas y grandes márgenes obligan a desplazarse antes de empezar a revisar.

**Prueba independiente**: Abrir el mismo examen en 1366×768 y 1920×1080: nota y estado visibles al entrar y acceso a todos los detalles y acciones existentes.

**Aceptación**:

1. **Dado** un contexto seleccionado, **cuando** se revisa, **entonces** materia y evaluación son identificables sin volver a elegirlas ni repetir tarjetas introductorias.
2. **Dado** un detalle abierto, **cuando** se consulta, **entonces** aparecen primero nota y estado; los avisos comprensibles y detalles progresivos permanecen disponibles.
3. **Dado** un escritorio amplio, **cuando** se distribuye el espacio, **entonces** se aprovecha el ancho disponible del módulo sin estrechar la lista para mantener márgenes decorativos.
4. **Dado** un detalle largo, **cuando** se desplaza, **entonces** el alumno activo sigue identificable y las acciones finales son alcanzables sin quedar tapadas.

### Historia 3 - Conservar facilidad en celular y seguridad de edición (Prioridad: P1)

Como docente que alterna celular y computador, quiero una vista apropiada al espacio disponible y conservar mis cambios sin guardar.

**Razón de prioridad**: Ensanchar escritorio no debe comprimir dos columnas en celular ni perder borradores.

**Prueba independiente**: En celular abrir lista, nota, evidencia y edición de puntaje; cambiar de alumno con borrador y comprobar protección y retorno contextual.

**Aceptación**:

1. **Dado** espacio insuficiente para dos paneles legibles, **cuando** se abre una nota, **entonces** se muestra lista o detalle a la vez, con regreso claro al grupo.
2. **Dado** una edición pendiente, **cuando** se sale o cambia de alumno, **entonces** se conserva la protección existente; no se descarta ni guarda automáticamente.
3. **Dado** teclado, rueda o gesto táctil, **cuando** se revisa, **entonces** todos los controles son alcanzables sin trampas de foco o desplazamiento.

### Casos límite

- Cero, uno, 30 y 100 alumnos: conservar vacío, búsqueda, filtros y paginación; no inventar filas o notas.
- Nombres largos, tildes y avisos extensos: envolver texto sin perder identidad, controles o nota.
- Zoom 200 %, teclado móvil, altura reducida y orientación horizontal: adaptar la vista, no forzar dos paneles comprimidos.
- Error de consulta, carga, trabajo en segundo plano o evidencia ausente: conservar estados y recuperación; un fallo no equivale a lista vacía.
- Cero real y calificación pendiente: conservar su significado; ausencia de nota no equivale a cero.
- Ajuste abierto, conflicto de versión o refresco: conservar borrador y protección frente a sobrescritura.
- Usuario lector y estudiante: no añadir funciones ni acceso docente.
- Temporizador, trabajos o publicación grupal: mantener acceso sin superponerlos a búsqueda, nombres o controles finales.

## Requisitos

### Requisitos funcionales

- **FR-001**: La revisión DEBE aprovechar el ancho disponible en pantallas amplias, sin cambiar la distribución de módulos ajenos.
- **FR-002**: La lista DEBE reservar espacio legible para nombre completo, estado, nota y selección; no exigir desplazamiento horizontal para identificar alumnos o usar filtros.
- **FR-003**: En la vista de dos paneles, lista y detalle DEBEN desplazarse independientemente, manteniendo acceso a búsqueda durante una revisión larga.
- **FR-004**: La cabecera DEBE reunir contexto y acciones con menos altura, conservando materia, evaluación, alumno, regreso al grupo y funciones por permiso.
- **FR-005**: Nota, estado, avisos y detalles progresivos DEBEN conservarse; compactar no oculta bloqueos, cálculo, criterios, evidencia, puntajes, retroalimentación o historial.
- **FR-006**: Con espacio insuficiente, la vista DEBE mostrar lista o detalle con retorno claro, sin comprimir ambos; controles de al menos 44×44 px y desplazamiento completo en claro/oscuro.
- **FR-007**: Búsqueda, paginación, filtros, selección, navegación, ajustes, confirmación y publicación DEBEN conservar permisos, estados y protección de borradores.
- **FR-008**: El cambio NO DEBE modificar notas, criterios, evidencias, registros, procesamiento, modelos o reglas de calificación. Consultar y desplazar no recalifican ni publican.
- **FR-009**: La validación DEBE cubrir cinco tamaños, ambos temas, listas sintéticas grandes, nombres largos, lectura sin mutaciones, foco, controles finales y recuperación del desplazamiento.

### Entidades clave

- **Lista del examen**: alumnos ya matriculados, identidad, estado, nota opcional, alertas, contadores y paginación existentes; sin nuevas inscripciones.
- **Revisión activa**: alumno y calificación seleccionados, evidencia, puntajes, criterios y retroalimentación existentes; la identidad no cambia al desplazar.
- **Borrador de ajuste**: edición no guardada y protegida frente a navegación o conflictos; redistribuir no la convierte en nota oficial.

## Criterios de éxito

- **SC-001**: A 1366×768 y 1920×1080 con detalle abierto, la lista dispone de al menos 320 px de ancho; los nombres completos siguen consultables sin desplazamiento horizontal.
- **SC-002**: A 1366×768 con 30 alumnos, nombres de hasta 40 caracteres y sin avisos extraordinarios de carga/error, aparecen al menos cinco filas completas al iniciar. Las cabeceras del módulo previas a los paneles ocupan como máximo 112 px, excluyendo la barra global.
- **SC-003**: Tras llegar a la última respuesta de veinte preguntas, se puede buscar y seleccionar otro alumno sin desplazar la página al inicio; el alumno activo sigue identificable y el borrador protegido.
- **SC-004**: En 360×800, 390×844, 768×1024, 1366×768 y 1920×1080, claro/oscuro, no hay desbordamiento horizontal ni controles de revisión inaccesibles por solapamiento; teclado y regreso funcionan.
- **SC-005**: Abrir, buscar y desplazar no cambian notas, confirmaciones o publicaciones; guardar ajustes conserva los controles vigentes y registros anteriores.

## Supuestos

- Prioridad: distribución del espacio, no volver a modificar el contenido de los avisos recién mejorados.
- La navegación lateral general continúa disponible. La expansión se limita a revisión, no es rediseño global.
- Dos paneles se usan solo cuando ambos sean legibles; en celular y pantallas estrechas se mantiene una vista a la vez.
- El dominio responsable sigue siendo calificaciones. No se crean rutas, usuarios, datos académicos ni llamadas adicionales a IA.
- Las listas de 30/100 y nombres largos serán sintéticas; no se necesitan notas productivas para comprobar distribución.
- Alcance y plan aprobados por el usuario el 2026-10-06 mediante «APRUEBO» en turnos separados; revisión de checklist autorizada mediante «AUTORIZO» y completada 10/10 antes de implementar. Autorización posterior «FUSION» para fusionar el PR #183 y verificar el despliegue automático solo con todos los controles verdes.

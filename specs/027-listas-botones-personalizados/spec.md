# Especificación de funcionalidad: Listas y botones personalizados

**Rama**: `codex/027-listas-botones-personalizados`

**Issue**: [#55](https://github.com/Andres-back/Calificator/issues/55)

**Creado**: 2026-08-30

**Estado**: Aprobado

**Entrada**: “Revisa cómo podemos mejorar las listas y los botones para personalizar todo el programa”.

## Escenarios de usuario y pruebas

### Historia 1 - Jerarquía clara de acciones (Prioridad: P1)

Como profesor quiero reconocer inmediatamente qué acción es principal en cada elemento y encontrar las opciones menos frecuentes sin enfrentar una fila saturada de botones.

**Por qué es prioritaria**: Las listas de recursos concentran acciones de edición, asignación, descarga, duplicación y eliminación; ordenar esa jerarquía reduce errores y carga visual sin cambiar capacidades.

**Prueba independiente**: Abrir Recursos, identificar la acción principal de cada tarjeta y acceder a todas las acciones actuales desde la tarjeta o su menú contextual.

**Escenarios de aceptación**:

1. **Dado** un recurso sin asignar, **cuando** el profesor consulta su tarjeta, **entonces** ve `Asignar` como acción principal, `Editar` como acción secundaria y descarga, duplicación y eliminación dentro de un menú claramente identificado.
2. **Dado** un recurso vinculado a una evaluación, **cuando** el profesor consulta su tarjeta, **entonces** la acción principal conserva el acceso actual a la evaluación y ninguna capacidad desaparece.
3. **Dado** un menú de acciones abierto, **cuando** el profesor usa Escape, selecciona una opción o pulsa fuera, **entonces** el menú se cierra sin ejecutar acciones adicionales.

---

### Historia 2 - Colecciones reconocibles y filtrables (Prioridad: P2)

Como usuario quiero que las listas compartan una estructura visual reconocible para comprender el tipo, estado, contexto y acciones de cada elemento sin reaprender cada pantalla.

**Por qué es prioritaria**: Actualmente cada módulo construye manualmente sus filtros y tarjetas, lo que produce diferencias de densidad, espaciado y orden.

**Prueba independiente**: Usar la barra de colección de Recursos para buscar y filtrar, comprobando que el resultado, el total y los estados vacíos se entienden en modo claro y oscuro.

**Escenarios de aceptación**:

1. **Dado** un conjunto de recursos, **cuando** el usuario escribe una búsqueda o selecciona una categoría, **entonces** la colección se actualiza localmente y muestra la cantidad resultante.
2. **Dado** que ningún recurso coincide, **cuando** se aplica un filtro, **entonces** aparece un estado vacío específico que permite limpiar la búsqueda o cambiar la categoría.
3. **Dado** cualquier tarjeta de recurso, **cuando** se visualiza, **entonces** conserva icono contextual, tipo, estado, materia, título y fecha sin duplicar información.

---

### Historia 3 - Uso inclusivo en celular y teclado (Prioridad: P3)

Como usuario en celular o con navegación por teclado quiero operar listas y acciones sin recortes, objetivos pequeños ni controles que dependan solo del color o del puntero.

**Por qué es prioritaria**: La personalización no puede deteriorar el acceso desde 360 px ni la experiencia de personas mayores.

**Prueba independiente**: Recorrer la colección piloto a 360×800 y 390×844, en modo claro y oscuro, usando toque y teclado.

**Escenarios de aceptación**:

1. **Dado** un ancho de 360 px, **cuando** se recorre Recursos, **entonces** no existe desplazamiento horizontal y las acciones mantienen al menos 44 px de objetivo táctil.
2. **Dado** un usuario de teclado, **cuando** abre el menú de acciones, **entonces** el foco es visible y todas las opciones poseen nombres comprensibles.
3. **Dado** modo claro u oscuro, **cuando** se muestran acciones principales, secundarias, silenciosas o destructivas, **entonces** se distinguen por texto, icono y jerarquía además del color.

### Casos límite

- Títulos y nombres de materia extensos.
- Una colección con cero elementos o sin coincidencias tras combinar búsqueda y categoría.
- Un recurso antiguo con tipo no reconocido o sin materia asociada.
- Apertura de varios menús consecutivos; solo uno debe permanecer abierto.
- Cambio de tamaño o de tema con un menú abierto.
- Fallo al descargar, duplicar o eliminar; la tarjeta debe permanecer disponible y mostrar el estado de error existente.

## Requisitos

### Requisitos funcionales

- **FR-001**: La mejora DEBE conservar rutas, permisos, consultas, mutaciones, confirmaciones, descargas y destinos existentes.
- **FR-002**: Cada tarjeta de colección DEBE mostrar como máximo una acción principal y una acción secundaria de texto; las acciones menos frecuentes DEBEN agruparse en un menú contextual.
- **FR-003**: El menú contextual DEBE cerrar al seleccionar una opción, pulsar Escape o interactuar fuera, y DEBE conservar nombres accesibles en cada acción.
- **FR-004**: Los botones compartidos DEBEN expresar las intenciones principal, secundaria, silenciosa y destructiva con estados normal, hover, foco, activo, carga y deshabilitado.
- **FR-005**: Los controles únicamente iconográficos DEBEN usar una primitiva compartida con objetivo mínimo de 44 px, nombre accesible y ayuda textual cuando el significado no sea evidente.
- **FR-006**: El botón grande del asistente de evaluaciones DEBE integrarse en el botón compartido sin cambiar textos, orden, estados de carga ni validaciones del asistente.
- **FR-007**: La barra de colección DEBE ofrecer búsqueda, filtros segmentados, cantidad de resultados y una acción opcional sin duplicar controles propios de la página.
- **FR-008**: La colección piloto de Recursos DEBE permitir buscar por título, materia o tipo y combinar la búsqueda con las categorías existentes.
- **FR-009**: Las tarjetas de Recursos DEBEN conservar icono educativo, etiquetas, materia, título, fecha y todas las acciones actuales.
- **FR-010**: Los estados de carga, colección vacía, filtro sin resultados y error DEBEN ser visibles, específicos y accionables cuando exista una recuperación posible.
- **FR-011**: La estructura compartida DEBE funcionar desde 360 px hasta escritorio, en modo claro y oscuro, sin desbordamiento horizontal.
- **FR-012**: Los iconos ilustrados DEBEN identificar entidades o tipos; las acciones universales como editar, descargar, duplicar y eliminar DEBEN conservar símbolos convencionales.
- **FR-013**: Este incremento DEBE limitar la migración visual de colecciones a Recursos; las demás pantallas conservarán su comportamiento hasta una migración posterior basada en las mismas primitivas.
- **FR-014**: No se añadirán dependencias de ejecución ni cambios de backend, base de datos o contratos públicos.

## Criterios de éxito

### Resultados medibles

- **SC-001**: Cada tarjeta de Recursos presenta como máximo dos botones de texto visibles y un único acceso a acciones adicionales.
- **SC-002**: El 100 % de las acciones existentes de Recursos sigue siendo alcanzable y produce el mismo destino o mutación que antes.
- **SC-003**: A 360 px y 390 px no existe desbordamiento horizontal y todos los controles interactivos alcanzan al menos 44×44 px.
- **SC-004**: Búsqueda, categorías y limpieza de filtros actualizan el resultado de Recursos sin una solicitud adicional al servidor.
- **SC-005**: Los recorridos de teclado permiten abrir, recorrer, ejecutar y cerrar el menú contextual con foco visible.
- **SC-006**: Pruebas focalizadas, TypeScript, lint y build permanecen verdes; el recorrido crítico de creación, edición, asignación, descarga, duplicación y eliminación no cambia.

## Supuestos

- El sistema actual de iconografía educativa sigue siendo la fuente visual para identificar tipos de recurso.
- La primera entrega establece las primitivas compartidas y migra Recursos; otras colecciones se migrarán progresivamente para limitar el riesgo.
- La búsqueda es local porque el endpoint actual ya entrega la colección disponible al docente.
- Las acciones destructivas conservan el diálogo de confirmación existente.
- La aprobación “adelante” aplica al alcance y al plan propuestos inmediatamente antes de esta especificación.

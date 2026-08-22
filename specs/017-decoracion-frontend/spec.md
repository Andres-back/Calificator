# Especificación de funcionalidad: Decoración visual transversal

**Rama**: `codex/017-decoracion-frontend`

**Issue**: [#22](https://github.com/Andres-back/Calificator/issues/22)

**Creado**: 2026-08-21

**Estado**: Aprobado

**Entrada**: “Sin dañar funcionalidad y usando tu capacidad para generar imágenes y elementos decora el frontend”.

## Escenarios de usuario y pruebas

### Historia 1 - Orientación visual consistente (Prioridad: P1)

Como profesor o estudiante quiero reconocer inmediatamente dónde estoy y qué acción es principal, dentro de una experiencia visual atractiva que conserve los flujos que ya conozco.

**Por qué es prioritaria**: La decoración solo aporta valor si facilita la orientación y no compite con las tareas educativas.

**Prueba independiente**: Recorrer inicio, materias, evaluaciones, recursos, calificaciones y Xali con ambos roles, comprobando que títulos, acciones y contenido mantienen su orden y comportamiento.

**Escenarios de aceptación**:

1. **Dado** un usuario autenticado, **cuando** navega entre páginas de su rol, **entonces** percibe una ambientación coherente sin cambios en rutas, permisos ni acciones.
2. **Dado** un formulario o actividad existente, **cuando** el usuario interactúa con sus controles, **entonces** la decoración no los cubre, desplaza ni deshabilita.
3. **Dado** un estado vacío, de carga o de error, **cuando** aparece, **entonces** conserva un mensaje legible y una acción comprensible.

---

### Historia 2 - Experiencia inclusiva en cualquier pantalla (Prioridad: P2)

Como usuario en celular, tableta o escritorio quiero que los recursos decorativos se adapten al espacio disponible y mantengan una lectura cómoda en modo claro y oscuro.

**Por qué es prioritaria**: Gran parte del uso ocurre en celulares y la apariencia no puede introducir recortes, ruido ni sobrecarga.

**Prueba independiente**: Revisar las páginas representativas a 360×800, 390×844, 768×1024, 1366×768 y 1920×1080 en ambos temas.

**Escenarios de aceptación**:

1. **Dado** un ancho de 360 px, **cuando** se muestra cualquier recurso decorativo, **entonces** no existe desplazamiento horizontal ni controles inaccesibles.
2. **Dado** el modo oscuro, **cuando** se presenta texto sobre una superficie decorada, **entonces** conserva contraste suficiente y la ilustración permanece secundaria.
3. **Dado** que el usuario prefiere movimiento reducido, **cuando** abre o navega por la aplicación, **entonces** no recibe animaciones decorativas persistentes.

---

### Historia 3 - Identidad visual propia y ligera (Prioridad: P3)

Como miembro de la comunidad educativa quiero una interfaz reconocible como XCalificator, con ilustraciones originales y la mascota actual, sin aumentar de forma perceptible el tiempo de carga.

**Por qué es prioritaria**: Refuerza la confianza y la personalidad del producto sin sacrificar rendimiento.

**Prueba independiente**: Cargar la aplicación con caché vacía y confirmar que la imagen decorativa no contiene texto, marcas externas ni elementos que parezcan controles.

**Escenarios de aceptación**:

1. **Dado** el recurso ilustrado de marca, **cuando** se muestra detrás del contenido, **entonces** no contiene texto, logotipos externos ni información educativa susceptible de ser incorrecta.
2. **Dado** una conexión lenta, **cuando** el recurso aún no carga, **entonces** la página sigue siendo comprensible y completamente utilizable.

### Casos límite

- La imagen decorativa no carga o es bloqueada por el navegador.
- El texto del usuario aumenta a 200 %.
- La página contiene tablas, modales o visores de evidencia con gran altura.
- El usuario alterna entre modo claro y oscuro durante la navegación.
- El navegador solicita reducir movimiento o contraste adicional.

## Requisitos

### Requisitos funcionales

- **FR-001**: La mejora DEBE preservar todas las rutas, permisos, formularios, contratos y acciones existentes.
- **FR-002**: La aplicación DEBE utilizar una ambientación visual coherente con la identidad actual de XCalificator y su mascota.
- **FR-003**: Los recursos decorativos DEBEN permanecer fuera del árbol de interacción y no anunciarse como contenido a tecnologías de asistencia.
- **FR-004**: La decoración DEBE adaptarse a profesor y estudiante sin introducir capacidades cruzadas entre roles.
- **FR-005**: La experiencia DEBE conservar legibilidad y contraste en modo claro y oscuro.
- **FR-006**: La experiencia DEBE funcionar desde 360 px hasta escritorio sin desbordamiento horizontal causado por la decoración.
- **FR-007**: Las ilustraciones nuevas DEBEN ser originales, no contener texto ni marcas externas y funcionar como ambientación secundaria.
- **FR-008**: La aplicación DEBE seguir siendo completamente utilizable si una imagen decorativa no se carga.
- **FR-009**: La decoración DEBE respetar la preferencia de movimiento reducido.
- **FR-010**: Los recorridos críticos de ambos roles DEBEN conservar resultados visibles de carga, éxito, espera y error.
- **FR-011**: Todo control presentado visual y semánticamente como botón DEBE ejecutar una acción verificable, enviar un formulario o abrir una navegación válida.
- **FR-012**: Un elemento únicamente explicativo NO DEBE presentarse como botón; cuando la explicación corresponda a un flujo complejo, DEBE ofrecerse mediante una guía contextual.
- **FR-013**: Las guías contextuales de los flujos complejos DEBEN abrirse automáticamente en la primera visita de cada rol y versión, poder omitirse y volver a abrirse manualmente.
- **FR-014**: La aplicación DEBE conservar un registro local por rol, guía y versión para no repetir automáticamente una guía ya completada.

## Criterios de éxito

### Resultados medibles

- **SC-001**: El 100 % de los recorridos críticos revisados conserva el mismo destino y resultado funcional anterior al cambio.
- **SC-002**: No se detecta desplazamiento horizontal ni contenido cortado en las cinco resoluciones objetivo.
- **SC-003**: El 100 % de los textos y controles principales continúa siendo legible en modo claro y oscuro.
- **SC-004**: La interfaz sigue siendo utilizable cuando se bloquean las imágenes decorativas.
- **SC-005**: Todas las verificaciones automáticas de tipos, estilo, pruebas y construcción aplicables permanecen verdes.
- **SC-006**: La nueva imagen carece de texto, marcas externas y elementos que puedan confundirse con controles interactivos.
- **SC-007**: El 100 % de los botones inventariados tiene una acción, envío o navegación válida, y la auditoría automatizada no reporta controles sin propósito.
- **SC-008**: Cada guía existente de calificaciones se abre una sola vez en la primera visita por rol y versión, permanece omitible y puede abrirse manualmente después.

## Supuestos

- La identidad, logotipo y mascota actuales se mantienen; no se rediseña la marca.
- El alcance es exclusivamente visual y no incorpora nuevas capacidades de negocio.
- Se priorizan superficies compartidas y páginas de entrada para obtener consistencia sin modificar cada flujo individual.
- Los recursos existentes que ya cumplen su función permanecen disponibles.
- La solicitud del usuario autoriza el alcance conservador descrito y su implementación sin cambios funcionales.

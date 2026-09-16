# Especificación: corregir scroll y navegación

**Rama**: `codex/043-corregir-scroll-navegacion`
**Fecha**: 2026-09-16
**Estado**: hotfix aprobado por el usuario para PR, CI y producción.
**Issue**: [#86](https://github.com/Andres-back/Calificator/issues/86)
**Origen**: corrección transversal aprobada durante 042; se separa para no desplegar el módulo de criterios todavía incompleto.

## Escenarios de usuario y pruebas

### Historia 1: salir de revisión sin bloqueo (P1)

Como profesor quiero cerrar una revisión con un diálogo abierto y poder seguir navegando, sin recargar la página.

**Prueba independiente**: abrir revisión móvil, abrir después un diálogo y salir de ambos. El documento vuelve a desplazarse. Cerrar dos paneles en cualquier orden conserva el bloqueo solo mientras quede uno abierto.

### Historia 2: menú adaptable (P1)

Al navegar fuera de la barra lateral o pasar de celular a escritorio, el menú se cierra y el contenido vuelve a responder.

### Historia 3: respuestas con scroll natural (P2)

Como profesor quiero desplazar la revisión con la rueda sobre la guía de respuestas, sin buscar una zona fuera del recuadro.

### Casos límite

- Diálogo abierto después del panel, cierre en ambos órdenes y desmontaje simultáneo.
- Cambio de tamaño con el diálogo aún abierto; el bloqueo sigue hasta cerrarlo.
- Montajes repetidos, regreso a la ruta y estilos anteriores no vacíos.

## Requisitos funcionales

- **FR-001**: cerrar todos los paneles y diálogos restaura los estilos y la posición originales del documento, sin bloqueos residuales.
- **FR-002**: con paneles superpuestos, el documento permanece bloqueado hasta cerrar el último.
- **FR-003**: el menú móvil libera el contenido al cambiar de ruta o pasar a escritorio.
- **FR-004**: la rueda sobre la guía de respuestas desplaza la revisión principal sin un scroll anidado en esa guía.
- **FR-005**: el cambio no altera cálculo, procesamiento, persistencia ni publicación de notas y no incorpora trabajo pendiente de 042.
- **FR-006**: el foco inicial diferido de un diálogo no interrumpe la edición si el usuario ya ha enfocado un campo dentro de él.

## Resultados medibles

- **SC-001**: todos los casos de cierre y navegación de la regresión terminan con desplazamiento disponible sin recargar.
- **SC-002**: cero diálogos y cero bloqueos residuales al salir de la revisión.
- **SC-003**: la guía permite desplazar la revisión al menos 500 píxeles usando la rueda sobre las respuestas.

## Impacto, reproducción, causa y solución

Impacto: navegación móvil bloqueada y revisión docente difícil de desplazar. Reproducción: abrir el panel móvil, abrir después un diálogo y abandonar ambos. Causa: controles independientes restauraban estados intermedios de bloqueo; el menú no se cerraba al pasar a escritorio y la guía añadía un área desplazable innecesaria. Solución: coordinar el bloqueo, liberar menú y simplificar scroll de guía. La regresión usa componentes reales y estilos originales.

## Supuestos y límites

Se reutilizan interfaces existentes y no hay cambios de datos, APIs, proveedores de IA ni permisos. La aprobación humana de alcance y despliegue consta en esta conversación el 2026-09-16. La comprobación local en Chromium no acredita por sí sola todos los recorridos ni un iPhone físico. El despliegue requiere CI verde y merge por PR; no se hace push directo a main.

# Investigación: Decoración visual transversal

## Decisión 1: mejora progresiva

**Decisión**: Tratar imágenes y ornamentos como capas no interactivas, con colores base suficientes para que la aplicación funcione sin ellos.

**Razón**: Evita que una descarga lenta o bloqueada afecte lectura, navegación o formularios.

**Alternativas consideradas**: Convertir la imagen en contenido principal o fondo obligatorio; se descarta por rendimiento y accesibilidad.

## Decisión 2: recurso original único

**Decisión**: Generar una ilustración horizontal, sin texto ni logotipos, con motivos educativos abstractos y espacio negativo.

**Razón**: Refuerza identidad sin introducir afirmaciones educativas erróneas ni competir con títulos y controles.

**Alternativas consideradas**: Varias ilustraciones por módulo; se descarta por peso, mantenimiento y riesgo de saturación.

## Decisión 3: jerarquía antes que ornamentación

**Decisión**: Concentrar el detalle en fondos, bordes, sombras y cabeceras; mantener superficies de lectura limpias.

**Razón**: Los usuarios incluyen adultos mayores y estudiantes que necesitan objetivos táctiles claros y texto estable.

**Alternativas consideradas**: Decorar cada tarjeta y botón; se descarta porque reduce la señal de interacción.

## Decisión 4: compatibilidad de temas

**Decisión**: Usar el mismo recurso a baja opacidad con tratamiento de color distinto por tema y respaldarlo con gradientes semánticos.

**Razón**: Evita descargar dos archivos y mantiene continuidad entre claro y oscuro.

**Alternativas consideradas**: Dos imágenes independientes; se descarta por duplicar peso sin aportar funcionalidad.

## Decisión 5: controles con propósito verificable

**Decisión**: Analizar estáticamente todos los botones y enlaces TSX durante `npm run check`; un control debe ejecutar una acción, enviar un formulario o navegar a un destino válido.

**Razón**: Evita controles aparentes sin efecto y hace la verificación repetible en cada PR, sin depender exclusivamente de inspección manual.

**Alternativas consideradas**: Mantener una lista manual de botones; se descarta porque queda obsoleta al evolucionar el frontend.

## Decisión 6: explicación como recorrido de primera visita

**Decisión**: Reutilizar `GuidedTour` y abrirlo automáticamente una vez por rol, guía y versión, con reapertura manual posterior.

**Razón**: La ayuda explica sin fingir una acción de negocio y evita interrumpir repetidamente a usuarios frecuentes.

**Alternativas consideradas**: Botones explicativos permanentes sin estado o modales en cada visita; se descartan por ambigüedad y fricción.

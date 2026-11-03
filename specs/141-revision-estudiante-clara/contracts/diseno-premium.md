# Contrato visual: menos capas, mejor lectura

## Individual — diseño 3

1. Cabecera contextual única con regreso, evaluación y nombre. En móvil el nombre puede ocupar dos líneas; no repetir el bloque en la pestaña de comentario.
   En escritorio, el detalle comienza sin menú lateral ni lista de estudiantes. Se pueden mostrar u ocultar por separado desde la barra superior y la cabecera del estudiante, sin cambiar de ruta ni perder la selección. «Volver a lista» sigue siendo el regreso al grupo.
2. Nota y acceso al cálculo compactos; edición de nota sigue a mano, sin duplicar la fórmula en la pregunta.
3. Al abrir un estudiante, mostrar un mosaico de dos columnas con Respuestas y puntajes, Evidencia, Retroalimentación e Historial. Cada opción abre una vista exclusiva con «Volver a opciones» y devuelve el foco a su tarjeta al regresar. Conservar enlaces directos, protección de borradores y acceso cruzado entre respuesta y evidencia durante la edición. La nota y su cálculo se consultan en el mosaico; la gestión de hojas se encuentra en Evidencia. No insertar un segundo marco en el comentario.
4. Comentario en una superficie sin borde exterior redundante. Separaciones por espacio y divisores, tres títulos con icono y acento suave cuando la información fuente lo permite. Texto completo conservado; no usar un resumen automático.
5. Una zona de entrega: estado breve y generar/copiar según corresponda. En móvil la acción principal accesible sin desplazarse a extremos opuestos; no solapar la barra de nota ni el teclado. Editar/Imprimir son secundarios; vigencia, canales y gestión de acceso en menú contextual.

## Grupo — opción 1

Lista compacta con búsqueda, estado y selección. Es un contexto diferente del detalle; no incrustarla dentro de la pestaña individual. Panel derecho en escritorio y pie estable en móvil, con un botón principal según estado. Las filas no repiten comentarios extensos por defecto. La impresión sigue disponible como acción secundaria.

## Respuestas y evidencia

La pregunta activa se entiende por número, puntaje, respuesta/evidencia y porqué. En un panel ancho, el enunciado, las respuestas, la explicación y el ajuste quedan en la misma columna, al lado de un visor de evidencia más amplio. Con menos espacio, el visor pasa debajo; la distribución sigue el ancho disponible aunque se abran los paneles laterales. Máximo una ubicación para cada incidencia activa. Información técnica/histórica en Historial, no otro aviso repetido sobre la imagen. Navegación compacta, al menos cuatro columnas de preguntas en móvil cuando el ancho disponible lo permite, sin ocho botones altos en columna única.

En Evidencia, la hoja se muestra antes de los controles de ampliación y giro. Si solo hay una hoja no se muestra paginación. «Gestionar hojas» agrupa la entrada para añadir, quitar, ajustar y ordenar fotos; reemplazar el paquete y recalificar siguen como acciones secundarias. El editor de hojas es una tarea aparte a pantalla completa en móvil. No se confunde girar una vista con guardar un cambio que afectará la recalificación.

## Sistema de estilo

- Reutilizar tipografías, colores y estados del sistema UI del repositorio. No introducir una segunda identidad.
- Cuerpo de lectura móvil mínimo 16 px, interlineado mínimo 1,5; títulos 18–24 px según contexto, etiquetas secundarias menores solo para metadatos.
- Espaciado coherente en múltiplos de 4/8 px; padding móvil de lectura 16 px salvo bordes del viewport; ancho de lectura limitado en escritorio y espacio útil para evidencia/panel lateral.
- Objetivos táctiles de 44 px, foco visible y contraste en claro/oscuro. Color siempre acompañado de texto/icono cuando comunica prioridad o estado.
- Una acción primaria visible por tarea. Íconos decorativos pequeños, sin fondos impresos nuevos ni ilustraciones que compitan con comentarios.
- Sin tarjetas dentro de tarjetas para el mismo contenido, bordes por párrafo o ayudas abiertas por defecto. Sombra solo para menús/capas con una función real.
- Estados de carga, error, vacío y vencido usan una explicación corta y acción pertinente. No apariencia de éxito en operaciones pendientes.

## Validación

Maqueta sintética previa a código a 384 px y escritorio; después capturas de app real a 384/1440, claro/oscuro, y comprobaciones de 360/412 px, texto ampliado, teclado y desplazamiento desde el centro. No usar la maqueta como evidencia de funcionamiento ni incluir datos personales.

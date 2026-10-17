# Estado y datos propuestos

## Contexto docente

Usuario autenticado, rol efectivo, materia autorizada o NULL general, nombre/área/grado existentes y propietario real. No incluir alumnos, correos ni notas en ejemplos. Nombre/área/grado son hechos del servidor; no pueden ser sustituidos por instrucciones de la consulta o documentos.

## Conversación

Clave: usuario + materia o NULL. Historial existente conserva id/rol/mensaje/created_at. Nuevas respuestas pueden usar `metadata.xali_teacher_visual` para `{version:1, visuales, fuentes, avisos}` validado, sin alterar mensajes anteriores ni claves desconocidas de metadata. Solo el servidor compone fuentes a partir de recuperación autorizada. Las dos filas del intercambio se guardan atómicamente, con lock transaccional por contexto; un error no deja media respuesta.

## Sobre visual

Hasta cuatro elementos con `id`, `tipo`, `titulo` y `descripcion`. Tipos: tabla, grafico (barras/linea), plano y figura. Datos escalares y coordenadas finitos, campos extra rechazados, límites en [contrato](./contracts/chat-visual.md). No URLs, HTML/SVG, CSS/props, scripts o funciones del modelo.

## Estado de interacción

Inactivo → enviando → respondido o error conocido/resultado incierto. Cambio de cuenta/materia/desmontaje invalida la generación local y cierra visual ampliado; resultados tardíos conservan su contexto original, no el nuevo. Cancelar cliente no implica cancelar servidor. Conflicto de conversación activa permite esperar/consultar historial; no reenvío automático.

Visual válido → resumen ampliable → visor accesible → cerrar/restaurar foco. Visual inválido/desconocido → aviso humano + texto/tabla válida, sin ejecución ni llamada IA extra.

No hay migración, nuevos registros académicos ni reinterpretación masiva del historial guardado.

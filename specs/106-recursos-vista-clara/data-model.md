# Estados locales y entidades conservadas

No se añaden tablas, campos del servidor ni contratos públicos.

## Recurso existente

Identidad/tipo/título/contenido, materia, vínculo evaluativo, asignacion_tipo y publicado_estudiantes. Estado visual derivado de datos canónicos: Borrador, Apoyo visible/oculto o Actividad visible/oculta; recepción de entregas es independiente. Origen IA es metadato informativo, no estado de publicación. Toda transformación de presentación deja intacto contenido_json, criterios y respuestas.

## Contexto de biblioteca

Cuenta, origen interno validado, búsqueda, materia/tipo seleccionados, páginas cargadas y resultados. Sin materia es una selección explícita. Páginas se unen por ID; carga parcial/error no equivale a biblioteca vacía ni búsqueda global. Regresar restaura solo filtros/origen válidos para esa cuenta, nunca credenciales o contenido en la URL.

## Capacidades de presentación

Entrada: permisos efectivos, estado del material y resultado de autoría de la consulta existente de evaluaciones vinculadas. Autoría: comprobando, confirmada o no confirmada (denegación/error). Solo confirmada más permiso habilita acciones de autor. Una respuesta vieja o inválida no cambia el estado de una nueva cuenta/recurso. Roles por sí solos no conceden capacidades.

## Vista y borrador

Lectura → opciones/descargas (sin mutación), o editor explícito. Editor: original normalizado, actual, sección, dirty y guardando/error. Entrada a criterios elige su sección, no crea criterios. Dirty se deriva sin redondear puntajes ni reescribir contenido desconocido.

Transiciones:

- Abrir editor: copia fiel, encabezado enfocado, sin escritura ni teclado forzado.
- Escribir/redimensionar/Listo: conserva valores y selección; Listo no guarda.
- Guardar: una operación actual; fallo conserva actual/error y permite reintento explícito; éxito actualiza original/cachés y cierra con resultado visible.
- Cancelar/salir/acción ocasional: sin dirty continúa; con dirty espera continuar o descartar. Cancelar descarte no dispara acción pendiente.
- Cambiar cuenta/recurso o perder permiso: no reutilizar borrador ni respuestas tardías; no persistir contenido para otro usuario. Cierre forzado del navegador no ofrece recuperación garantizada.

La presentación de menús no cambia publicación, asignación, notas o evidencia; las operaciones explícitas preservan el ciclo de vida existente.

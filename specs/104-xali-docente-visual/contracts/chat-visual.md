# Contrato compatible del chat docente y representación

## HTTP y permisos

Conservar POST `/xali/chat` con mensaje/materia_id y respuesta `{respuesta:string,materia_id}`; GET/DELETE `/xali/history` conservan parámetros y campos. No añadir endpoint o campo público para esta fase. Docente propietario de materia o administrador según permisos existentes; flujo estudiantil usa sus endpoints/políticas actuales. General significa `materia_id IS NULL`, no todas las materias.

Antes de materiales/LLM: validar actor/materia. Historial y borrado se limitan al mismo usuario/contexto. Si ya hay generación activa, otro envío/borrado devuelve conflicto recuperable sin una segunda generación ni eliminación parcial. No exponer claves, prompts o fuentes ajenas en el error.

## Contenido visual reservado

La respuesta sigue siendo texto; puede contener un único bloque cercado con identificador `xcalificator-visual-v1` y un objeto JSON canónico `{version:1,visuales:[...]}`. El servidor lo valida y serializa, no reenvía sin filtrar el objeto del modelo. Solo respuestas del asistente docente se interpretan así. El historial se reconstruye desde metadata validada para ese usuario/contexto; mensajes sin metadata permanecen iguales. Un cliente antiguo conserva la explicación y bloque textual.

El lector docente separa explicación y bloque sin ejecutar nada; versión desconocida, JSON inválido/excesivo o estructura no admitida produce aviso y texto conservado. Nunca aplicar parser a todas las respuestas del estudiante ni a RichContent global. Los campos de fuente se componen desde registros autorizados del servidor, no del bloque creado por el modelo.

## Vocabulario y presupuestos

- Sobre: versión 1, hasta cuatro visuales, máximo 48 KB UTF-8 serializados. Un bloque como máximo, anidación acotada por esquema; sin campos extra.
- Todos: id único corto, titulo ≤100 caracteres, descripcion ≤500; etiquetas ≤80. Rechazar delimitadores de cercado y caracteres de control en etiquetas serializadas; texto siempre escapado por React.
- `tabla`: columnas (máximo 8), filas rectangulares (máximo 30), celdas escalares de hasta 200 caracteres o números finitos. Nada de objetos arbitrarios.
- `grafico`: subtipo barras/linea, etiquetas de dominio y hasta cuatro series de máximo 60 valores cada una, con igual longitud y unidades explícitas si se proporcionaron. Proporcionar tabla alternativa de los mismos datos.
- `plano`: dominios x/y crecientes, coordenadas finitas entre -1 000 000 y 1 000 000, máximo 60 puntos y cuatro segmentos/polilíneas de 60 puntos cada uno; rectas opcionales por pendiente/intercepto, calculadas en código propio. Ejes/origen y unidades uniformes. Sin funciones expresadas como código. Datos fuera de un dominio explícito se rechazan con alternativa; no ocultar puntos ni ampliar silenciosamente la escala solicitada.
- `figura`: hasta 40 primitivas de segmento/círculo/rectángulo/polígono/etiqueta; máximo 60 vértices por polígono, dimensiones/radios positivos y coordenadas finitas acotadas. Escala uniforme y unidades cuando existan; no afirmar que una medida ilustrada es exacta si no puede construirse.
- No aceptar URLs, SVG/HTML, scripts, CSS, props de librerías, funciones, NaN/Infinity o booleanos como números. Un visual inválido no invalida toda la explicación ni activa reparación automática de IA.

## Móvil, concurrencia y costes

Contexto visible; envío explícito y recuperación humana. Token local ligado a cuenta/materia; AbortSignal y guardas de vigencia en then/catch/finally, historial y borrado. Fallo incierto primero ofrece revisar historial original; un reenvío voluntario posterior es un envío nuevo, no promesa de exactly-once.

Visuales a ancho disponible sin límite artificial de burbuja al 80 %, ampliación por botón de 44 px, título/descripción accesibles, Escape y foco restaurado. Scroll de tabla/fórmula local; no scroll horizontal de página en 360/390/1440 px y ambos temas. Recursos gráficos lazy, cero generación al seleccionar/ampliar. No llamadas a imágenes generativas ni escrituras académicas.

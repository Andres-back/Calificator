# Modelo de presentación

No se añaden entidades persistentes ni migraciones. El recurso existente sigue siendo fuente de título, imagen y narración. Preguntas se proyectan en orden, con índice visible desde 1 y renglones calculados; no se cambia `numero` guardado.

El render de alumno puede usar en servidor metadatos existentes para elegir espacio, pero nunca serializa respuesta esperada ni justificación oculta al cliente. Preguntas antiguas sin metadatos usan tres renglones. Solucionario conserva contenido autorizado y no añade líneas de trabajo innecesarias.

La exportación no crea recursos ni modifica notas/evidencias. Si faltan imagen/preguntas, se omite la sección vacía sin llamar a IA.

La petición de cuento nuevo añade `moraleja` opcional (`automatico`, `con`, `sin`, predeterminado `automatico`); longitud admite `corto`, `medio`, `largo`. No hay migración. Solo una nueva generación valida estructura, repeticiones y paginación antes de ilustrar/persistir. Un fallo de imagen conserva `is_placeholder=true` sin URL/base64 de reserva como falsa ilustración.

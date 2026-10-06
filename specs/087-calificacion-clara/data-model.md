# Modelo de lectura: revisión docente

No se crean tablas, columnas, migraciones o estados persistidos.

## Calificación existente

Identidad: `cal.id`, estudiante, evaluación y materia. Nota vigente: `nota_confirmada` cuando existe, en otro caso `nota_sugerida`, mediante helper existente. Estado: `estado`; contexto de job en `resultado_json`. Timeline identifica ajustes previos cuando están registrados. La consulta no muta estas propiedades.

## Desglose existente

Identidad/versionado: `desglose.id`, `version`; componentes identificados por `id` y `clave`. Fórmula persistida distingue puntos, escala, nota base, ajuste global y nota final. Respuestas/criterios conservan puntajes, explicaciones y referencias de evidencia.

## Proyección de revisión (solo memoria de interfaz)

Clasificación individual actual: `safe`, `attention`, `blocked`; contadores describen respuestas o criterios, no exactitud académica. Bloqueos generales no se suman a preguntas inventadas.

Cada aviso de presentación conserva motivo original, mensaje en español, alcance (general/componente), destino de acción cuando existe y procedencia. Identidad por código/motivo y componente si lo hay; no agrupar avisos diferentes solo porque comparten texto genérico.

La proyección puede añadir campos internos a `ReviewTriageSummary`, manteniendo las propiedades consumidas por pruebas y callbacks actuales; no se incorpora al contrato HTTP. Históricos/desconocidos deben conservarse sin inferir resolución ni datos faltantes.

## Transiciones

No se añaden transiciones. Abrir/cerrar secciones y detalles técnicos cambia únicamente estado local. Ajustar, confirmar, publicar, reintentar o reemplazar usan las operaciones existentes y sus permisos. Borradores y conflictos de versión conservan protección. Un aviso mostrado no altera por sí solo el estado de la calificación.

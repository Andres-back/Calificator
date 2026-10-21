# Decisiones de diseño

## Original firmado frente a edición

**Decisión**: Conservar `responses` y agregar eventos administrativos. La interfaz distingue original y correcciones.
**Motivo**: El panel actual conserva constancias y hashes usados como evidencia metodológica. Actualizar el JSON invalidaría esa evidencia.
**Alternativas descartadas**: UPDATE del original; crear una nueva respuesta atribuida al docente; editar firma/consentimiento. No representan fielmente lo recibido.

## Eliminación

**Decisión**: Papelera reversible con confirmación por código y motivo. Supresión física fuera del botón.
**Motivo**: Permite corregir duplicados sin perder trazabilidad; no sustituye el procedimiento de custodia.
**Alternativa descartada**: Borrar en cascada respuestas y constancias desde la lista.

## Compatibilidad y validación

**Decisión**: Contexto original archivado y validación existente para preguntas. Identificación separada de la firma; mediciones históricas no editables en este alcance.
**Motivo**: Las versiones 4.0/5.0 y piloto tienen preguntas diferentes. Aplicar el formulario actual a una respuesta anterior causaría pérdidas o cambios de significado.
**Alternativa descartada**: Campo libre JSON o reinterpretar respuestas antiguas con el cuestionario vigente.

## Concurrencia y reintentos

**Decisión**: Comandos con identificador único y revisión esperada, dentro de una transacción SQLite. Conflictos explícitos, no último guardado gana.
**Motivo**: El servidor actual usa cuatro threads; dos pestañas o reintentos pueden operar a la vez.
**Alternativa descartada**: Deshabilitar únicamente el botón del navegador; no evita peticiones concurrentes.

## Informes

**Decisión**: Original activo como fuente del informe principal; exportación corregida aparte. Mostrar recibidas, activas y retiradas por versión.
**Motivo**: Mantener comparabilidad y evitar que una corrección del investigador se confunda con una respuesta firmada.
**Alternativa descartada**: Reemplazar valores y recuentos silenciosamente sin indicar la fuente.

## Alcance técnico

**Decisión**: Aplicación independiente existente, sin nuevas dependencias ni consultas de IA. Los dos paneles comparten frontend y conservan bases/rutas distintas.
**Motivo**: Resolver el CRUD sin tocar notas, evidencias ni funciones académicas en fase demo.
**Evidencia local revisada**: `app.py` crea responses/reviews/sessions; solo permite PUT de organización, GET de constancias/listado/informes. `public/admin.html` no contiene controles de corrección ni papelera. `Dockerfile` copia módulos explícitamente; deberá incluir el nuevo módulo.

No quedan incógnitas de diseño. La aprobación humana de spec/plan fue recibida el 2026-10-21; los resultados de pruebas se registran por separado en quickstart.md.

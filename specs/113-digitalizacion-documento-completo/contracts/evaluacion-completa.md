# Contratos

## Lectura

- EvaluacionRead incorpora `lectura: string | null`; ausencia en registros antiguos equivale a vacío.
- Update autorizado: omitido conserva, null/vacío elimina, string hasta 60.000 caracteres reemplaza. Preservar otras reglas/soluciones y bloqueo optimista.
- Edición incompatible con entregas legacy sin versión: 409 con explicación. Estudiante no edita ni recibe solucionario.
- Digitalización separa lectura, preguntas y soluciones; no toma respuestas manuscritas como claves ni trunca documentos silenciosamente.

## Archivos

- POST `/evaluaciones/externa/digitalizar-con-archivo` conserva contrato de file individual; admite file repetido solo para imágenes (1–10,20 MB total).
- `rotaciones` opcional: lista JSON igual al número de fotos, valores 0/90/180/270. PDF/Word no se mezcla ni recibe rotaciones de fotos.
- Permisos/materia antes de procesar bytes. Selección inválida no crea job ni archivo persistente.
- 202 mantiene job_id/estado/materia_id/nombre. Un envío crea un job, no uno por foto. Broker incierto conserva job/fuente recuperables.

## Exportación

PDF/Word alumno: lectura y preguntas completas, compactación solo cuando quepa, espacio de abiertas y figuras. Solucionario solo mediante permiso docente existente. Sin nuevas rutas públicas a originales.

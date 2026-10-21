# Modelo de datos

- Lectura: texto opcional máximo 60.000 caracteres, vacío equivale a ausencia; persistido en blueprint.reglas_feedback.lectura conservando otras reglas.
- Exposición pública: solo lectura, nunca reglas completas ni clave privada.
- Snapshots: congelan lectura dentro del blueprint. Calificador usa versión de la entrega.
- Edición: permisos y bloqueo optimista existentes; rechazo explicado de edición incompatible en legacy con entregas. Sin backfill.
- Selección: 1–10 fotos, hasta 20 MB total, rotaciones 0/90/180/270; alternativa PDF/Word único.
- Consolidado: bytes normalizados privados, MIME, nombre, páginas y metadatos de orden/rotación; un único job durable.
- Estados: selección, validación, cola/reintento, procesamiento, borrador/error recuperable. Cambio de contexto no reutiliza selección anterior.

No se cambian tablas, notas ni evidencias existentes.

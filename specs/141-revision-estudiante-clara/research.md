# Investigación — revisión de estudiante clara

**Fecha**: 2026-11-02. **Base inspeccionada**: main `c27a30c2ab2dd493c029ce600c0e5c4a72d39177`. Solo código y captura aportada; no consultas a datos de producción ni llamadas IA.

## R1. El problema individual no se corrige solo con estilos

- **Evidencia**: `FeedbackWorkspace.tsx` monta `ShareFeedbackDialog` con `embedded` e `initialGradeId`. El detalle agrega mensaje, `FeedbackStudentLink`, edición, revisión y opciones avanzadas; el frame añade además publicación individual y `FeedbackSelectionBar`.
- **Decisión**: separar composiciones individual y grupal, reutilizando datos/acciones y no copiando la lógica de permisos o emisión.
- **Razón**: esconder botones con CSS deja estados, focos, petición de publicación y barra de grupo dentro del estudiante.
- **Alternativa descartada**: sumar otra tarjeta o desplegable a ese frame.

## R2. La explicación actual es parcial y está duplicada

- **Evidencia**: `CalificacionesWorkspace.tsx`, `GradeNoteExplanation`, muestra puntos y equivalencia breve. `GradeBreakdown.tsx` contiene otro desplegable y `GradeFormula.tsx` sí detalla proporcionalidad y ajuste. `breakdown_policy.calculate_formula` suma puntos reales, divide por máximos, escala, ajusta, limita entre cero/máximo y redondea half_up.
- **Decisión**: presentación única desde el snapshot, con desglose de secciones solo si hay procedencia guardada; no tocar algoritmo ni pesos.
- **Razón**: un total reconstruido de cifras visualmente redondeadas puede diferir del resultado preciso; una nota docente puede diferir legítimamente del cálculo.
- **Alternativa descartada**: sumar los máximos de la evaluación actual o regenerar una explicación con IA.

## R3. El ruido tiene varias fuentes

- **Evidencia**: `ReviewTriagePanel.tsx` ofrece resumen, grupos de conteos, avisos, navegación de excepciones y mensajes de éxito; la tarjeta de pregunta, el visor y `GradeQuestionEvidence.tsx` agregan ayudas y estados propios.
- **Decisión**: una causa activa, una ubicación principal y acción concreta; traza/histórico en Historial, ayudas generales en una ayuda única.
- **Razón**: reducir repetición visual no cambia la clasificación de seguridad ni las reglas de publicación.
- **Alternativa descartada**: ocultar todos los avisos o marcar como confiables respuestas solo por tener una nota.

## R4. Giro del visor no es giro guardado

- **Evidencia**: `GradeEvidenceViewer.tsx` solo mueve/amplía; su icono RotateCcw restablece la vista, no gira píxeles. `GradeReprocessing.tsx` abre un paquete nuevo vacío y solicita recalificación. `MultiPageEvidencePicker` y `EvidenceScanEditor` sí ofrecen giro, orden y preparación local.
- **Decisión**: giro de vista reversible sin escritura; entrada contextual de editar hojas para preparación persistente, seguida de confirmación de recalificación.
- **Razón**: no asociar silenciosamente una nota con imágenes distintas de las calificadas.
- **Alternativa descartada**: guardar una versión de presentación independiente de la versión calificada. Es posible, pero requeriría resolver dos fuentes vigentes, sus regiones y qué ve el estudiante; no es necesario para esta primera entrega.

## R5. Editar hojas existentes requiere backend compatible

- **Evidencia**: `revision_router.py` acepta fotos/rotaciones o escaneo completo, no referencias a hojas existentes. `revision_service.py` ya usa expected-version, solicitud idempotente, lock, snapshot y cola. `storage_service.py` mantiene activos privados inmutables. Los manifiestos contienen originales, preparados, recetas y versiones.
- **Hallazgo crítico**: `evidence_scan_reads.py` produce copias de presentación para `/paginas/{n}?version=original`; aplica normalización y giro. No son los bytes originales. El DTO actual no publica IDs de hoja, receta, revisión y dimensiones suficientes para rehidratar un editor fiel.
- **Decisión**: contrato seguro de edición por referencias opacas, preview explícito con marco/dimensiones y fingerprint. El servidor resuelve fuentes y conserva originales; el cliente no envía paths ni promociona una previsualización a original.
- **Razón**: permite conservar hojas no cambiadas y añadir fotos sin subir de nuevo el paquete manualmente, preservando trazabilidad.
- **Alternativa descartada**: convertir todos los previews en archivos y usar el regrade legacy como si fueran nuevas fotos originales.

## R6. Reapertura modifica el resultado vigente por diseño

- **Evidencia**: `photo_service.py` inicia procesamiento y limpia campos del resultado vigente; `revision_service.py` conserva antes nota, comentario, entrega y manifiesto en el historial, suspende accesos y encola trabajos. No existe guardar preparada sin recalificar.
- **Decisión**: explicar y confirmar esta transición; historial conserva el resultado anterior. No prometer que la nota anterior sigue vigente sobre evidencia nueva.
- **Razón**: preserva la semántica actual y evita introducir cambios académicos invisibles bajo una mejora visual.
- **Alternativa descartada**: reutilizar la nota o cajas antiguas tras alterar los bytes del paquete.

## R7. No son necesarias nuevas llamadas ni dependencias

- **Evidencia**: `feedbackSections.ts` clasifica solo etiquetas explícitas y conserva originales; existen renderizadores Markdown, iconos, motivos y editor de imagen.
- **Decisión**: diseño 3 con el texto existente; faltan logros explícitos → lectura neutral del comentario, no un logro inventado. Motivos pequeños opcionales, sin fondos o tarjetas adicionales.
- **Alternativa descartada**: llamar IA por abrir la pestaña o generar arte nuevo para un rediseño de jerarquía.

## Estado de la investigación

No quedan decisiones técnicas abiertas que impidan redactar el plan. Faltan aprobación humana, checklist de requisitos posterior, tareas, análisis y pruebas. La investigación no demuestra funcionamiento en producción ni aprobación de la nueva experiencia.

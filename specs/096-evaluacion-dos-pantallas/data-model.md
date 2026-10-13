# Modelo reutilizado y compatibilidad

Materia, evaluación, blueprint, preguntas/respuestas, criterios/rúbrica, modalidad y estado mantienen tablas, IDs y contratos. Sin migraciones. Generar crea el borrador vigente; revisar no publica y guardar actualiza su mismo ID.

## Estado local

Reutilizar WizardState: materiaId, nombre/descripcion, modalidad, escala/fecha, counts, IDs oficiales/personalizados, flags de criterios/rúbrica, referenceText/referenceFile, indicaciones, generatedEvaluationId, generatedCriteria, warnings y questions. Normalizar step 1–6 sin quitar contenido ni cambiar claves v7.

Intención de nombre como metadato opcional local: permite actualizar sugerencia nueva no editada; registros anteriores se tratan como nombre del docente. No va al backend ni modifica nombres históricos. Presets 5/10 conservan tipos activos y reparten enteros hasta total exacto; personalizados mantienen 3–30. Defaults solo nuevos.

## Transiciones

- Nuevo → Preparar → Generando → Revisar → Guardando → borrador guardado.
- Generación fallida → preparación preservada/error; guardado fallido → revisión preservada/error.
- Existente → Revisar → guardado explícito conservando estado anterior.
- Borrador propio → confirmar continuar → fase equivalente, sin generación automática.
- Etapas 1–4 → Preparar; 5–6 con contenido generado → Revisar. Contenido incompleto se conserva para corregir.
- Publicación continúa siendo una acción separada autorizada sobre evaluación guardada.

## Conservación

Conservar origen/explicación/confianza de respuestas, alineación/fuente, pesos/niveles, ID, escala, estado y versión de edición. Solo rúbrica no reenvía preguntas; conflicto rechaza sobrescritura. Consulta de identidad/versionado del borrador no reemplaza ediciones locales. Mantener TTL/cuenta/materia y reselección; sin binarios/secretos/evidencia adicionales. Almacenamiento denegado permite trabajar en memoria sin anunciar guardado local exitoso.

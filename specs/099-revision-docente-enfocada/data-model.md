# Modelo de presentación 099

Sin persistencia nueva.

- **Identidad/contexto**: ID de entrega/alumno/evaluación, nombre y materia; preservar ante cambios de sección y descartar datos tardíos de otro contexto.
- **Nota presentada**: valor/escala y origen sugerida/decidida/procesando/sin nota. Mantener `nota_sugerida`, `nota_confirmada` y fórmula originales; cero válido distinto de null. Decisión/ajuste requiere registro real, no discrepancia como evidencia.
- **Resumen de revisión**: aviso principal, número de respuestas afectadas y conjunto íntegro de motivos. Clasificación existente, sin cambios al resultado ni a bloqueos académicos. Motivos equivalentes pueden compartir presentación, nunca borrar sus trazas.
- **Sección activa**: Respuestas/Evidencia/Retroalimentación/Historial; resumen común. Reclamos como destino contextual. Enlaces de pregunta/hoja resuelven sección inicial; cambios guardados/borradores siguen perteneciendo a la misma entrega.
- **Reclamos**: cargando/error/consulta correcta, registros totales y abiertos. Consulta correcta vacía permite ocultar panel; error nunca equivale a cero. Resueltos permanecen consultables.
- **Opciones**: capacidades autorizadas vigentes de ajuste, publicación, liberación, reanálisis y alta de reclamo; no cambios de reglas.

Transiciones: seleccionar sección → comprobar guardas de editor/borrador → cambiar panel/foco. Si necesita decisión del usuario, conservar panel y borrador hasta resolver. Cambiar alumno/sesión invalida el estado privado anterior según flujo existente. Navegar por sí solo no escribe datos.

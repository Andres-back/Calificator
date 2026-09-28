# Contrato interno

`render_grader_prompt(ctx)` mantiene preguntas, nota máxima, criterios, respuestas esperadas, validación objetiva, componentes, evidencia completa y contexto. Añade reglas JSON como preferencias subordinadas a integridad.

`router_grader_agent` usa el mismo constructor y mantiene la cascada/proveedores actuales.

Las preferencias omiten `trazabilidad`, `advertencias`, `respuestas_liberadas`, `requiere_validacion_docente`, `digitalizada_desde_archivo`, `clave_completa` y claves con prefijo `_`: son metadatos, no instrucciones de redacción. El blueprint original permanece intacto.

Salida: mismos campos de nota, confianza, criterios, componentes, feedback, alertas y revisión docente. No cambiar puntajes por preferencias de redacción.

Calidad humana: cinco puntuaciones 1–5, versión y declaración de cegamiento. La ficha documental no introduce nuevos campos públicos ni formularios.

No obliga a puntuar calidad al calificar, no usa confianza IA como calidad y no cambia la vista de respuestas correctas.

## Evolución posterior al piloto

El contrato público conserva los mismos campos. Para ejecuciones nuevas, si evidencia, componentes, suma o verificadores no coinciden:

- `estado` permanece en `requiere_revision`;
- `feedback` contiene un borrador provisional basado en el desglose y no una afirmación definitiva;
- `resultado_json.feedback_quality_guard` conserva versión, estado, motivos y feedback original para auditoría;
- `nota_confirmada` permanece vacía y no se publica automáticamente.

La protección no recalcula ni actualiza registros históricos y no añade llamadas a proveedores. Una decisión docente existente prevalece y no puede ser sustituida por la guarda automática.

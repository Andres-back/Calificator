# Decisiones verificadas

## Campo existente
**Decisión**: Usar `reglas_feedback` del blueprint.
**Motivo**: `evaluation_to_grading_blueprint` ya lo transmite. Generación/digitalización guardan tono formativo y orientación sin solución; falta incluirlo en prompt.
**Alternativa descartada**: Nueva configuración o evaluador; añade complejidad y demora.

## Constructor común
**Decisión**: Principal y respaldo usan `render_grader_prompt`.
**Motivo**: `router_grader_agent` tiene un `.format` independiente; añadir placeholder solo a la plantilla lo rompería.
**Alternativa descartada**: Dos interpolaciones divergentes.

## Calidad humana
**Decisión**: Mantener corrección, especificidad, claridad, utilidad y adecuación, enteros 1–5, versión y cegamiento.
**Motivo**: Contrato vigente de `FeedbackQualityPayload`; promedio de cinco dimensiones existente.
**Alternativa descartada**: Escala 1–4 o puntuación automática por otro LLM. No sustituyen revisión independiente del piloto.

## Alcance medible
**Decisión**: Verificar inclusión de reglas y conservación de lógica, no afirmar calidad o latencia mejoradas sin ensayo.
**Motivo**: Obediencia del modelo es probabilística; revisión humana permanece necesaria.

## Evidencia del primer piloto
**Decisión**: Tratar una retroalimentación convincente pero contradictoria como incidente de integridad, no como simple problema de estilo.
**Motivo**: La revisión anonimizada encontró una felicitación global incompatible con la fotografía y con el desglose por preguntas. La confianza declarada por el modelo no evitó el error.
**Alternativa descartada**: Mejorar únicamente el prompt de tono. Un mensaje más agradable no corrige una lectura visual equivocada.

## Guarda de coherencia local
**Decisión**: Mantener revisión docente y ocultar el carácter definitivo del feedback cuando existan bloqueos por componente o diferencia entre nota global y suma.
**Motivo**: Es determinista, no añade latencia ni otro proveedor y aprovecha el desglose vigente.
**Alternativa descartada**: Pedir a un tercer LLM que juzgue la calidad de cada mensaje. Aumenta tiempo, costo y puede repetir el mismo sesgo.

## Protección de evidencia histórica
**Decisión**: Aplicar cambios solo a ejecuciones nuevas y conservar registros previos sin recalcularlos.
**Motivo**: Los datos del piloto son evidencia de investigación y las decisiones docentes ya tomadas deben permanecer auditables.
**Alternativa descartada**: Reprocesamiento masivo automático, porque mezclaría versiones del instrumento y podría alterar notas confirmadas.

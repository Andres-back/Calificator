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

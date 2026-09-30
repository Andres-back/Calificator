# Contrato interno del adaptador

No se modifican APIs públicas. opencode_thinking_control(model, *, stage=None) mantiene compatibilidad con llamadas de un argumento. Para Qwen 3.8 Flash, las etapas internas grading_secondary y targeted_recheck añaden thinking: {type: disabled} a Messages. Otros usos no añaden este campo. Se conserva imagen base64, max_tokens, normalización y rechazo de max_tokens/length como salida truncada.

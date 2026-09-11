# Investigación: Respaldo visual con Ollama Cloud

## Decisión 1 — Usar el contrato nativo de chat multimodal

- **Decisión**: enviar la imagen como base64 en `messages[].images`, pedir JSON en el prompt y validarlo localmente mediante el cliente Ollama Cloud existente.
- **Motivo**: conserva el endpoint oficial ya autorizado, evita introducir otro SDK y respeta que Ollama Cloud todavía no garantiza el modo de salida estructurada.
- **Alternativas consideradas**: una cascada estática OpenAI/Groq no respeta la ruta elegida por el administrador; mostrar Ollama sin ejecutarlo produciría una configuración engañosa.

## Decisión 2 — Conservar el extractor único

- **Decisión**: el extractor recibirá el proveedor efectivo, pero mantendrá la misma preparación, rotación, división de PDF, unión de respuestas y esquema de salida.
- **Motivo**: reduce diferencias entre proveedores y protege el comportamiento verificado de las entregas multihoja.
- **Alternativas consideradas**: duplicar el extractor para Ollama incrementaría deriva y riesgo de resultados incompatibles.

## Decisión 3 — Respaldo solo tras fallo del principal

- **Decisión**: el orquestador ejecutará Ollama únicamente cuando OpenCode termine sin extracción utilizable.
- **Motivo**: no aumenta latencia ni consumo en el camino exitoso y mantiene una sola secuencia auditable.
- **Alternativas consideradas**: ejecutar ambos proveedores en paralelo gastaría recursos en cada calificación y complicaría la determinación del resultado efectivo.

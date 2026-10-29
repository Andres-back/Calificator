# Investigación y decisiones

Los dos trabajos inspeccionados de Sociales agotaron aproximadamente247/249s antes de evaluar. Cola inferior a0.5s; modelos calificadores no comenzaron. Extracción heredada intentó el modelo antiguo, GLM (HTTP200 pero extracción fallida), Qwen con dos timeouts de90s, MiMo y respaldo Ollama. Los logs anteriores no conservan de manera suficiente la razón concreta del rechazo de GLM: no se adjudica sin pruebas a formato, falta de respuestas o foto ilegible. Las dos evidencias existen y hay snapshots anteriores con nota.

Decisión: ejecutar exclusivamente la ruta administrativa; rechazar contexto ausente, no usar modelos de entorno. Contratos compatibles116 existentes resuelven protocolo y claves sin heurística del nombre. Mantener adaptador nativo solo para selección explícita.

Decisión: controles por etapa persistidos, capturados y editables. Se rechaza configurar un timeout global del proveedor para arreglar este caso porque afectaría otras funciones. Aditivos y compatibles con clientes anteriores.

Decisión: salida amplia acotada y diagnóstico de truncamiento. El límite de extracción existente3072 puede ser insuficiente para respuestas extensas; no afirmar que haya sido la causa específica de estas dos salidas, porque no se conservaron. Los tests sí deben garantizar que el truncamiento no pase por una nota válida.

Decisión: mostrar historial como referencia privada, no restaurar la nota automáticamente. Rechazada restauración ciega: la evidencia o criterios pueden haber cambiado y la publicación debe requerir al docente.

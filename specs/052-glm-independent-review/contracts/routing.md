# Contrato interno de enrutamiento

No cambian endpoints ni respuestas públicas.

- Entrada visual normal: DeepSeek V4 Flash Vision Exp.
- Respaldo visual: GLM 5.3 Flash, solo después de falla o extracción no usable.
- Verificación de puntaje: GLM 5.3 Flash sobre texto y desglose estructurado.
- Revisión adicional: GLM 5.3 Flash cuando el orquestador la requiera.
- Resultado final: la suma completa por pregunta conserva la autoridad definida en 051.
- Auditoría: proveedor, modelo, etapa, latencia, estado y fallback quedan registrados sin secretos.

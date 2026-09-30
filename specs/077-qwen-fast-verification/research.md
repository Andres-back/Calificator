# Evidencia previa y decisiones

## Medición del 30-09-2026

Recalificación demo con una foto: 93.838 s totales; cola 1.364 s, preparación 0.397 s, extracción DeepSeek 5.705 s, valoración DeepSeek 5.986 s, verificación GLM 34.887 s, consolidación/arbitraje 44.013 s, persistencia 0.145 s. No fue un reintento; el arbitraje se activó por discrepancia de componentes.

Benchmark acotado de verificador y comparador con el mismo contrato/evidencia:

| Modelo | Verificación | Arbitraje | Decisión |
| --- | --- | --- | --- |
| Qwen 3.8 Flash sin pensamiento | 8.4–10.7 s | 8.3–9.5 s | Seleccionado por el usuario |
| GLM 5.3 Flash razonamiento bajo | 19.7–34.9 s | 14.3–44.0 s | Baseline y respaldo conservado |
| MiMo 2.6 sin pensamiento | 7.3–38.3 s | 12.7–15.2 s | Variabilidad y salida inconsistente |

Qwen con pensamiento predeterminado agotó el presupuesto de salida. Desactivarlo completó el contrato y redujo espera sin cambiar el presupuesto. No es validación estadística de exactitud ni garantía de latencia. La demo tiene dos claves numéricas antiguas que expresan el cuadrado del resultado; se corrigieron **solo en memoria** en el desafío de calidad, nunca en los registros. Qwen detectó la discrepancia inducida en el componente del rombo con la referencia correcta. Persisten diferencias de interpretación gráfica, por lo que se conserva revisión humana.

## Fuentes primarias consultadas

- [OpenCode Go: catálogo y protocolos](https://opencode.ai/docs/go/): Qwen emplea Messages; DeepSeek/GLM Chat Completions.
- [Model Studio: Messages compatible con Anthropic](https://help.aliyun.com/en/model-studio/anthropic-api-messages): control thinking soportado.
- [Model Studio: comportamiento de Qwen 3.8](https://help.aliyun.com/en/model-studio/batch-inference): visión y pensamiento habilitado por defecto.

## Alternativas descartadas

Reducir tiempos cancelando la request, eliminar el verificador, cambiar el evaluador DeepSeek o editar notas previas están fuera de alcance. No se instala un proveedor ni se introducen nuevos formatos.

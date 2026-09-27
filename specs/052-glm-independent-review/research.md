# Investigación y decisiones

## Comparación controlada

- DeepSeek V4 Flash Vision Exp procesó la evidencia real de diez preguntas en 4,28 s con cobertura completa.
- GLM 5.3 Flash procesó la misma evidencia en 6,76 s con cobertura completa.
- Como verificador textual, GLM produjo la nota correcta en 2,6 s y detectó la respuesta errónea.
- Qwen 3.8 Flash produjo el mismo resultado en 12,57 s; MiMo 2.5 no entregó un contrato JSON útil.

Las cifras son observaciones del entorno actual, no garantías del proveedor ni del piloto.

## Decisiones

1. DeepSeek continúa como extractor visual principal.
2. GLM es el primer respaldo visual dentro de OpenCode.
3. GLM verifica la suma y el desglose a partir del texto extraído, sin duplicar visión en el caso normal.
4. Las rutas personalizadas se preservan; solo se migran valores institucionales automáticos conocidos.
5. El catálogo dinámico debe reconocer `glm-5.3-flash` como texto y visión aunque `/models` no publique modalidades.

## Fuentes primarias

- Catálogo OpenCode Go: https://dev.opencode.ai/docs/go/
- Implementación multimodal GLM: https://github.com/zai-org/GLM-V

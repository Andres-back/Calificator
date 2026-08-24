# Validación rápida

1. Ejecutar tests unitarios del extractor y regresión de calificaciones.
2. Ejecutar el benchmark directo tres veces con fixture sintético.
3. Ejecutar el mismo fixture mediante `VisionExtractor` y registrar preparación, extracción, parsing y total.
4. Probar JPG, PNG, PDF uno/multipágina, rotación, borrosa, ilegible, vacía y corrupta.
5. Simular 429, 500, timeout, JSON inválido y fallo parcial.
6. Confirmar que evaluación online no llama al extractor.
7. Ejecutar pytest completo, lint, TypeScript, Vitest y build.
8. Revisar que logs no contengan `data:image`, base64, prompts ni secretos.

Resultado esperado: DeepSeek Vision es principal, fallbacks son visibles, todo job termina y la nota sigue bajo revisión docente.

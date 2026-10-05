# Validación

1. Desde `backend`, ejecutar `python -m pytest tests/unit/test_rag_embedding_space.py tests/unit/test_qwen_embedding_provider.py -q`.
2. Verificar ausencia: cero llamadas al embedding, una consulta parametrizada y retorno vacío.
3. Verificar presencia: dos consultas, todos los filtros compartidos y cuatro filtros exactos de espacio vectorial.
4. Verificar fallo en cada consulta: error recuperable, sin contexto fabricado.
5. CI obligatorio de backend/frontend/E2E/build/gobernanza antes de fusionar.
6. Tras desplegar `main`, reutilizar únicamente evidencia demo no confirmada por el endpoint normal de foto; medir desde POST hasta nota visible, registrar modelos y etapas, sin publicar la nota ni alterar registros reales.

## Resultado

- Regresión roja previa: 8 fallos esperados, 2 pruebas existentes verdes; demostró que se consultaba el proveedor sin candidatos.
- Regresión posterior: **62 passed, 1 skipped** (la prueba omitida requiere entorno adicional); incluye espacio RAG, proveedor Qwen, generación de evaluaciones y pipeline explicable. El doble de prueba de integración ahora representa también `EXISTS`.
- Ruff de archivos afectados y compilación: verdes. Verificación de espacios en diff: corregida.
- Análisis previo: 5 requisitos/5 tareas, 100% de cobertura, 0 contradicciones o problemas críticos; lista de revisión 21/21 completa.
- Convergencia de implementación: 5 FR, 4 escenarios de aceptación, decisiones de autorización/compatibilidad/errores y 8 principios constitucionales revisados, sin trabajo de implementación faltante. CI, merge y prueba productiva son gates posteriores, todavía pendientes aquí; se documentarán en el PR.
- La medición previa fue 59.253 s. No se promete que todos los casos queden bajo 20 s.

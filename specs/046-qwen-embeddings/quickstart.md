# Validación rápida

1. Validar Compose y ejecutar migraciones en una base de prueba.
2. Iniciar el servicio institucional y comprobar que `qwen3-embedding:0.6b` está cargado.
3. Indexar una fuente breve en español.
4. Consultar una paráfrasis y comprobar fragmento, fuente y latencia.
5. Confirmar en base que proveedor, modelo, dimensión y versión coinciden.
6. Detener el servicio de embeddings y ejecutar la regresión de calificación: debe continuar sin RAG.
7. Ejecutar pruebas focalizadas, Ruff, gobierno Spec Kit y construcción de contenedores.

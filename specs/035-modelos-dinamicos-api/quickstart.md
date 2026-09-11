# Validación del hotfix 035

1. Configurar una credencial institucional sin exponerla en fixtures o logs.
2. Abrir Configuración de IA > Proveedores y claves.
3. Pulsar “Actualizar modelos” en OpenCode, Groq, OpenAI u Ollama.
4. Confirmar cantidad descubierta, actualización inmediata y selectores compatibles.
5. Simular un error y comprobar que el catálogo anterior no cambia.
6. Guardar una credencial reemplazada y comprobar que su sincronización se ejecuta después.

## Evidencia

- Ruff focal: aprobado.
- Backend: `4 passed` en descubrimiento, normalización, errores seguros y rechazo atómico de catálogos vacíos.
- Frontend: `10 passed` en configuración administrativa, actualización automática/manual, respaldo compatible y modelo retirado visible.
- TypeScript y ESLint: aprobados.
- Build de producción Vite: aprobado.
- Inventario técnico: vigente, 536 superficies.
- Docker local: no se ejecutó porque el motor de Docker Desktop no estaba disponible; los builds de contenedores quedan a cargo del CI.
- Entrega: PR [#73](https://github.com/Andres-back/Calificator/pull/73), sujeto a CI completo antes de fusionar.

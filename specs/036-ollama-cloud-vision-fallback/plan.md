# Plan: Respaldo visual con Ollama Cloud

**Rama**: `codex/036-ollama-cloud-vision-fallback` | **Fecha**: 2026-09-11 | **Spec**: [spec.md](./spec.md) | **Issue**: [#74](https://github.com/Andres-back/Calificator/issues/74)

## Resumen

Extender el extractor visual existente para consumir Ollama Cloud bajo el mismo contrato estructurado usado por OpenCode. La ruta administrativa permitirá escoger Ollama únicamente cuando tenga credencial y modelos visuales activos. El orquestador ejecutará el respaldo configurado después de un fallo del principal y conservará la trazabilidad del proveedor efectivo.

## Contexto técnico

- **Lenguaje**: Python 3.12 y TypeScript.
- **Dependencias**: FastAPI, SQLAlchemy, HTTPX, React y cliente Ollama Cloud existente.
- **Persistencia**: rutas y catálogo existentes; no requiere migración.
- **Pruebas**: pytest focal para proveedor, extractor, orquestador y validación administrativa; Vitest para opciones de interfaz.
- **Plataforma**: contenedores Linux en VPS y navegador web responsivo.
- **Restricciones**: no duplicar jobs o notas, no exponer secretos, no degradar el camino OpenCode exitoso.

## Diseño

1. Ampliar el cliente Ollama Cloud para solicitar salida JSON y aceptar mensajes con imagen.
2. Reutilizar preparación, rotación, multipágina, normalización y telemetría del extractor visual con un transporte Ollama específico.
3. Pasar el respaldo resuelto y su credencial institucional al orquestador solo al momento de ejecutar.
4. Marcar Ollama como proveedor admitido por la etapa de extracción; los filtros actuales limitarán el selector a modelos `vision`.
5. Probar principal exitoso, fallo recuperado y fallo doble sin realizar llamadas reales ni gastar tokens.

## Constitución

- **Roles**: la ruta se configura bajo el permiso administrativo existente.
- **Integridad**: un único pipeline conserva entrega y calificación.
- **Recuperación**: respaldo explícito, observable y sin nota cero por fallo técnico.
- **Portabilidad**: el contrato visual deja de depender exclusivamente de OpenCode.
- **Seguridad**: credenciales descifradas solo durante ejecución; pruebas con dobles locales.
- **Gobernanza**: issue, spec, plan, tareas, regresión, PR y CI.

## Estructura afectada

```text
backend/app/services/ollama_provider.py
backend/app/services/vision_extractor.py
backend/app/modules/calificaciones/agents.py
backend/app/modules/calificaciones/orchestrator.py
backend/app/services/ai_capability_registry.py
backend/tests/unit/test_vision_extractor.py
backend/tests/unit/test_ollama_cloud_provider.py
frontend/src/modules/admin/AdminAIConfigPage.test.tsx
specs/036-ollama-cloud-vision-fallback/
```


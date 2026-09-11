# Plan: Catálogo dinámico de modelos IA

**Rama**: `codex/035-modelos-dinamicos-api` | **Fecha**: 2026-09-10 | **Spec**: [spec.md](./spec.md) | **Issue**: [#72](https://github.com/Andres-back/Calificator/issues/72)

## Contexto técnico

- Backend FastAPI/SQLAlchemy: servicio de descubrimiento reutilizable y endpoint administrativo por proveedor.
- Frontend React/TypeScript: acción de actualización por tarjeta y fusión segura del catálogo en borrador.
- Persistencia existente `ai_provider_models`; no se requiere migración.
- Credenciales existentes cifradas y resueltas en servidor.

## Diseño

1. Consultar Ollama con su cliente actual y proveedores compatibles mediante su endpoint de modelos.
2. Normalizar formatos, deduplicar e inferir capacidades solo cuando el proveedor no las declare.
3. Persistir dentro de una transacción: solo después de una respuesta válida se actualiza disponibilidad.
4. Devolver el catálogo completo del proveedor y fusionarlo en el borrador sin alterar otros proveedores ni rutas.
5. Mostrar modelo seleccionado ausente como “no disponible” hasta una elección explícita.
6. Tras guardar credenciales, sincronizar únicamente los proveedores cuyas claves cambiaron.

## Constitución

- Roles: endpoint protegido por `admin_ai.manage`.
- Seguridad: secretos solo en servidor, errores sanitizados.
- Portabilidad: adaptadores por familia de proveedor, sin lógica de negocio atada a un modelo.
- Integridad: no cambia trabajos activos ni rutas publicadas; el fallo conserva catálogo.
- Calidad: regresión backend/frontend y CI obligatorios.

## Validación

- Respuestas OpenAI-compatibles, Ollama, vacías, duplicadas y fallidas.
- Actualización visual y conservación de selecciones ausentes.
- Autorización administrativa y ausencia de secretos.
- TypeScript, lint, pruebas focales, gobernanza e inventario.

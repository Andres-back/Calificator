# Plan: Perfeccionar recursos pedagógicos

**Rama**: `codex/026-perfeccionar-recursos` | **Fecha**: 2026-08-28 | **Spec**: [spec.md](./spec.md) | **Issue**: #39

## Resumen

Consolidar el catálogo de nuevas creaciones sin eliminar contratos históricos y ampliar los contratos de guía, lectura comprensiva, taller y plan de refuerzo. La generación, validación, edición, vista previa y PDF compartirán las mismas secciones pedagógicas. Las respuestas incompletas tendrán recuperación especializada o error explícito, sin persistir borradores vacíos.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11+, TypeScript, React 18.  
**Dependencias**: FastAPI, Pydantic, SQLAlchemy, proveedor de IA mediante `LLMRouter`, Vite y Vitest.  
**Persistencia**: PostgreSQL; no se modifica el esquema, solo contenido JSON compatible.  
**Pruebas**: pytest para contratos, calidad, fallback y PDF; Vitest para catálogo y vista previa; build TypeScript.  
**Plataforma objetivo**: navegador de escritorio y móvil desde 360 px; backend y worker en Docker.  
**Rendimiento y escala**: conservar un intento principal y como máximo una recuperación; la validación local no añade llamadas externas ni crea duplicados.

## Verificación de la constitución

- Separación de roles: cumple; no se cambian permisos y la versión con soluciones sigue reservada al docente.
- Integridad y trazabilidad: cumple; el docente revisa antes de publicar y el contenido incompleto no se persiste.
- Asincronía e idempotencia: cumple; se conserva el flujo existente y un reintento produce un único material.
- Datos y secretos: cumple; no se añaden credenciales, datos reales ni nuevas migraciones.
- Accesibilidad: cumple; se revisan jerarquía, controles táctiles, modo claro/oscuro y anchos desde 360 px.
- Gobernanza y pruebas: cumple; issue #39, especificación 026, evolución de 006 y pruebas focalizadas.

## Estructura del proyecto

```text
backend/app/modules/herramientas/
├── content_quality.py
├── generators/
│   ├── guia.py
│   ├── lectura_comprensiva.py
│   └── plan_refuerzo.py
├── pdf_render.py
├── schemas.py
└── service.py

backend/app/services/llm_router.py
backend/tests/unit/

frontend/src/modules/herramientas/
├── meta.ts
├── toolPickerModel.ts
├── MaterialContentEditor.tsx
└── views/ContenidoView.tsx

specs/006-recursos-actividades/spec.md
specs/026-perfeccionar-recursos/
```

## Decisiones y complejidad

- Los campos nuevos son aditivos; no se migran materiales antiguos.
- `ficha` y `unir_columnas` permanecen en contratos, tipos y renderizadores, pero no en el selector de creación.
- `taller` se mantiene en el servicio actual para reducir movimiento; su contrato se amplía sin alterar el endpoint.
- La normalización valida por formato y recibe las cantidades solicitadas para detectar omisiones.
- Los fallbacks especializados se incorporan en el router local para que la recuperación respete el mismo contrato.
- No se modifica asignación, visibilidad, conversión a evaluación ni calificación.

## Verificación posterior al diseño

No hay violaciones constitucionales: no se eliminan datos ni interfaces públicas, no se amplían permisos y las respuestas docentes mantienen separación de audiencia.

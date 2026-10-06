# Plan: Comprobación de embeddings institucionales

**Rama**: `codex/086-embedding-admin-check` | **Fecha**: 2026-10-06 | **Spec**: [spec.md](./spec.md) | **Issue**: #178

## Resumen

Hotfix aprobado por el usuario tras el diagnóstico. Usar proveedores persistidos en la comprobación administrativa y eliminar su lista heredada sin consumidores. Añadir una prueba sintética mediante `OllamaEmbeddingProvider` y el validador vectorial existente. La UI distingue servicio interno sin clave, nube configurada sin probar, conexión comprobada y error. No cambia inferencia, notas o vectores guardados.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11 y React/TypeScript existentes.
**Dependencias**: FastAPI, httpx, pytest, Vitest; sin paquetes nuevos.
**Persistencia**: lectura de configuración existente; sin migración ni entidad nueva.
**Pruebas**: regresiones del helper, endpoint, permisos y tarjeta; CI completo.
**Plataforma objetivo**: VPS Linux y navegadores desde 360 px.
**Rendimiento y escala**: una entrada sintética fija por clic, timeout institucional existente, sin sondeo automático. URL exclusiva del despliegue y modelo activo compatible solicitado o configurado.

## Verificación de la constitución

- Separación de roles: `admin_ai.manage` permanece; tests de admin, docente, estudiante y sesión ausente.
- Integridad y trazabilidad: no cambios académicos ni de vectores; canónica 012.
- Asincronía e idempotencia: botón conserva carga y resultado; no persistencia de la prueba.
- Datos y secretos: texto sintético, URL institucional y mensajes sin datos sensibles.
- Accesibilidad: estados comprensibles; no controles cloud inaplicables para interno.
- Gobernanza y pruebas: issue/hotfix/spec-approved; pruebas, Converge y PR con CI. Sin pausa adicional de aprobación del plan según constitución; sin push directo o despliegue sin autorización. Gates pre/post diseño: conformes.

## Estructura del proyecto

- `backend/app/modules/admin_ai_config/router.py`: contrato y cliente interno existente.
- `backend/tests/unit/test_admin_embedding_check.py`: regresiones del helper/endpoint/permisos.
- `frontend/src/modules/admin/ai/sections/ProvidersSection.tsx` y `ProvidersSection.test.tsx`: estados y controles.
- `specs/021-configuracion-ia-docente/spec.md`, `specs/README.md`, `tests/spec_governance/test_spec_baseline.py`: trazabilidad; 012 ya delegó el panel a 021.

## Decisiones y complejidad

Se reutilizan cliente y validación; no un segundo pipeline. Fases: regresiones rojas → corrección backend → tarjeta → pruebas enfocadas/tipos/lint/build/gobernanza → Converge/PR/CI. No hay excepciones ni investigación externa pendiente.

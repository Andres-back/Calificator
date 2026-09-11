# Plan: Administración efectiva de herramientas e IA

**Rama**: `codex/034-administracion-herramientas-ia` | **Fecha**: 2026-09-10 | **Spec**: [spec.md](./spec.md) | **Issue**: [#70](https://github.com/Andres-back/Calificator/issues/70)

**Estado**: especificación y diseño técnico aprobados por el usuario el 2026-09-10. Implementación autorizada; trazabilidad en #70 con `spec-approved` y `plan-approved`.

## Resumen

Reorganizar `/app/admin/configuracion-ia` como un centro de control por funciones y herramientas. Un registro canónico de capacidades describirá las etapas que realmente ejecuta cada flujo y sus consumidores. Las rutas editables seguirán persistiendo en `ai_feature_routing`; se añadirán rutas específicas por etapa y excepciones por herramienta, sin crear un segundo router. Una tabla pequeña e independiente conservará si una herramienta admite nuevas generaciones y el motivo de pausa. La publicación de proveedores, modelos, rutas y herramientas será atómica, versionada, auditable y aplicable solo a trabajos aceptados después de publicarla.

El ledger `ai_usage_events` seguirá siendo la fuente de ejecución observada. El panel diferenciará siempre configuración guardada, resolución efectiva y ejecución registrada. Los controles de credenciales, las preferencias personales docentes y el estado operativo de las herramientas se mostrarán como conceptos separados.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11, FastAPI 0.139, SQLAlchemy 2.0, PostgreSQL; TypeScript 5.6, React 18.3, Vite 8.
**Dependencias**: reutilizar TanStack Query, React Router, componentes propios, Pydantic, Alembic, Redis y Celery; sin paquetes nuevos.
**Persistencia**: `ai_provider_settings`, `ai_model_catalog`, `ai_feature_routing`, `ai_configuration_versions`, `ai_config_audit_logs`, `ai_usage_events` y nueva `ai_tool_settings`. Los trabajos conservan `_ai_config` en su entrada existente.
**Pruebas**: pytest unitario/integración para resolución, publicación, concurrencia, permisos, pausa y snapshots; Vitest para borrador, impacto y controles; Playwright para recorrido administrador/docente, responsive y temas.
**Plataforma objetivo**: navegador moderno, Brave incluido; 360×800, 390×844, 768×1024, 1366×768 y 1920×1080, modo claro y oscuro.
**Rendimiento y escala**: primer contenido del centro en menos de 2 s p95 con hasta 20 proveedores/modelos, 30 capacidades y 20 herramientas; filtros locales después de carga. Métricas agregadas sobre 7/30/90 días, paginadas y con índices por fecha/función/etapa. Publicar no espera llamadas a proveedores.

## Verificación de la constitución

- Separación de roles: todos los contratos administrativos requieren `admin_ai.manage`; el catálogo docente conserva `resources.read/create`. La pausa se valida en backend además de ocultarse en UI.
- Integridad y trazabilidad: la configuración no cambia notas, evidencias ni trabajos aceptados. Cada publicación/restauración guarda versión, actor y diferencias sanitizadas.
- Asincronía e idempotencia: la configuración se fija al aceptar cada job y el reintento reutiliza ese snapshot. Una pausa no cancela trabajos ya admitidos.
- Datos y secretos: respuestas administrativas solo indican presencia/origen de credenciales; nunca devuelven claves. Métricas excluyen prompts, respuestas y datos identificables del estudiante.
- Accesibilidad: navegación por teclado, controles táctiles de 44 px, tablas transformables en tarjetas, foco visible, estados textuales y scroll único por página.
- Gobernanza y pruebas: issue #70, spec aprobada y plan sometido a aprobación; migración y contratos con regresiones antes del PR.

No se solicitan excepciones a la constitución.

## Estructura del proyecto

- `backend/app/services/ai_capability_registry.py`: registro en código de funciones, etapas, consumidores, capacidad, herencia y editabilidad.
- `backend/app/services/ai_config_service.py`, `ai_configuration_resolver.py`, `llm_router.py`, `image_router.py`: resolución única, alias compatibles, versión y snapshots.
- `backend/app/modules/admin_ai_config/{router,schemas,usage_service}.py`: lectura del centro, validación sin consumo, publicación atómica, vista efectiva y métricas.
- `backend/app/modules/herramientas/{router,service,tool_registry}.py`: catálogo canónico, alias heredados y guardia de generación.
- `backend/alembic/versions/*_admin_tool_ai_control.py`: `ai_tool_settings`, semillas activas e índices de observación.
- `frontend/src/modules/admin/AdminAIConfigPage.tsx`, `frontend/src/modules/admin/ai/**`, `frontend/src/modules/admin/api.ts`: navegación por función, borrador, comparación, herramientas, métricas y auditoría.
- `frontend/src/modules/herramientas/{GeneratePage,meta,api}.ts*`: disponibilidad servida por backend y una sola opción canónica para relacionar pares.
- Suites existentes de configuración IA, credenciales docentes, routing, jobs, herramientas y responsive; pruebas nuevas junto a esos módulos.

## Decisiones y complejidad

1. **Un registro declarativo, un único resolver.** El registro describe la realidad del código pero no guarda secretos ni selección mutable. `ai_feature_routing` conserva las elecciones. Se rechaza duplicar un router “para el panel”, porque divergiría del runtime.
2. **Etapas con identificadores estables.** Se incorporan claves como `calificacion.extraccion`, `calificacion.valoracion`, `calificacion.verificacion`, `calificacion.revision_adicional`, `digitalizacion.extraccion`, `digitalizacion.estructura`, `presentaciones.contenido` y `presentaciones.imagenes`. Los alias actuales siguen resolviendo durante la transición.
3. **Herramienta y ruta son estados distintos.** `ai_tool_settings` controla solamente nuevas generaciones y su motivo. Una excepción de modelo utiliza `herramienta.<tipo>` en `ai_feature_routing`; heredar elimina esa fila. Permisos, visibilidad de materiales y asignación no cambian.
4. **Alias sin duplicados.** `unir_columnas` será la opción canónica “Relacionar pares”; `emparejar` seguirá aceptado para enlaces y materiales históricos, pero no se presenta como herramienta distinta ni recibe configuración separada.
5. **Publicación atómica.** Un borrador contiene proveedores, catálogo habilitado, rutas y herramientas con `expected_version`. La validación no llama a IA. La publicación bloquea la versión, valida dependencias, guarda snapshot previo, aplica todo, registra auditoría, confirma y después invalida Redis. Un 409 conserva el borrador del navegador.
6. **Semántica del control docente.** `rollout_enabled` conserva compatibilidad de almacenamiento, pero en contratos/UI se expone como `teacher_override_allowed`. Publicar siempre rige trabajos futuros; este control solo permite que la configuración personal docente sustituya la institucional.
7. **Configurado, efectivo y observado.** “Configurado” viene de la versión publicada; “efectivo” ejecuta el mismo resolver sin consumir IA y con identidad docente opcional; “observado” se agrega desde `ai_usage_events`. Si el ledger no tiene etapa/modelo, se muestra desconocido.
8. **Métricas honestas.** Éxitos y fallos se agrupan por llamada y no se suman duraciones de etapas solapadas. Cola y duración total provienen de jobs/resultados cuando existen y se rotulan por separado. No se automatiza una recomendación de calidad a partir de latencia.
9. **Parámetros de despliegue solo lectura.** Concurrencia, número de workers y límites globales aparecen como diagnóstico sin editor hasta contar con orquestación segura. No se escriben variables de entorno desde la aplicación.

## Entrega progresiva y reversión

1. Añadir registro, tabla e interfaces aditivas manteniendo la UI actual.
2. Cablear cada consumidor y snapshot con pruebas de equivalencia frente a la ruta vigente.
3. Añadir centro nuevo detrás de la ruta existente y habilitarlo cuando configuración efectiva y observada coincidan.
4. Activar pausa de herramientas solo después de que todas las rutas POST tengan guardia y regresión.
5. Retirar editores viejos únicamente cuando no tengan consumidores.

La migración crea todas las herramientas como activas y conserva los proveedores/modelos efectivos actuales. Revertir la UI no elimina la tabla; revertir la migración solo es admisible si no existen pausas o excepciones materiales. La restauración de configuración crea otra versión, no reescribe historia.

## Propiedad documental

012 conserva proveedores, jobs y producción; 006/026 conservan recursos; 008/016/031/033 conservan calificación y tiempos; 029 conserva permisos. 034 documenta el centro administrativo y actualizará `specs/README.md` e inventario sin reasignar contratos incompatibles.

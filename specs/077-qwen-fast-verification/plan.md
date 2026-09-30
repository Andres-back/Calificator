# Plan 077 — Qwen en verificación y arbitraje

Issue #161; alcance y plan limitado aprobados por el usuario el 2026-09-30. Evolución compatible de 008/052.

## Contexto técnico

Backend Python/FastAPI, httpx y Celery existentes; configuración PostgreSQL con caché Redis. Ningún cambio frontend, endpoint, esquema o timeout. Qwen usa el protocolo Messages de OpenCode, no Chat Completions.

## Constitución y decisiones

- Roles/permisos: sin ampliaciones; publicación administrativa y recalificación demo autorizadas.
- Integridad: sin cambios en criterios, cálculos, consolidación ni publicación; salidas truncadas siguen siendo errores.
- Recuperabilidad: no cancelar inferencias en curso; publicar configuración con snapshot y validación concurrente.
- Secretos/datos: reutilizar credenciales cifradas actuales, no versionar evidencia ni nombres estudiantiles.
- Despliegue: rama/PR/CI antes de main; medir producción y conservar reversión administrativa.

## Fases

1. Añadir reconocimiento visual del identificador conocido Qwen 3.8 Flash.
2. Extender el control de pensamiento con etapa opcional: Qwen solo en verificación/arbitraje; DeepSeek sin cambios. Aplicarlo a ambas ramas del adaptador OpenCode.
3. Añadir regresiones en los tres archivos de pruebas existentes para protocolo, imagen, presupuesto/truncamiento y etapas excluidas.
4. Ejecutar pruebas focalizadas, lint y revisión de diff; Analyze y Converge sin tareas funcionales pendientes. CI completo del PR comprueba el resto.
5. Fusionar con CI verde. Esperar despliegue reproducible, comprobar el código real en backend y worker y que no haya trabajos activos antes de cualquier reinicio necesario.
6. Publicar únicamente las dos rutas de revisión a Qwen con el servicio administrativo existente; actualizar solo su capacidad de catálogo si hace falta. Mantener todos los demás valores y respaldos. Obtener snapshot restaurable.
7. Reutilizar entrega demo autorizada, medir desde cola hasta persistencia y confirmar modelo visual observado, cobertura de preguntas y estado de revisión. No publicar ni editar claves incorrectas de la demo. Registrar resultado en issue; documentación final por commit/PR si precisa cambios.

## Pruebas

Pruebas locales: test_opencode_model_gateway.py, test_ai_model_discovery.py, test_photo_grading_failures.py y regresiones de router relacionadas. CI backend/frontend/E2E/build/gobernanza antes del merge. Una muestra productiva E2E y, si el arbitraje no se activa, una muestra directa autorizada y acotada del comparador; no una prueba de carga de 30 alumnos.

## Reversión

La publicación guarda la configuración anterior y genera versión/auditoría. Restaurar solo si es todavía la última publicación, para no borrar cambios posteriores; ante concurrencia preparar y validar una publicación limitada inversa. El parche puede permanecer: es aditivo y solo se activa al seleccionar Qwen en las etapas indicadas.

## Estructura

Cambios en backend/app/services/{llm_router,ai_model_discovery}.py, backend/app/modules/calificaciones/agents.py y pruebas unitarias existentes. Artefactos en specs/077-qwen-fast-verification; ningún proveedor o módulo nuevo.

## Bloqueos de CI detectados

La validación inicial identificó baseline estático de specs pendiente de registrar 077 y Axios vulnerable (versiones hasta 1.19.0). Como paso necesario de entrega, registrar 077 y fijar Axios 1.20.0 con lockfile mecánico, auditoría de producción y CI frontend completo. No se omite ningún control ni se cambia código de interfaz. [Release oficial](https://github.com/axios/axios/releases/tag/v1.20.0).

La auditoría backend identificó además PyJWT 2.13.0 vulnerable: actualizar a 2.15.0 según versiones corregidas indicadas por pip-audit y comprobar tokens/login sin modificar su implementación. [Release oficial](https://github.com/jpadilla/pyjwt/releases/tag/2.15.0).

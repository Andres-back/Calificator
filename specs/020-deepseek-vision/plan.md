# Plan de implementación: extracción visual robusta con DeepSeek

**Rama**: `codex/020-deepseek-vision` | **Fecha**: 2026-08-24 | **Spec**: [spec.md](spec.md)

## Contexto técnico

- Backend: Python 3.12, FastAPI, Pydantic v2, SQLAlchemy async y Celery.
- Frontend: React/TypeScript; no cambia contrato público ni flujo online.
- Proveedor: OpenCode Go, Chat Completions compatible.
- Modelo principal: `deepseek-v4-flash-vision-exp`.
- Fallbacks: configurables; Qwen/MiMo no se eliminan si tienen consumidores.
- Evidencia: una imagen o PDF consolidado de hasta 20 páginas.
- Calidad: pytest, Vitest, TypeScript, ESLint, build y E2E aplicables.

## Comprobación constitucional

- Roles: no cambia permisos.
- Integridad: la visión no decide nota y la ilegibilidad exige revisión.
- Asincronía: conserva worker, idempotencia y estados terminales.
- Datos: contrato aditivo en JSON existente; sin migración destructiva.
- Accesibilidad: estados existentes siguen visibles en frontend.
- IA intercambiable: nuevo contrato y configuración desacoplan el proveedor.
- Pruebas: incluye matriz de fallos y regresión online.
- Main: rama y PR; no push directo.

## Diseño

1. Introducir modelos Pydantic para extracción, respuesta y página.
2. Crear un `VisionExtractor` OpenCode que prepare páginas, limite concurrencia, aplique timeout/retry y valide/repare JSON una vez.
3. Adaptar el orquestador para consumir extracción normalizada y mantener el grader textual.
4. Reutilizar el extractor en digitalización de evaluaciones con un propósito distinto.
5. Ampliar telemetría segura y estados terminales sin almacenar evidencia en logs.
6. Medir llamada directa y recorrido interno con el mismo fixture sintético.

## Archivos previstos

- `backend/app/core/config.py`
- `backend/app/services/vision_extractor.py`
- `backend/app/modules/calificaciones/agents.py`
- `backend/app/modules/calificaciones/orchestrator.py`
- `backend/app/modules/evaluaciones/digitalize_service.py`
- `backend/app/workers/tasks_grading.py`
- `backend/.env.example`
- `backend/tests/unit/test_vision_extractor.py`
- pruebas de orquestación, digitalización y workers existentes.

## Puertas de calidad

- No hay `read=None` en llamadas visuales.
- Máximo dos intentos totales por modelo y solo para fallos transitorios.
- Fallo parcial de página conserva las páginas exitosas y requiere revisión.
- Pregunta ilegible no participa en validación determinista.
- Evaluaciones online no instancian el extractor.
- Ningún log contiene datos URL, base64, prompt o clave.

## Aprobación

El usuario entregó modelo, arquitectura, estados, pruebas y criterios de aceptación explícitos; se registra como aprobación humana de especificación y plan para esta implementación.

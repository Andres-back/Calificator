# Plan: calificación con salida completa

**Rama**: `codex/118-calificacion-salida-completa` | **Fecha**: 2026-10-23 | **Spec**: [spec.md](spec.md) | **Issue**: #251

## Resumen

Hotfix aprobado: estimar la salida por componentes del blueprint y etapa dentro de un techo configurable; aplicarlo en valoración, verificación y recuperación existentes. Clasificar truncamiento explícito y conservar conteos seguros disponibles. No añade intentos, rutas, modelos ni migraciones.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11 Linux; FastAPI y SQLAlchemy existentes.
**Dependencias**: Pydantic, HTTPX, Celery y contratos Responses/Chat Completions/Messages; ninguna nueva.
**Persistencia**: PostgreSQL actual, campos existentes de diagnóstico y ledger; sin migración ni reparación masiva.
**Pruebas**: pytest, Ruff, regresiones de transporte/agentes/orquestación/recalificación y prueba aislada con copia anónima autorizada.
**Plataforma objetivo**: backend/worker Linux; interfaz docente existente sin cambios.
**Rendimiento y escala**: probar 1, 8, 24 y 100 componentes; techo inicial configurable de 16 384 tokens. El límite no obliga a consumirlos; no se agregan llamadas ni se prometen tiempos universales.

## Verificación de la constitución

- Separación de roles: no cambia rutas ni permisos; repetir regresiones de recalificación.
- Integridad y trazabilidad: salida cortada nunca produce cero; historial y evidencia conservados.
- Asincronía e idempotencia: misma cola, versiones y máximo de intentos.
- Datos y secretos: solo códigos permitidos y enteros no negativos; copia anónima, credencial en VPS.
- Accesibilidad: sin cambios visuales; prueba usa el componente real.
- Portabilidad: presupuesto por componentes, no nombres; tres protocolos cubiertos.
- Gobernanza y pruebas: hotfix autorizado, issue #251; aprobación spec explícita, pausa separada de plan omitida por proceso de hotfix. PR/CI obligatorios.

## Estructura del proyecto

- `backend/app/modules/calificaciones/output_budget.py`: función pura de presupuesto reutilizando scaffold.
- `backend/app/core/config.py`: techo configurable documentado.
- `backend/app/modules/calificaciones/agents.py`: presupuesto y diagnóstico seguro en agentes/ledger.
- `backend/app/services/ai_api_transport.py`: causa estable, sin salida cruda.
- `backend/app/modules/analytics/usage_logger.py`: preservar solo códigos permitidos.
- `backend/app/modules/calificaciones/orchestrator.py`: causas técnicas seguras cuando no hay nota.
- `backend/tests/unit/`: presupuesto, transporte, agentes, ledger y fallos.

## Decisiones y complejidad

Estimación por componentes y tamaño del contrato, con mínimo de etapa y techo; calibración con salida real permitida. No recortar preguntas, respuestas ni imágenes. Alternativas rechazadas: aceptar JSON truncado (inseguro), aumentar intentos a ciegas (coste), cambiar modelos (fuera de alcance) o una llamada por pregunta (latencia). Sin tecnologías nuevas que investigar; se reutilizan contratos inspeccionados. Revisión constitucional tras diseño: cumple.

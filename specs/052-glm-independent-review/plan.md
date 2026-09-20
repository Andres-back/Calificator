# Plan: Revisión independiente con GLM 5.3 Flash

**Rama**: `codex/052-glm-independent-review` | **Fecha**: 2026-09-20 | **Spec**: [spec.md](./spec.md) | **Issue**: [#103](https://github.com/Andres-back/Calificator/issues/103)

## Resumen

Mantener `deepseek-v4-flash-vision-exp` como extractor visual principal y usar
`glm-5.3-flash` como primer respaldo visual y como verificador textual independiente.
La implementación reutiliza la cascada, el enrutamiento por etapa, la telemetría y los
trabajos asíncronos existentes; no añade una llamada obligatoria ni cambia la autoridad de
la suma por pregunta introducida por la especificación 051.

## Contexto técnico

**Lenguajes/versiones**: Python 3.12, PostgreSQL y Alembic
**Dependencias**: FastAPI, httpx, SQLAlchemy; API compatible de OpenCode Go
**Persistencia**: `ai_provider_models` y `ai_feature_routing`; sin tablas nuevas
**Pruebas**: pytest unitario e integración enfocada, Ruff sobre archivos modificados
**Plataforma objetivo**: backend Docker de XCalificator y panel administrativo existente
**Rendimiento y escala**: verificación GLM menor a 10 s en prueba controlada; extracción
principal sin latencia adicional y respaldo ejecutado solamente ante falla o evidencia no usable

## Verificación de la constitución

- Separación de roles: cumple; solo cambia configuración institucional administrable.
- Integridad y trazabilidad: cumple; cada etapa conserva proveedor, modelo, latencia y resultado.
- Asincronía e idempotencia: cumple; se reutiliza un único trabajo y la cascada existente.
- Datos y secretos: cumple; no se agregan credenciales ni contenido estudiantil al repositorio.
- Accesibilidad: no aplica; no se cambia la interfaz pública.
- Gobernanza y pruebas: cumple mediante issue #103, especificación, plan, tareas y regresiones.

## Estructura del proyecto

- `backend/app/core/config.py`: valores seguros de contingencia.
- `backend/app/services/ai_model_discovery.py`: clasificación multimodal de GLM.
- `backend/app/services/ai_config_service.py`: catálogo y capacidades de rutas por etapa.
- `backend/app/services/ai_configuration_resolver.py`: capacidad textual de la revisión adicional.
- `backend/alembic/versions/`: migración reversible y respetuosa de personalizaciones.
- `backend/tests/`: regresiones de catálogo, rutas, migración y cascada.
- `specs/052-glm-independent-review/` y `specs/README.md`: trazabilidad viva.

## Decisiones y complejidad

- GLM no reemplaza al extractor principal: DeepSeek fue más rápido en la evidencia real y ya tiene telemetría estable.
- GLM verifica texto estructurado para aportar independencia sin reenviar siempre la imagen.
- GLM se agrega primero a la cascada visual; Qwen y MiMo permanecen como contingencias posteriores.
- La migración solo sustituye rutas institucionales todavía iguales a los valores automáticos anteriores; no sobreescribe selecciones explícitas del administrador o del docente.
- No se introduce un límite de tiempo que cancele una inferencia aceptada por el proveedor.

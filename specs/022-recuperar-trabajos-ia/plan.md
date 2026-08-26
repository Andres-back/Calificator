# Plan: Recuperación de trabajos de IA

**Rama**: `codex/022-recuperar-trabajos-ia` | **Fecha**: 2026-08-26 | **Spec**: [spec.md](./spec.md) | **Issue**: [#31](https://github.com/Andres-back/Calificator/issues/31)

## Resumen

Corregir las lecturas PostgreSQL que fuerzan UUID a texto, ampliar el límite de captura de errores para que una preparación fallida finalice el job y añadir una tarea periódica que vuelva a publicar únicamente trabajos `queued` antiguos. La reclamación se mantendrá idempotente y nunca actuará sobre una inferencia `running`.

## Contexto técnico

**Backend**: Python 3.11, SQLAlchemy async, PostgreSQL 16, Celery 5 y Redis 7  
**Pruebas**: pytest unitario e integración PostgreSQL  
**Datos**: sin migración ni tablas nuevas; se reutiliza `ai_jobs.input_json`  
**Compatibilidad**: contratos HTTP y estados públicos existentes

## Diseño

1. Pasar objetos UUID nativos a las consultas de entrada y tiempo de cola, sin `bindparams` que los convierta en `VARCHAR`.
2. Encerrar toda la preparación del lote dentro de la finalización segura del job; si falla, persistir `failed` y conservar entrega/evidencia recuperables.
3. Consultar trabajos `queued`, sin `started_at`, anteriores al umbral; devolver solo datos mínimos necesarios para publicar la tarea correspondiente.
4. Ejecutar el reconciliador periódicamente desde Celery Beat. La tarea vuelve a publicar el job existente; no crea registros nuevos.
5. Antes de procesar, reclamar atómicamente el job. Si otra ejecución ya lo reclamó o alcanzó estado terminal, la copia duplicada termina sin calificar.

## Verificación constitucional

- **Integridad**: se conserva una única calificación vigente y la evidencia original.
- **Asincronía recuperable**: el job siempre queda observable y los `queued` huérfanos se recuperan.
- **IA segura**: se conserva la instantánea sanitizada; no se registran prompts, evidencias ni claves.
- **Producción protegida**: issue, rama, especificación, regresión, PR y CI; sin push directo a `main`.

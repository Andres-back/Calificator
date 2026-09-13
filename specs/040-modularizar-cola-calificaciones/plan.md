# Plan: Encolado seguro de calificaciones

**Rama**: `codex/040-modularizar-cola-calificaciones` | **Fecha**: 2026-09-12 | **Spec**: [spec.md](./spec.md) | **Issue**: #82

## Resumen

Extraer del router de calificaciones el coordinador que persiste una calificación pendiente y crea sus trabajos padre e hijo antes de publicar la tarea en Celery. La extracción conservará el orden transaccional actual —persistir, confirmar y luego publicar—, el identificador del trabajo hijo como vínculo de trazabilidad y la recuperación existente cuando el broker no acepta el mensaje.

La primera frontera será deliberadamente pequeña: abarcará únicamente `_enqueue_persisted_grading`, usado por cinco recorridos individuales. El endpoint por lote permanecerá en el router porque coordina una transacción multiestudiante distinta. El router conservará un alias compatible para no romper llamadas ni pruebas que sustituyen ese punto de integración.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11; contratos HTTP consumidos por el frontend TypeScript/React sin cambios
**Dependencias**: FastAPI, SQLAlchemy asíncrono, Celery y Redis ya instalados; no se añaden paquetes
**Persistencia**: PostgreSQL mediante los modelos existentes `Entrega`, `Calificacion` y trabajos de IA; sin migraciones
**Pruebas**: pytest unitario e integración, Ruff, `compileall`, gobierno Spec Kit e inventario del sistema
**Plataforma objetivo**: backend Docker/Linux y entorno local Windows, con despliegue posterior al merge protegido a `main`
**Rendimiento y escala**: mantener respuestas HTTP asíncronas sin esperar inferencia; no agregar consultas, commits ni mensajes; preservar una única ejecución efectiva por entrega aun con 30 evidencias y al menos 3 docentes concurrentes

## Verificación de la constitución

- **Separación de roles**: cumple. No se modifican autenticación, permisos ni selección de profesor/estudiante; el servicio recibe identidades ya autorizadas por el router.
- **Integridad y trazabilidad**: cumple. La `Entrega`, la `Calificacion` pendiente, el trabajo padre y el hijo conservan sus relaciones e identificadores; no se publica una nota ficticia ante fallos.
- **Asincronía e idempotencia**: cumple y es el objetivo central. El commit ocurre antes de `apply_async`; la reclamación atómica, los leases y la recuperación continúan en `jobs_service` y el worker sin alteraciones.
- **Migraciones seguras y código muerto**: cumple. No hay cambios de esquema; se reduce responsabilidad del router sin eliminar el alias hasta verificar todos los consumidores.
- **Accesibilidad y experiencia móvil**: no aplica directamente. No cambia UI, textos, estados visibles ni navegación.
- **Proveedores de IA y secretos**: cumple. La configuración capturada en el trabajo padre se copia al hijo exactamente como hoy; no se cambian modelos, credenciales ni selección de proveedor.
- **Pruebas y CI**: cumple. La rama e issue existen, la especificación fue aprobada y se añadirán pruebas directas del nuevo servicio más regresiones de persistencia, duplicados, lote y recuperación.
- **Protección de `main`**: cumple. La implementación se hará en esta rama y llegará a `main` únicamente mediante PR y CI verde.

## Estructura del proyecto

```text
backend/
├── app/modules/calificaciones/
│   ├── router.py                         # conserva rutas y alias compatible
│   └── grading_queue_service.py          # nuevo límite de coordinación individual
└── tests/
    ├── unit/
    │   ├── test_grading_queue_service.py
    │   ├── test_photo_grading_persistence.py
    │   ├── test_online_grading_persistence.py
    │   ├── test_mixed_evaluation_flow.py
    │   ├── test_calificaciones_lote_async.py
    │   ├── test_tasks_grading.py
    │   └── test_worker_queue_routing.py
    └── integration/
        └── test_ai_job_leases.py

specs/040-modularizar-cola-calificaciones/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── grading-queue-contract.md
└── checklists/
    └── requirements.md

specs/README.md
specs/system-inventory/current.json
tests/spec_governance/test_spec_baseline.py
```

## Diseño

### Límite del servicio

`grading_queue_service.enqueue_persisted_grading(...)` recibirá la evaluación autorizada, la entrega ya preparada, las identidades de estudiante y profesor, metadatos opcionales de evidencia y una calificación existente opcional. Su única salida será la `Calificacion` pendiente ya confirmada y enlazada al trabajo hijo.

El servicio ejecutará, en el mismo orden actual:

1. Crear el trabajo padre `calificacion_lote` y capturar su configuración de IA.
2. Crear el trabajo hijo `calificacion_entrega`, enlazado a la entrega y al padre.
3. Preparar o actualizar la calificación pendiente con el identificador del hijo.
4. Agregar la calificación a la sesión únicamente cuando sea nueva.
5. Agregar el estado del padre, hacer commit y refrescar la calificación.
6. Publicar el trabajo hijo en la cola `grading`.
7. Si la publicación falla, marcar ese mismo hijo como `retrying`, confirmar el estado recuperable y devolver la calificación guardada.

### Compatibilidad

`router.py` importará el módulo y expondrá temporalmente:

```python
_enqueue_persisted_grading = grading_queue_service.enqueue_persisted_grading
```

Los cinco consumidores actuales conservarán llamadas y respuestas. Esta compatibilidad también protege pruebas que sustituyen el coordinador en el router. Los imports directos de `jobs_service` y `grade_delivery` permanecerán en el router porque el endpoint por lote todavía los usa.

### Alcance excluido

- No se mueve la creación multiestudiante del endpoint por lote.
- No se cambia el worker ni su reclamación atómica.
- No se altera la recuperación de trabajos atascados o no publicados.
- No se cambian endpoints, códigos HTTP, esquemas, modelos, textos o estados visibles.
- No se optimizan en esta fase la velocidad ni la selección de modelos de IA.

## Estrategia de pruebas

1. Pruebas unitarias directas del nuevo servicio para orden de persistencia/publicación, reutilización de calificación y fallo del broker.
2. Regresiones de los cinco recorridos consumidores mediante las pruebas existentes de foto, online y evaluación mixta.
3. Regresiones de lote, enrutamiento a la cola y worker idempotente.
4. Integración de leases para reclamación concurrente, recuperación y mensajes duplicados.
5. Validaciones estáticas y de gobierno: Ruff, compilación, Spec governance, inventario y `git diff --check`.

## Decisiones y complejidad

| Decisión | Justificación | Alternativa descartada |
|---|---|---|
| Extraer solo el coordinador individual | Es una unidad cohesiva con cinco consumidores y comportamiento observable estable | Mover también el lote mezclaría dos límites transaccionales y elevaría el riesgo |
| Mantener alias privado en el router | Conserva compatibilidad de llamadas y monkeypatches mientras el módulo se estabiliza | Cambiar todos los consumidores y pruebas de una vez aumenta superficie sin beneficio funcional |
| Confirmar antes de publicar | La evidencia y la calificación sobreviven a una caída del broker y pueden recuperarse | Publicar antes del commit permite que el worker busque datos todavía inexistentes |
| Reutilizar el mismo trabajo hijo al fallar la publicación | Preserva trazabilidad e idempotencia | Crear otro trabajo produciría duplicados y rompería el vínculo de la calificación |
| No crear una abstracción genérica de colas | El contrato pertenece al dominio de calificación y usa entidades específicas | Un wrapper genérico ocultaría invariantes y anticiparía necesidades no demostradas |

## Verificación posterior al diseño

El diseño continúa cumpliendo los ocho principios constitucionales: no amplía permisos, conserva evidencia y trazabilidad, mantiene asincronía e idempotencia, no toca datos ni secretos, no afecta UI, respeta proveedores intercambiables, exige pruebas de regresión y se integra exclusivamente mediante PR protegido. No se requieren excepciones constitucionales.

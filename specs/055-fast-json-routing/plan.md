# Plan de implementación: respuesta estructurada y rutas rápidas

**Rama**: `codex/055-fast-json-routing` | **Fecha**: 2026-09-20 | **Spec**: [spec.md](spec.md)

**Entrada**: incidente productivo registrado en [#109](https://github.com/Andres-back/Calificator/issues/109).

## Resumen

Reducir el tiempo y aumentar la confiabilidad de digitalización y calificación sin cambiar la fórmula ni los contratos públicos. El verificador rápido recibirá un contexto compacto y únicamente controles admitidos por su modelo, detectará finalización por límite antes de parsear y, si no produce una nota, devolverá inmediatamente el resultado principal como propuesta pendiente de revisión en lugar de lanzar otra inferencia lenta. La ruta operativa de estructuración se actualizará a un modelo disponible y se comprobará con la imagen real autorizada.

## Contexto técnico

**Lenguaje/versión**: Python 3.12; TypeScript 5.x sin cambios previstos.

**Dependencias principales**: FastAPI, Celery, HTTPX y clientes compatibles con OpenAI; no se agregan dependencias.

**Almacenamiento**: PostgreSQL para trabajos, configuración y resultados existentes; sin cambios de esquema.

**Pruebas**: pytest focalizado, Ruff, pruebas de gobernanza y dos recorridos reales controlados en producción.

**Plataforma objetivo**: contenedores Linux en VPS, navegador web de escritorio/móvil.

**Tipo de proyecto**: aplicación web con API y workers asíncronos.

**Metas de rendimiento**: digitalización y calificación de la imagen de referencia en menos de 20 s cada una cuando los proveedores responden normalmente.

**Restricciones**: no publicar notas, no cambiar suma por pregunta, no ocultar fallos de verificación, no cancelar una solicitud aceptada por el proveedor.

**Escala/alcance**: una corrección focalizada en clientes de IA, consolidación y configuración operativa; sin endpoints, tablas ni vistas nuevas.

## Verificación de la constitución

- **Roles**: no se alteran permisos ni navegación.
- **Integridad**: la nota sigue derivándose de componentes; cualquier verificación incompleta exige revisión docente.
- **Asincronía**: los jobs existentes continúan como fuente de verdad, sin nuevos estados.
- **Datos**: no hay migraciones ni borrados.
- **Accesibilidad**: se valida el estado visible de éxito/revisión; no cambia la interfaz base.
- **IA intercambiable**: la ruta sigue siendo configurable y la corrección evita depender de un resultado mal formado.
- **Pruebas**: se añade regresión específica y se conserva CI completo.
- **Despliegue**: issue, spec, rama, PR y CI; no hay push directo a `main`.

**Resultado del gate**: aprobado, sin excepciones.

## Investigación y decisiones

Consultar [research.md](research.md). La evidencia principal es que la salida de GLM registró exactamente 1.536 tokens y falló al cerrar el JSON; después se ejecutó una comparación adicional de 27.084 ms. La digitalización consultó un modelo Groq inexistente y una credencial OpenAI inválida antes del respaldo.

## Diseño

- Centralizar los controles compatibles por modelo de OpenCode: desactivar razonamiento únicamente para DeepSeek V4 Flash Vision Exp y omitir el campo no admitido por GLM 5.3 Flash.
- Tratar `length` o `max_tokens` como salida truncada antes de registrar una respuesta útil.
- Si uno de los dos evaluadores no produce nota, conservar de inmediato la salida válida, añadir alerta y exigir revisión; no ejecutar arbitraje con el mismo modelo fallido.
- Mantener arbitraje únicamente cuando existen dos notas comparables con discrepancia real.
- Actualizar la configuración institucional de `digitalizacion.estructura` a una ruta disponible; conservar respaldo válido.

## Estructura del proyecto

### Documentación

```text
specs/055-fast-json-routing/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/requirements.md
└── tasks.md
```

### Código afectado

```text
backend/app/services/llm_router.py
backend/app/modules/calificaciones/agents.py
backend/tests/unit/test_comparator_feedback.py
backend/tests/unit/test_opencode_model_gateway.py
backend/tests/unit/test_photo_grading_failures.py
backend/tests/unit/test_llm_router_output_budget.py
specs/README.md
specs/system-inventory/baseline.json
```

**Decisión de estructura**: se modifica únicamente la lógica existente de clientes y consolidación; no se crean módulos nuevos.

## Contratos y datos

No cambian endpoints, esquemas, entidades ni formatos públicos. [data-model.md](data-model.md) registra explícitamente la ausencia de cambios. La validación ejecutable está en [quickstart.md](quickstart.md).

## Revisión posterior al diseño

El diseño mantiene todos los principios constitucionales. La degradación conserva evidencia, nota por componentes y revisión humana; nunca fabrica consenso ni publica automáticamente.

# Plan: Acelerar los procesos de IA

**Rama**: `codex/031-acelerar-pipelines-ia` | **Fecha**: 2026-09-03 | **Spec**: [spec.md](./spec.md) | **Issue**: #64

## Resumen

Se optimizarán calificación, digitalización y presentaciones sin recortar la explicación por respuesta ni abandonar solicitudes lentas. La intervención se divide en cuatro capas: límites de salida correctos para todos los contratos de OpenCode; pipelines que reutilizan resultados y reparan solo lo defectuoso; colas Celery separadas por función; y una cola grupal persistente formada por un trabajo padre y hasta 30 trabajos hijos independientes.

La medición previa muestra que el modelo visual rápido no es el principal cuello de botella de una calificación individual. El lote actual agrupa todas las entregas en una sola tarea y las recorre secuencialmente. En presentaciones, una diapositiva inválida puede provocar la regeneración completa y una revisión generativa adicional, mientras el contrato `chat/completions` de OpenCode no recibe el límite de salida configurado. El cambio atacará estas causas antes de aumentar capacidad.

## Contexto técnico

**Lenguajes/versiones**: Python 3.12 en contenedores, TypeScript 5.6, React 18, PostgreSQL 16 y Redis 7.
**Dependencias**: FastAPI 0.139, SQLAlchemy async 2.0, Alembic 1.14, Celery 5.4, httpx 0.28, Pydantic 2.10, TanStack Query 5, Vitest 4 y Playwright 1.61.
**Persistencia**: PostgreSQL para trabajos, entregas, calificaciones, desgloses y telemetría; Redis como broker/backend de Celery; almacenamiento persistente para evidencias y exportaciones.
**Pruebas**: pytest unitario/integración, Vitest, TypeScript, ESLint, Playwright con proveedores simulados y una prueba controlada posterior al despliegue.
**Plataforma objetivo**: Docker Compose en Linux/VPS y frontend web responsivo. El VPS observado dispone de 6 vCPU, 11 GiB de RAM y unos 7.1 GiB disponibles; el worker actual consume aproximadamente 335 MiB con concurrencia 2.
**Rendimiento y escala**: calificación visual p50 menor de 45 s y p95 menor de 90 s; digitalización p50 menor de 60 s y p95 menor de 120 s; 95 % de presentaciones estándar de ocho diapositivas con imágenes menor de 120 s; lote de 30 evidencias sin pérdidas, duplicados ni bloqueo global; al menos tres profesores concurrentes.

## Verificación de la constitución

- Separación de roles: cumple. Los endpoints de lote, detalle y métricas conservarán permisos de calificación o administración y verificarán propiedad de materia/evaluación.
- Integridad y trazabilidad: cumple. La restricción de una calificación vigente por entrega se conserva; cada trabajo hijo registra modelo, etapa, tiempos, reintentos y resultado, y la decisión final sigue siendo docente.
- Asincronía e idempotencia: cumple. Los trabajos se persisten antes de publicar en Redis; el padre agrega estado y cada hijo usa reclamación/lease independiente, clave idempotente y recuperación tras caída.
- Datos y secretos: cumple. La telemetría excluye claves, texto de respuestas e imágenes; registra solo identificadores técnicos, cantidades, modelos, latencias y códigos de error seguros.
- Accesibilidad: cumple. El progreso será textual además de visual, no dependerá del color y seguirá disponible al navegar, recargar o cambiar de dispositivo.
- Gobernanza y pruebas: cumple. La implementación comenzará únicamente después de `plan-approved`; se añadirán migración, pruebas de regresión, carga controlada y CI antes del PR.

### Reevaluación posterior al diseño

El diseño mantiene todos los principios. La migración es aditiva y reversible; no elimina columnas ni trabajos históricos. La separación de colas no cambia contratos de calificación ni publica notas automáticamente. El único aumento deliberado de complejidad es la relación padre-hijo de trabajos, justificada por aislamiento, recuperación y observación individual de 30 evidencias.

## Estructura del proyecto

```text
backend/
├── alembic/versions/                 # migración aditiva de leases y relación padre-hijo
├── app/core/config.py                # concurrencia, colas y presupuestos por función
├── app/modules/admin_ai_config/      # capacidades y métricas agregadas por ruta/modelo
├── app/modules/calificaciones/       # validación atómica, lote, desglose y orquestación
├── app/modules/jobs/                 # padre/hijos, leases, progreso y recuperación
├── app/modules/presentaciones/       # reparación localizada, progreso y exportación
├── app/services/llm_router.py        # límite de salida uniforme y detección de truncado
└── app/workers/                      # routing Celery y workers por función

frontend/src/
├── modules/admin_ai/                 # advertencias y desempeño por capacidad
├── modules/calificaciones/           # preparación y resumen de cola de 30
├── modules/evaluaciones/             # progreso por etapas de digitalización
└── modules/presentaciones/           # progreso de contenido, imágenes y exportación

docker-compose.yml                    # workers aislados y healthchecks
backend/tests/                        # regresión, idempotencia, carga y calidad
frontend/src/**/*.test.tsx            # estados, progreso y compatibilidad
frontend/e2e/                          # flujos críticos simulados
```

## Diseño técnico

### 1. Enrutamiento y presupuestos de modelo

- Mantener `DeepSeek V4 Flash Vision Exp` como ruta visual inicial para calificación y digitalización mientras las métricas sigan respaldándolo.
- Separar las rutas de texto de las de visión: presentaciones y calificación de texto usarán una ruta textual compatible configurada, sin sustituir silenciosamente una elección explícita del administrador o profesor.
- Aplicar el presupuesto de salida de OpenCode tanto a `messages` como a `chat/completions`; el adaptador traducirá el límite al campo compatible con cada contrato.
- Registrar razón de terminación y rechazar como incompleto un JSON truncado. Un resultado incompleto queda reintentable y conserva cualquier etapa previa válida.
- Mostrar en administración capacidad declarada, muestra disponible, p50/p95 y advertencia de incompatibilidad o ineficiencia. Las muestras pequeñas se etiquetarán como insuficientes.

### 2. Calificación individual y grupal

- Conservar la extracción visual única, validación objetiva, desglose por pregunta, verificación, arbitraje condicional y revisión docente.
- Introducir `procesando` como estado explícito de la calificación provisional. Al confirmar la evidencia se guardarán de forma coherente entrega `procesando`, calificación `procesando` y trabajo `queued`; el texto visible será “Calificando”.
- Tratar una nota nula como ausencia de resultado en todo selector, promedio, tarjeta, boletín y diálogo. Solo una nota cero no nula podrá mostrarse y confirmarse como cero real.
- Evitar llamadas repetidas a visión y reutilizar la extracción normalizada en evaluadores textuales.
- Mantener secuenciales las etapas con dependencia real —el verificador actual recibe el resultado primario— y paralelizar únicamente trabajo independiente, principalmente entre estudiantes diferentes.
- Convertir el lote en un trabajo padre y un trabajo hijo por paquete de evidencia. El padre no ejecuta IA: valida, agrega estados y permite consultar el conjunto.
- Publicar cada hijo en la cola `grading`. Un fallo, reintento o evidencia ilegible afecta solo ese hijo; los demás continúan.
- Usar leases persistentes con heartbeat para recuperar tanto trabajos `queued` como `running` abandonados. La adquisición atómica impide que dos mensajes procesen la misma entrega a la vez.
- Mantener el endpoint y la respuesta mínima actuales; añadir campos compatibles para totales e inspección individual.

### 3. Digitalización

- Enviar la evidencia visual una sola vez, conservar el resultado extraído y estructurar desde ese resultado.
- Persistir etapas `queued`, `preparing`, `extracting`, `structuring`, `validating` y terminal.
- Enrutar a `digitalization`, separada de presentaciones y calificaciones. Sus reintentos reutilizan archivos y resultados parciales persistidos.

### 4. Presentaciones

- Solicitar exactamente el número de diapositivas y un esquema JSON acotado, con presupuesto de salida proporcional.
- Ejecutar una generación completa inicial; aplicar normalización, reparación determinista y controles pedagógicos antes de considerar otra llamada.
- Si persiste un defecto localizado, enviar al modelo solo las diapositivas afectadas y sus dependencias, no el conjunto completo.
- Ejecutar revisión generativa de exactitud únicamente cuando los validadores detecten riesgo matemático, factual o de dependencia no resoluble localmente.
- Mantener la generación de imágenes en paralelo con límite configurable y persistir progreso `x/n`; un fallo visual usa sustitución explícita sin perder el contenido.
- Generar PDF y PPTX desde la misma fuente canónica. Las exportaciones se ejecutarán en paralelo solo después de demostrar que sus constructores no comparten estado mutable; de lo contrario se mantendrán secuenciales y se medirán.

### 5. Capacidad de workers

- Definir colas `grading`, `digitalization`, `presentations` y `default`, con routing explícito también para recuperación.
- Desplegar inicialmente workers separados usando la misma imagen: calificación con concurrencia 4, digitalización con concurrencia 1 y presentaciones con concurrencia 1. La capacidad observada del VPS permite este punto de partida, sujeto a prueba de memoria y proveedor.
- Conservar `worker_prefetch_multiplier=1`, `acks_late` y rechazo al perder worker. Añadir límites de concurrencia hacia el proveedor para evitar ráfagas y respuestas 429.
- La prioridad se obtiene mediante capacidad reservada, no cancelando ni acortando solicitudes en curso.

### 6. Observabilidad y experiencia

- Persistir tiempos de cola y de cada etapa, modelo efectivo, tokens disponibles, reintentos, fallback y razón terminal.
- Actualizar progreso al comenzar cada etapa y durante imágenes/lotes. La primera confirmación visible debe ocurrir en menos de dos segundos.
- El frontend consultará el padre para un resumen compacto y cargará hijos bajo demanda; no hará 30 sondeos independientes cada tres segundos.
- Los estados terminales serán `success`, `requires_review`, `failed_permanent` o `cancelled`; los transitorios permanecen `queued/running/retrying` hasta resolución o intervención explícita.
- Estudiante y profesor observarán la misma semántica: `queued` y `running` se presentan como “Calificando”; `requires_review` solo aparece después de un resultado o fallo que realmente necesite intervención.

## Despliegue y reversión

1. Aplicar la migración aditiva sin detener consumidores antiguos.
2. Desplegar código con routing compatible y workers nuevos aún con concurrencia conservadora.
3. Ejecutar fixtures de referencia y una cola simulada de 30; después, una prueba mínima real por función.
4. Activar reparación localizada y presupuestos por configuración.
5. Medir p50/p95 y ajustar concurrencia sin superar límites del proveedor ni memoria del VPS.
6. Revertir mediante configuración a la cola común/pipeline anterior si aparece regresión; las columnas nuevas pueden permanecer sin afectar la versión previa.

## Decisiones y complejidad

- Se rechaza aumentar únicamente `CELERY_CONCURRENCY`: seguiría existiendo competencia entre funciones y el lote seguiría siendo secuencial dentro de una tarea.
- Se rechaza imponer un timeout corto como mecanismo de velocidad: puede perder una respuesta todavía activa y dejar una entrega sin nota.
- Se rechaza eliminar el verificador o la explicación por pregunta: reduce transparencia y contradice la integridad de calificaciones.
- Se rechaza almacenar los 30 estados solo dentro de un JSON del padre: dificulta reclamación atómica, índices, recuperación y consultas individuales.
- Se acepta una migración aditiva y tres procesos worker porque es la mínima complejidad que ofrece aislamiento real y recuperación por evidencia.

## Artefactos de diseño

- [Investigación y decisiones](./research.md)
- [Modelo de datos](./data-model.md)
- [Contratos HTTP y de trabajos](./contracts/performance-api.md)
- [Guía de validación](./quickstart.md)

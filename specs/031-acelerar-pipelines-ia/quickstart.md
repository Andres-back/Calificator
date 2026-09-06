# Guía de validación

## Línea base anonimizada

Observaciones previas reportadas en producción, sin conservar nombres, archivos,
respuestas ni identificadores:

| Flujo | Línea base observada | Síntoma |
|---|---:|---|
| Calificación visual individual | más de 10 min en un caso | trabajo persistía sin resultado visible |
| Digitalización de evaluación | 3–5 min | lectura y estructuración sin etapa clara |
| Presentación con imágenes | sin fin útil en algunos casos | sondeo repetido y regeneración completa |

Estas cifras son referencia de incidente, no percentiles estadísticos. Comandos
reproducibles sin consumo pagado:

    Set-Location backend
    python -m pytest -q tests/integration/test_grading_batch_30.py
    python -m pytest -q tests/unit/test_presentaciones_performance.py
    python -m pytest -q tests/unit/test_digitalization_queue.py

## Avance local — 2026-09-04

Verificado sin llamadas pagadas, sin datos estudiantiles y sin cambios en producción:

- 61 pruebas backend focalizadas: persistencia física/online/mixta, ciclo de evaluación, presupuesto de OpenCode, tarea de calificación y lote; incluye una integración PostgreSQL real.
- PostgreSQL 16 aislado: migración de ida/vuelta, conservación de jobs históricos, 30 hijos con entregas distintas, reclamación concurrente única, heartbeat, recuperación de lease vencido, rechazo de resultados de un propietario antiguo y resumen concurrente de 29 éxitos/1 fallo.
- Agotamiento de recuperaciones: solo se finaliza un lease vencido; una inferencia con heartbeat y una espera de conector local siguen activas.
- Estados frontend: 38 pruebas focalizadas sobre notas nulas, cero real, fallo sin animación infinita, formulario de entrega sin reenvío, monitor, boletín y resumen de alumnos en la materia. Pruebas reutilizadas; no se creó otro archivo de prueba de workspace.
- 36 pruebas adicionales de telemetría, cola de digitalización, política de proveedores, fallos de visión y presupuesto de OpenCode pasan (las tres de presupuesto también están en el bloque anterior).
- TypeScript, lint estricto y build de producción correctos. Vite mantiene aviso de chunk mayor de 500 kB; no se amplió el alcance para rehacer bundles.
- Docker Compose valida su configuración. Esto no equivale a arrancar y verificar los cuatro workers.
- Se retiró únicamente el contenedor temporal PostgreSQL y sus datos sintéticos; no se tocaron otros contenedores ni bases persistentes.

La prueba PostgreSQL usa un esquema efímero propio y requiere `SPEC031_TEST_DATABASE_URL`; CI la ejecuta contra su base de pruebas, nunca contra producción. Comando:

```powershell
python -m pytest -q tests/integration/test_ai_job_leases.py
```

Pendientes antes de PR/despliegue:

- Cerrar persistencia inicial y recuperación ante fallos entre recepción del archivo y creación del job; completar inspección/cancelación/reintento de hijos y limpieza atómica de archivos de lote.
- Comprobar límites compartidos de proveedor y 30 inferencias con worker real, incluidas caídas, conectores locales y reintentos selectivos.
- Implementar y medir extracción reutilizable, reparación localizada de presentaciones y métricas de selección de modelos.
- Completar pruebas visuales, migración completa y smoke de workers; después CI y despliegue controlado.

No se ha demostrado todavía el objetivo real de presentaciones menores de 120 s. Una prueba de 30 jobs en PostgreSQL valida coordinación y persistencia, no la latencia ni la precisión de 30 inferencias de IA.

## Validación final simulada — 2026-09-06

- 56 pruebas focalizadas del backend pasan: presupuesto de salida, telemetría, routing, límite compartido de proveedor, digitalización recuperable, reparación de presentaciones, persistencia, autorización y atomicidad del lote de 30.
- 38 pruebas focalizadas del frontend pasan: asociación ordenada estudiante-evidencia, monitor individual/grupal, reintento selectivo, digitalización y estados de nota nula/cero real.
- ESLint y TypeScript pasan sin errores; `docker compose config --quiet` valida la definición completa.
- La prueba PostgreSQL 16 aislada ya comprobó migración reversible, compatibilidad histórica, leases y coordinación de 30 hijos. No utiliza datos reales.
- Las imágenes actualizadas de backend, migración, beat y cuatro workers se construyeron correctamente con las dependencias fijadas.
- Docker Compose aplicó la migración con código 0 y dejó saludables PostgreSQL, Redis, backend y los cuatro workers. Los procesos anunciaron las colas `default`, `grading` (concurrencia 4), `digitalization` (1) y `presentations` (1); los recuperadores periódicos se ejecutaron sin trabajos huérfanos.
- La imagen productiva importó `redis.asyncio`, cargó Celery y verificó el routing esperado; `/health` respondió `{"status":"ok","app":"XCalificator"}`. La imagen no incluye pytest por diseño, por lo que las pruebas se ejecutan en CI con `requirements-dev.txt` y no dentro del runtime mínimo.

La simulación confirma que una presentación de ocho diapositivas repara solo defectos focalizados y respeta el presupuesto interno menor de 120 s. El objetivo p95 real sigue requiriendo smoke posterior al despliegue con proveedores disponibles; no se consumieron APIs pagadas en esta validación.

## Preparación

1. Levantar PostgreSQL, Redis, backend y los workers separados con Docker Compose.
2. Aplicar la migración y comprobar que un trabajo histórico continúa consultable.
3. Configurar proveedores simulados con latencias, resultados y fallos deterministas.
4. Usar fixtures anonimizados; ninguna evidencia o clave productiva entra en CI.

## Validaciones rápidas

### Contratos y calidad

```powershell
docker compose run --rm backend pytest -q tests/unit tests/integration
Set-Location frontend
npm run lint
npm run typecheck
npm run test:run
npm run build
```

Los comandos definitivos se ajustarán al layout del contenedor durante `tasks.md`; no se ejecutarán suites pagadas por defecto.

### Lote de 30

1. Crear una evaluación de prueba y 30 estudiantes/entregas anonimizados.
2. Enviar 30 imágenes pequeñas al endpoint asíncrono con proveedor simulado.
3. Confirmar un padre y 30 hijos, cada relación estudiante-entrega correcta.
4. Inyectar un fallo transitorio en el hijo 7 y uno permanente en el 19.
5. Verificar que los otros 28 terminan, el 7 se recupera sin duplicar y el 19 queda identificable para revisión/reintento.
6. Reiniciar un worker durante una inferencia, esperar vencimiento del lease y comprobar recuperación única.
7. Recargar/cerrar el navegador y consultar el mismo resumen desde una sesión nueva.

Aceptación: 30 resultados independientes para 30 entradas válidas; cero pérdida, duplicado o asignación cruzada. En el escenario de fallo aislado, 29 continúan sin esperar al caso afectado.

### Calificación transparente

1. Ejecutar los fixtures de referencia actuales antes y después.
2. Comparar nota final, nota por respuesta, explicación, criterios, cobertura, confianza y revisión requerida.
3. Confirmar que la imagen fue enviada una sola vez a visión.
4. Confirmar que el verificador y el arbitraje conservan sus reglas.
5. Inmediatamente después de subir una foto, comprobar en materias, evaluaciones, calificaciones, detalle y boletín que aparece “Calificando” y no `0.0`.
6. Completar una calificación cuyo resultado verdadero sea cero y comprobar que sí se muestra `0.0`, diferenciándolo de una nota ausente.

### Presentación menor de 120 s

1. Generar al menos 20 presentaciones simuladas de ocho diapositivas, incluida una con un defecto localizado.
2. Confirmar que solo la diapositiva defectuosa llega a reparación generativa.
3. Confirmar que los límites de salida viajan por `messages` y `chat/completions`.
4. Confirmar que PDF, PPTX y vista previa comparten la misma fuente canónica.
5. Medir por separado contenido, reparación, imágenes y exportación.

Aceptación simulada: 100 % correctas y dentro del presupuesto interno. Smoke real posterior: al menos 95 % menor de 120 s bajo disponibilidad normal de proveedores; fallos externos quedan clasificados y recuperables.

### Aislamiento de colas

1. Mantener una presentación activa.
2. Enviar una digitalización y cuatro calificaciones.
3. Confirmar que las calificaciones comienzan en su worker reservado sin esperar la presentación.
4. Simular Redis temporalmente indisponible y comprobar republicación de trabajos persistidos.

## Observabilidad

Para cada prueba registrar solo:

- tiempo de cola y etapas;
- función, proveedor y modelo;
- tokens/bytes/páginas cuando estén disponibles;
- intento, fallback, estado y razón terminal;
- CPU/RAM de workers.

No registrar prompts completos, evidencia, respuestas, claves ni nombres de estudiantes.

## Despliegue controlado

1. CI completo en PR.
2. Migración aditiva.
3. Workers 4/1/1 con límites de proveedor conservadores.
4. Smoke de una calificación, una digitalización y una presentación.
5. Prueba grupal controlada; detener ampliación si aparecen 429, memoria sostenida alta, duplicados o regresión de calidad.
6. Comparar p50/p95 durante la primera ventana con la línea base y conservar rollback por configuración.

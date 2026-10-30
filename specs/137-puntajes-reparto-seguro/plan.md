# Plan: reparto seguro de puntos

**Rama**: `codex/137-puntajes-reparto-seguro` | **Fecha**:2026-10-30 | **Spec**:[spec.md](spec.md) | **Issue**:[292](https://github.com/Andres-back/Calificator/issues/292).

## Resumen

Plan aprobado en el chat, incluida ampliación por rangos: editor de reparto total/tipo/sección/rango, valores fijados y remanentes por bloque. Guardado con referencia anterior y actualización de notas como acción separada con vista previa, confirmación y recibo idempotente. Sin cambios de escala, texto, evidencia, modelos o producción durante la implementación.

## Contexto técnico

**Lenguajes/versiones**: Python/FastAPI/SQLAlchemy async/PostgreSQL vigentes; React18/TypeScript/Tailwind actuales.
**Dependencias**: ninguna nueva; Decimal y enteros escalados; reutilizar UI, autorización, snapshots, fórmula e historial.
**Persistencia**: tabla aditiva de recibos; reutilizar versiones de evaluación y desgloses. Grupos en reglas del blueprint/snapshot, compilados a máximos canónicos.
**Pruebas**: política pytest, integración PostgreSQL aislada con migración, Vitest y E2E sintéticos; permisos, concurrencia, reintentos,20/100 elementos y conservación de24 entregas.
**Plataforma objetivo**:360px→desktop, dos temas, teclado/texto ampliado.
**Rendimiento y escala**: hasta100 preguntas y100 notas por lote acotado; progreso y resultados por estudiante; sin IA ni OCR.

## Verificación de la constitución

- Separación de roles: autorización de evaluación/materia más permisos de lectura/actualización/calificación; estudiantes y terceros denegados en servidor.
- Integridad y trazabilidad: compilar pesos una vez, versiones inmutables y confirmación separada. Excluir ajustes docentes, pendientes y correspondencias ambiguas. Conservar evidencia/valoraciones; no publicar automáticamente.
- Asincronía e idempotencia: estados cancelables del formulario y refresco de vistas React Query; lotes deterministas acotados y recibos con ID/hash recuperables. No reutilizar cola de IA para aritmética ni reintentar escrituras automáticamente sin su identidad.
- Datos y secretos: pruebas sintéticas; diagnóstico productivo solo agregado. Sin nombres, imágenes o tokens en artefactos.
- Accesibilidad: controles≥44px, total/restante por bloque, errores visibles y lista/tabla adaptativa; no esconder decimales reduciendo la letra.
- Gobernanza y pruebas: spec/plan y rangos aprobados; issue292 etiquetado. Checklist16/16, Tasks/Analyze antes de código, Converge y PR/CI. No quitar bloqueos generales de130 ni hacer cambios productivos.

Revisión posterior al diseño: sin excepción constitucional. La transición de pesos debe demostrar conservación del contexto; no habilita cambios arbitrarios de contenido.

## Estructura del proyecto

- `backend/app/modules/evaluaciones/{score_allocation,score_schemas,score_service,score_notes,score_router,score_models}.py`: política, contratos, conservación y operaciones; registro en `api.py`/`db/base.py`, siguiendo los patrones actuales. Aplicación de notas separada de guardar el reparto para no mezclar transacciones.
- `backend/app/modules/evaluaciones/service.py`: detectar exclusivamente cambios de máximos del editor existente y delegar a la misma transición segura; no desactivar conflictos/revisiones.
- `backend/alembic/versions/202610300001_evaluation_score_operations.py`: recibos nuevos, sin backfill de notas.
- `backend/app/modules/calificaciones/breakdown_service.py`: reutilizar fórmula/copia versionada/auditoría; nuevas notas no se presentan como una salida nueva de IA.
- `frontend/src/modules/evaluaciones/components/{scoreAllocation,ScorePlanEditor,EvaluationScoreDialog}.ts/tsx`, `scoreApi.ts`, `EvaluacionesPage.tsx`, `MateriaEvaluaciones.tsx` y editor: acceso común desde ambas listas y preguntas, reparto y actualización separada. El editor de contenido conserva borradores y remite los pesos al editor común; no abre una segunda operación sobre cambios de contenido sin guardar.
- Pruebas backend/frontend/E2E, índice e inventario de superficies reales; sin cambios de workflows para eludir controles.

## Decisiones y complejidad

1. **Una sola ponderación**: compilar a `preguntas[].puntaje` y blueprint/snapshot, que ya consume el calificador. No multiplicar de nuevo por sección. Reemplazar configuración de reparto130 únicamente de forma explícita, conservando sus secciones/texto.
2. **Precisión**: unidades0,0001 compatibles con el desglose; residuos deterministas por orden canónico. Total exacto, valores finitos/positivos y formato sin ceros finales. El modo130 anterior conserva su contrato; no aplicarlo dos veces.
3. **Versiones antiguas**: bloquear evaluación y comprobar versión/fecha; rechazar entregas/jobs en curso. Conservar snapshot `estado_observado`, no original certificado, y asociar referencia anterior a sus entregas bajo la misma transacción. Conservar manifest, recursos, claves y revisiones visuales. Nunca reescribir hashes/snapshots.
4. **Solo máximos**: comparar contenido excluyendo puntajes/metadatos del reparto. Escala, texto, identidad, opciones, solución y evidencia no pueden cambiar por esta vía. Los demás cambios siguen el editor/bloqueos101/130.
5. **Notas**: previsualizar con fingerprint de definición y versión de nota. Propuesta `obtenidos/máximo anterior × máximo nuevo`; estados/respuestas/valoraciones originales conservados. Excluir cualquier decisión manual, pendiente o correspondencia ambigua; no suponer que todas usaron los máximos actuales. Confirmar no publica.
6. **Recalificación posterior**: al aplicar explícitamente y solo si el contenido educativo es idéntico, fijar para esa entrega el contexto de pesos confirmado, registrando referencia anterior/nueva en procedencia y recibo. No transformar imágenes/regiones.
7. **Recuperación**: máximo100 selecciones con fingerprint; recibo único por actor/UUID y hash de payload. Misma operación devuelve recibo, otro payload produce409. Revalidar cada nota bajo bloqueo; cambios simultáneos se conservan y explican. Cambio de cuenta/revocación descarta resultados tardíos.
8. **Rechazado**: quitar todos los409, normalizar globalmente ignorando bloques, editar directamente producción, llamar IA para repartir, sobrescribir manuales o certificar como original un estado observado.

Los casos con varios intentos no se convierten en lote: se muestran excluidos para no cambiar silenciosamente qué intento cuenta. Es una conservación prudente de la política existente, no una nueva política de notas. Las preguntas sin sección conservan un bloque identificado «Sin sección» si hay otras secciones; si no existe ninguna sección, la UI ofrece total/tipo/rangos sin inventar capítulos.

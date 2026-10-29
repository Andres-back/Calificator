# Plan: Revisión visual y edición directa de la nota

**Rama**: `codex/134-revision-visual-nota-directa` | **Fecha**: 2026-10-28 | **Spec**: [spec.md](./spec.md) | **Issue**: [#281](https://github.com/Andres-back/Calificator/issues/281)

**Estado**: Plan ampliado aprobado mediante «adelante» y revisión documental de ocho criterios autorizada mediante «Sí, revisa y continúa». Requisitos 16/16 + 8/8 completos; implementación y Converge completos. Resultados locales en [validation.md](./validation.md); PR/CI antes de cualquier fusión. Sin cambios en producción.

## Resumen

Compartir una prioridad de revisión entre resumen, botones y detalle. Añadir «Editar nota» junto al valor principal del alumno: introducir la nota final y comentario opcional, conservando evidencia, puntos por pregunta y propuesta original. Extender el ajuste existente con guardado versionado y auditable; no crear otro editor desconectado del desglose ni cambiar modelos.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11 y TypeScript según configuración vigente.
**Dependencias**: FastAPI, SQLAlchemy async, Pydantic, Decimal; React, TanStack Query, Tailwind y lucide-react. Sin librerías nuevas.
**Persistencia**: PostgreSQL; Calificacion, CalificacionDesglose, CalificacionComponente y CalificacionAjuste. Reutilizar historial existente para identidad de operación; no se prevé migración.
**Pruebas**: pytest unitario/integración PostgreSQL aislado; Vitest, Testing Library y Playwright Chromium/WebKit; tipos, lint, build, inventario y gobernanza.
**Plataforma objetivo**: web a 360/390/1440 px, claro/oscuro. Emulación no equivale a teléfono físico.
**Rendimiento y escala**: clasificación lineal, sin IA ni consultas adicionales; una transacción por edición. Probar 100 preguntas sin barridos cuadráticos.

## Verificación de la constitución

- Separación de roles: `grading.grade` más autorización sobre la evaluación en servidor; pruebas propietario, ajeno, alumno y sin permiso.
- Integridad y trazabilidad: propuesta inicial, puntos y evidencia intactos; ajuste separado con actor/fecha/antes/después. Cero confirmado no se sustituye por nota sugerida.
- Asincronía e idempotencia: no hay inferencia nueva; bloqueo corto, versión y operación identificada; no editar mientras procesa o está anulada.
- Datos y secretos: solo pruebas sintéticas y base aislada; ninguna clave, llamada a IA o escritura en producción.
- Accesibilidad: 44 px táctiles, foco, etiquetas además de color, borradores y teclado móvil.
- Gobernanza y pruebas: issue #281, rama desde main `211b7100c6727acf59115d09efede26495e108b5`; plan ampliado aprobado. Después: revisión de Checklist, Tasks, Analyze, Implement y Converge antes del PR/CI. No autoriza fusión ni despliegue.

**Gate previo a investigación**: permitido diseñar, no implementar.
**Gate posterior al diseño**: aprobación humana registrada y revisión de calidad completa; sin excepciones a integridad, permisos o CI.

## Estructura del proyecto

```text
specs/134-revision-visual-nota-directa/
  spec.md, plan.md, research.md, data-model.md, quickstart.md
  contracts/revision-nota.md, checklists/requirements.md
  tasks.md                       # fase siguiente, tras aprobación
backend/app/modules/calificaciones/
  router.py, schemas.py, service.py, breakdown_service.py
backend/tests/unit/
backend/tests/integration/
frontend/src/modules/calificaciones/
  CalificacionesWorkspace.tsx, components/GradeBreakdown.tsx
  components/GradeFinalEditor.tsx   # sustituye el editor global duplicado
  review-triage/buildReviewTriage.ts, review-triage/ReviewTriagePanel.tsx
frontend/src/modules/calificaciones/api.ts
frontend/src/types/api.ts
frontend/e2e/
```

No incorporar el escáner pendiente de Spec 131.

## Decisiones y complejidad

### Prioridad común de revisión

Mantener `safe/attention/blocked` y una sola clasificación. Precedencia:

1. Rojo «Revisión prioritaria»: bandera vigente, ilegible/no evaluable/pendiente, puntaje ausente o inválido, confianza válida menor que 0,70 o contradicción material.
2. Amarillo «Conviene comprobar»: confianza de 0,70 a menos de 0,85, verificación insuficiente/desconocida, explicación ausente, discrepancia menor o aviso localizado no urgente.
3. Verde «Sin avisos de revisión»: puntaje/explicación válidos y sin señales anteriores. En IA, al menos dos valoraciones utilizables, coherentes y cada confianza al menos 0,85. Distinguir puntuación objetiva sustentada y revisión individual docente.

Son heurísticas visuales, no probabilidades de exactitud calibradas. Contradicción material: diferencia mayor que `max(0,1; 10 % del máximo)` o estados correcta/incorrecta incompatibles. Diferencias menores son amarillas, con tolerancia de representación 0,000001. No cambiar puntos. Normalizar confianza finita 0–1 o 0–100; rechazar null, vacío, booleanos y más de 100 como desconocidos.

Solo una corrección individual vigente `docente/manual`, válida y sin nuevas banderas, hace históricas sus valoraciones originales. Un ajuste global no limpia avisos. Los avisos generales no se asignan arbitrariamente a una pregunta. Compartir presentación en resumen/botones/tarjeta, selección con anillo independiente e información privada fuera de la vista estudiantil.

### Editor cotidiano único

Abrir desde el valor principal, precargar nota vigente, mostrar escala, guardar/cancelar y comentario opcional. Coma y punto equivalen; vacío no es cero. Hasta dos decimales visibles; abrir/cancelar/guardar sin cambios no redondea el dato original. Retirar accesos duplicados al mismo ajuste cotidiano, sin ampliar el editor de puntos individuales.

Convertir objetivo final a diferencia respecto de la base, no sumar al ajuste anterior: base 4,1, ajuste previo 0,2, nuevo objetivo 4,5 → ajuste total 0,4. Conservar propuesta de IA, puntos y versiones. Motivo mecánico obligatorio de auditoría, no justificación pedagógica inventada; comentario docente opcional.

### Guardado consistente y compatible

Extender `PATCH /calificaciones/{id}/ajustar` con precondiciones de registro/desglose e identidad de operación, opcionales para compatibilidad pero obligatorias en el nuevo editor. Una transacción: nota, nueva versión de desglose si existe, historial, estado y suspensión de enlaces. Refactorizar helpers mínimamente para evitar commits sucesivos.

Con desglose: mismos componentes y ajuste explícito. Si es incompleto, conservar puntos ausentes/avisos; no fabricar ceros. Si no existe, registrar decisión sin inventar preguntas. Mantener guardas existentes de evidencia, permisos y escala. Rechazar cambios obsoletos y operaciones procesando/anulada; reenvío de la misma intención no duplica ajustes.

Por esta vía, cambiar una publicada la deja ajustada, con advertencia previa y enlaces afectados suspendidos; publicar/reactivar es separado. Sin cambios reales no crear evento ni despublicar/suspender. Actualizar consultas de revisión, libro, historial y devoluciones tras éxito; conservar borrador ante error/conflicto.

### Validación y entrega

Probar matriz de colores y fronteras; 4,1→4,5, cero, ajuste anterior, precisión, publicados, incompletos/antiguos, permisos, doble envío, conflicto y rollback real en PostgreSQL sintético. E2E 360/390/1440, claro/oscuro, Chromium/WebKit y teclado. Ejecutar regresiones, inventario, gobernanza y convergencia; preparar PR sin fusionar ni desplegar automáticamente. Guía: [quickstart.md](./quickstart.md).

# Investigación local — Spec 134

**Fecha**: 2026-10-28 | **Issue**: #281 | **Base**: main `211b7100c6727acf59115d09efede26495e108b5`.

Sin datos reales, llamadas a IA ni acceso a producción. No hay tecnologías nuevas o incógnitas externas que requieran investigación delegada.

## Prioridad de revisión

**Decision**: extender `review-triage/buildReviewTriage.ts` y compartir presentación con GradeBreakdown.
**Rationale**: ya distingue tres prioridades; hoy la confianza menor de 0,7 cae en amarillo y los botones usan azul. La conversión numérica actual puede tratar null/vacío como cero y aceptar más de 100: deben ser desconocidos.
**Alternatives considered**: colores de correcta/incorrecta del escáner pendiente, rechazados porque no representan certeza; segundo clasificador para botones, rechazado por inconsistencias.

## Nota directa

**Decision**: un único campo de resultado final, observación opcional y ajuste versionado compatible con el endpoint existente.
**Rationale**: Workspace oculta la edición en Retroalimentación; GradeGlobalAdjustmentEditor pide delta y dos razones obligatorias. `service.ajustar_nota` no versiona el desglose y usa `confirmada or sugerida`, perdiendo un cero. `update_breakdown` versiona, pero rechaza puntos ausentes, exige motivos y conserva publicada. Ninguno debe conectarse ciegamente a otro botón.
**Alternatives considered**: botón al ajuste legado sin reparar coherencia, reescribir puntos, endpoint paralelo o exigir motivos pedagógicos, rechazados por integridad/duplicación/usabilidad.

## Matemática, historial y concurrencia

**Decision**: objetivo menos base Decimal; conservar componentes; auditoría mecánica con comentario separado; precondiciones e identidad de operación en transacción única.
**Rationale**: `breakdown_policy.calculate_formula` ya distingue base, ajuste y redondeo. Usar total anterior acumularía ajustes. El helper versionado hace commit interno, por lo que debe separarse preparación/persistencia lo mínimo necesario. El ajuste legado pasa a ajustada y suspende devoluciones: advertirlo antes del cambio.
**Alternatives considered**: rellenar puntos con cero, dos commits, última escritura gana o reactivar enlaces automáticamente, rechazados. No crear migración por anticipado si el historial y bloqueo existentes permiten idempotencia auditable; revisar el plan si no es posible.

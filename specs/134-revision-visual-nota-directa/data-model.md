# Modelo de datos — Spec 134

Diseño aprobado e implementado en la rama; persistencia y transacciones verificadas con PostgreSQL sintético, según [validation.md](./validation.md). Sin migraciones nuevas ni cambios en producción.

## Calificación y decisión docente

Reutilizar identidad, estado, sugerida/confirmada, `updated_at`, entrega, `revisado_por_docente` e historial de `resultado_json`. Confirmada no-null prevalece incluso si es cero. La sugerencia inicial y las trazas del modelo no se reescriben con la decisión docente.

La edición real deja ajustada; confirmar/publicar es separado. Procesando/anulada no se editan. Guardar sin cambios no altera estado/historial/enlaces.

## Desglose

Si existe, versionar con los mismos componentes, respuestas, puntos, evidencia, orígenes y valoraciones. Ajuste global = objetivo − base sin ajuste, en Decimal y con redondeo vigente. Conservar cobertura incompleta y avisos; una decisión global no acredita revisión individual. Sin desglose, registrar el cambio sin fabricar preguntas.

## Auditoría y operación

Conservar actor, fecha, nota previa/nueva, identidad de operación y comentario opcional mediante historial existente y CalificacionAjuste cuando hay desglose. Registrar el cambio mecánico sin inventar explicación pedagógica.

Bajo bloqueo del registro, comparar versión temporal y desglose esperado. Misma operación/intención no crea segundo evento; identidad reutilizada con otros valores es conflicto. Nota, desglose, auditoría, estado y suspensión deben confirmar o revertir juntos. Sin tablas nuevas previstas; si no basta la persistencia existente, revisar el plan.

## Prioridad derivada

No almacenar otra nota o confianza. Derivar `safe/attention/blocked`, etiqueta y motivos desde componentes/valoraciones/avisos actuales. Datos desconocidos no implican seguridad. Corrección individual docente distingue valoraciones históricas; ajuste global no limpia ninguna pregunta. La proyección estudiantil no recibe nuevos detalles internos.

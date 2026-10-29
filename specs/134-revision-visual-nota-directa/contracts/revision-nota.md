# Contratos — Spec 134

Contrato aprobado e implementado de forma compatible, con validación local registrada en [validation.md](../validation.md); sin despliegue realizado.

## UI

«Editar nota» junto al valor principal abre nota final, escala y comentario opcional, con guardar/cancelar. El cálculo por preguntas y la diferencia docente quedan separados. Prioridad compartida: rojo «Revisión prioritaria», amarillo «Conviene comprobar», verde «Sin avisos de revisión», con icono/motivo y selección independiente del color. Reglas completas en [plan.md](../plan.md).

## Ajuste existente compatible

`PATCH /calificaciones/{id}/ajustar` mantiene su respuesta CalificacionRead y clientes previos. Campos adicionales, opcionales en el esquema legado y siempre enviados por el nuevo editor:

```json
{
  "nota_confirmada": 4.5,
  "actualizado_en_esperado": "2026-10-28T20:00:00Z",
  "version_desglose_esperada": 3,
  "operacion_id": "d0c6f251-7e77-4ac3-988f-eb80dc0ab99f",
  "observacion": ""
}
```

- Nota Decimal finita en escala; cliente normaliza coma, servidor rechaza booleanos/vacío/null. Sin cambio real no muta datos.
- Fecha esperada normalizada sin pérdida de precisión. Versión de desglose o null si no existía; su aparición también exige recargar. No aceptar una guarda parcial como operación protegida.
- UUID por intención de guardado, estable al reintentar red. Misma intención ya aplicada responde sin segunda mutación, antes de rechazar su precondición anterior; misma identidad con otros valores es conflicto.
- Observación opcional, hasta 2000 caracteres. No borra retroalimentación. `feedback` legado sigue compatible; el nuevo editor no lo reescribe.
- Permiso `grading.grade` y acceso de gestión a evaluación en backend; conservar guardas de evidencia. No editar procesando/anulada.
- Una transacción incluye nota, desglose si existe, auditoría, estado y suspensión. 401 sin sesión; 403/404 para acceso según convención; 422 formato/escala; 409 conflicto/estado. Errores comprensibles y borrador conservado.
- Invalidar detalle/lista/libro/historial/devoluciones tras éxito. No reintentar conflictos ciegamente ni volver a llamar a IA.

## Publicación e incompletos

Advertir antes de editar una publicada: queda ajustada, enlaces afectados suspendidos y necesita publicación posterior. No reactivar nada. Un ajuste global no rellena puntos ausentes ni declara evidencia verificada. Sin desglose, conservar la falta de detalle y auditar la decisión.

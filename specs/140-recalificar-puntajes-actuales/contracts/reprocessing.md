# Contrato de recalificación

## GET `/api/calificaciones/{id}/recalificacion-contexto`

Mismos permisos/propiedad que recalificar; evaluación y materia activas.
Sin escrituras ni contenido del alumno. Respuesta:

```json
{
  "estado": "puntajes_actualizados",
  "version_entrega_id": "UUID o null",
  "version_objetivo_id": "UUID o null",
  "fingerprint": "sha256 o null",
  "requiere_confirmacion": true,
  "cambios": [{"numero": "9", "puntaje_anterior": "0.52", "puntaje_actual": "1.25"}],
  "mensaje": "El reparto de puntos cambió. Confirma los puntos actuales antes de enviar."
}
```

Estados: `sin_cambios`, `puntajes_actualizados`, `contenido_modificado`,
`version_no_disponible`. Solo puntos distintos con contenido/escala idénticos
permite adoptar el destino. Contenido diferente mantiene original, con aviso.
Versión no disponible impide enviar. Sin diferencia no exige nuevos campos.

## POST existente `/api/calificaciones/{id}/recalificar`

Formularios actuales conservados. Campos opcionales nuevos:

- `usar_puntajes_actuales`: bool, default false.
- `version_puntajes_objetivo`: UUID.
- `contexto_puntajes_fingerprint`: cadena SHA256 de 64 caracteres hex.

Si cambian solamente los puntos, se requieren los tres válidos; si faltan o
están desactualizados: 409 comprensible, cero archivos/revisiones/jobs nuevos.
No se permite adoptar un destino con cambios de contenido. La versión de nota
esperada y aceptación de reapertura siguen siendo obligatorias cuando corresponda.
La nueva selección forma parte de la huella de solicitud. Replay idéntico retorna
la nota sin duplicar ni consultar de nuevo el contexto ya cambiado.

202 continúa devolviendo `CalificacionRead`. 403/404/409/422 conservan permisos,
concurrencia y validación. No cambiar rutas de reintento, revisión o evidencias.

## Frontend

Consultar al abrir ambos modos. En carga/error no enviar y ofrecer reintento.
Mostrar tabla/lista legible de cambios, aceptar puntos explícitamente y adjuntar
referencia exacta. Confirmación de reapertura independiente si hay decisión.
Cambiar propuesta/aceptación cambia request ID. Tras 409 ofrecer actualizar
propuesta, conservar evidencia/motivo y retirar aceptación anterior.

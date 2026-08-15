# Contrato de respuestas de analítica

| Estado | Condición | Respuesta esperada |
|--------|-----------|--------------------|
| `201` | Evento permitido, actor de sesión y referencias válidas | `{ "status": "ok" }` |
| `401` | Sesión ausente o expirada | Error de autenticación estándar sin persistir evento |
| `403` | El evento existe, pero no está permitido para el rol de la sesión | Mensaje genérico de permiso; sin persistir evento |
| `404` | Una referencia académica no existe o está fuera del ámbito del actor | Mensaje único `Referencia no encontrada`; no distingue inexistencia de falta de propiedad |
| `422` | Evento desconocido, metadata inválida/excesiva o referencias propias incoherentes | Detalle de validación sin datos del objeto; sin persistir evento |

## Reglas

- Ningún error crea una fila parcial.
- Una calificación ajena y una inexistente producen el mismo `404` y el mismo detalle.
- Una evaluación ajena y una inexistente producen el mismo `404` y el mismo detalle.
- La incoherencia entre una evaluación y una calificación que el actor sí puede consultar produce `422`.
- El cliente de telemetría absorbe estos errores y nunca cambia el resultado de la acción académica que originó el evento.

# Plan: «Confirmar todos» no despublica las notas publicadas

**Spec**: [spec.md](spec.md) | **Issue**: [#361](https://github.com/Andres-back/Calificator/issues/361)

## Diagnóstico

- En «Ver notas», la lista permite marcar cualquier calificación con nota. `CalificacionesWorkspace` envía a `POST /calificaciones/lote/confirmar` todas las seleccionadas, sin filtrar por estado.
- `service.confirmar_nota_batch` aplica la nota, fija `estado = confirmada`, añade un evento al historial y llama a `suspend_grade_publications` para cada ítem.
- Comprobado contra la API local: una calificación `publicada` con nota 0.00 quedó `confirmada` tras enviar su misma nota.

## Decisión

Backend, en `confirmar_nota_batch`, después de validar permiso y rango:

- Si la calificación está publicada y la cifra enviada es la misma, el ítem se registra como exitoso y no se toca nada.
- Si está publicada y la cifra es distinta, el ítem falla con 409 «Esta nota ya está publicada. Para cambiarla usa «Editar nota».».
- En cualquier otro estado, el flujo actual.

Descartado:

- **Filtrar las publicadas solo en el frontend**: el endpoint seguiría despublicando ante cualquier otra llamada.
- **Impedir marcar notas publicadas en la lista**: la misma selección sirve para otras acciones del lote; cambiarla es un cambio de pantalla aparte.
- **Tocar la confirmación individual o «Ajustar nota común»**: son hallazgos aparte, sin reproducir.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/app/modules/calificaciones/service.py` | no tocar una calificación publicada en el lote de confirmación |
| `backend/tests/unit/test_batch_confirm_published.py` | pruebas de regresión |

Sin frontend, sin migraciones y sin cambios de datos.

## Riesgos

- El aviso de la pantalla sigue contando las publicadas como «confirmadas» en el resumen del lote. No cambia nada para el estudiante.
- Las notas que ya fueron despublicadas por este fallo en producción no se restauran: el docente tiene que volver a publicarlas. No se midió cuántas hay.

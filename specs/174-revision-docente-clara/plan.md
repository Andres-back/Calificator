# Plan: Evidencia a pantalla, recalificar en lote y asistencia en mosaico

**Spec**: [spec.md](spec.md) | **Issue**: [#368](https://github.com/Andres-back/Calificator/issues/368)

## Diagnóstico

- `GradeEvidenceViewer` fija el marco de la hoja en `clamp(16rem, 45dvh, 34rem)` para todos los tamaños.
- La reapertura de una calificación (`revision_service.reprocess_grade`) solo se expone por entrega, en `POST /calificaciones/{id}/recalificar`.
- `MateriaAsistencia` usa, desde 1024 px, una rejilla de una fila por estudiante.
- `config/nav.ts` y `DashboardAdmin` enlazan Presentaciones.
- `herramientas.service._generate_with_quality` deja pasar la excepción del enrutador de IA y FastAPI responde 500.
- La lista de revisión escribe el estado con `estado.replace('_', ' ')` y lo pone en mayúsculas con CSS.

## Decisión

Un solo PR, a petición del usuario.

**Recalificar en lote**

- `POST /calificaciones/lote/recalificar` con `calificacion_ids` (de 1 a 60). Se declara antes de la ruta por calificación para que «lote» no se lea como identificador.
- Por cada entrega: mismos permisos y bloqueos que la acción individual, y `reprocess_grade` con `confirmed=False`. Una nota con decisión docente se rechaza con su motivo.
- Cada entrega se confirma en su propia transacción. Tras un rechazo se hace `rollback` y se recarga el usuario, porque el `rollback` lo deja caducado.
- Respuesta `BatchResult`, igual que confirmar y publicar en lote.
- Frontend: «Recalificar seleccionados» en la barra de selección y «Recalificar no revisadas (N)» en «Más acciones»; ambas pasan por un diálogo de confirmación.

**Evidencia**: desde 1024 px el marco usa `clamp(30rem, 100dvh − 13rem, 72rem)`.

**Asistencia**: la lista es una rejilla de dos columnas desde 1024 px y de tres desde 1536 px. En ordenador cada tarjeta tiene dos filas: identidad, estado y «Observación»; y los cuatro botones.

**Menú**: se quitan las dos entradas de Presentaciones y el acceso del inicio del administrador. La ruta se conserva.

**Recursos**: `_generate_with_quality` convierte cualquier fallo del proveedor en 503 con un mensaje para reintentar; un `HTTPException` propio conserva su código.

**Estados**: `reviewRowStatus` en `gradePresentation.ts` da nombre y tono; la ruta de navegación recorta a una línea desde 1024 px y deja el nombre completo en `title`.

Descartado:

- **Reabrir en lote las notas ya decididas**: reabrir una nota publicada se la quita al estudiante. Queda como decisión de una en una.
- **Recalificar sin volver a leer la foto**: la reapertura actual siempre relee; cambiarlo es otro trabajo.
- **Borrar la ruta y el módulo de Presentaciones**: rompe enlaces guardados y sus pruebas; se pidió quitarlo de la vista.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/app/modules/calificaciones/revision_router.py` | ruta de lote |
| `backend/app/modules/calificaciones/revision_service.py` | `teacher_decided` |
| `backend/app/modules/calificaciones/schemas.py` | `BatchRegradeRequest` |
| `backend/app/modules/herramientas/service.py` | 503 si la IA no responde |
| `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`, `api.ts` | acciones de lote, confirmación, estados |
| `frontend/src/modules/calificaciones/gradePresentation.ts`, `ReviewContextNavigation.tsx` | estados y ruta |
| `frontend/src/modules/calificaciones/components/GradeEvidenceViewer.tsx` | alto del marco |
| `frontend/src/modules/materias/MateriaAsistencia.tsx` | mosaico |
| `frontend/src/config/nav.ts`, `frontend/src/modules/dashboard/DashboardAdmin.tsx` | sin Presentaciones |

## Riesgos

- **Costo y carga**: un lote de 60 entregas son 60 calificaciones con IA. El límite y la confirmación lo acotan; no hay tope por día.
- **La lectura cambia**: recalificar una hoja que estaba bien puede dejarla distinta. El diálogo lo advierte y el resultado anterior queda en el historial.
- **El camino feliz del lote no se probó con IA real**: en local no hay proveedor. Se probaron el rechazo, el aislamiento entre entregas y la ruta; la reapertura es la misma función que ya usa la acción individual.
- **Pruebas de extremo a extremo**: las que recorren el menú o miden la asistencia se confirman en la CI.

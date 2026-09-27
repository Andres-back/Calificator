# Contratos HTTP

## Crear borrador desde foto

`POST /materias/{materia_id}/estudiantes/importaciones`

- Multipart: `archivo` (JPEG, PNG o WebP; máximo 20 MB).
- Permiso: titular de la materia o administrador autorizado.
- Resultado `202`: `{ lote_id, job_id, estado }`.
- No crea usuarios ni matrículas.

## Consultar borrador

`GET /materias/{materia_id}/estudiantes/importaciones/{lote_id}`

Devuelve estado, progreso y filas; nunca contraseñas ni rutas privadas.

## Actualizar revisión

`PUT /materias/{materia_id}/estudiantes/importaciones/{lote_id}/filas`

Recibe la lista completa ordenada con nombre confirmado y decisión. Rechaza filas ambiguas sin resolver.

## Confirmar

`POST /materias/{materia_id}/estudiantes/importaciones/{lote_id}/confirmar`

- Bloquea el lote y ejecuta cuenta más matrícula en una transacción.
- Primera respuesta: resumen y credenciales temporales de las cuentas creadas.
- Reintento: mismo resumen, `credenciales=[]` y aviso de que las claves no se vuelven a mostrar.
- Conflicto: lote no revisado, materia distinta o confirmación concurrente.

## Cancelar

`DELETE /materias/{materia_id}/estudiantes/importaciones/{lote_id}`

Cancela un lote no confirmado y elimina el archivo temporal.

## Renovar acceso

`POST /materias/{materia_id}/estudiantes/{estudiante_id}/acceso-temporal`

Devuelve una única clave temporal, marca cambio obligatorio, incrementa versión de autenticación e invalida sesiones anteriores.

## Buscar y matricular cuentas existentes

`GET /materias/{materia_id}/estudiantes/candidatos?q=...`

Devuelve alumnos visibles para el mismo docente por pertenecer a otra materia propia. No incluye cuentas ajenas y no decide por similitud.

`POST /materias/{materia_id}/estudiantes/matricular-existentes`

Recibe identificadores seleccionados. Crea o reactiva únicamente matrículas en la materia actual; conserva cuenta y credenciales.

## Completar clave inicial

`POST /users/me/password-inicial`

Recibe contraseña nueva y confirmación. Solo es válido si el usuario tiene cambio obligatorio. No acepta reutilizar la clave temporal.

## Errores comunes

- `401`: sesión ausente o vencida.
- `403`: no es titular/admin o alumno ajeno a la materia.
- `404`: recurso no visible dentro del ámbito autorizado.
- `409`: estado de lote incompatible, confirmación concurrente o vínculo conflictivo.
- `422`: archivo, filas o contraseña inválidos.
- `429`: límite de reconocimiento o restablecimientos.

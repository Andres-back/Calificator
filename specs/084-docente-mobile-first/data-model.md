# Modelo de datos y estados

Diseño aprobado el 2026-10-05. No se añade tabla ni migración en el enfoque mínimo.

## Evaluación y criterios

- `Evaluacion`: conservar ID, materia, profesor, estado, origen, preguntas, respuestas esperadas, nota máxima, fechas y `updated_at`.
- Campos editables por el editor limitado: `dba_ids`, `dba_personalizado_ids`, `criterios`. Mantener vínculo con blueprint actual sin regenerar preguntas, claves o material.
- `expected_updated_at` es precondición de request, no columna. Leer versión bajo bloqueo de fila y comparar timestamp normalizado; no reutilizar una versión anterior tras guardar.
- Criterios personalizados pertenecen a docente/materia; nuevos vínculos requieren referencia activa válida. Una referencia histórica inactiva autorizada se conserva si no se reemplaza. No convertir este caso en permiso para usar criterios ajenos.
- Rúbrica modificada: nombres únicos no vacíos, pesos positivos con suma 100 %, niveles completos según reglas existentes. Rúbrica histórica no modificada queda intacta.
- Transición: lectura → edición local → validación → guardado → lectura actualizada. Error/409 mantiene borrador y exige decisión explícita; nunca dispara calificación ni cambia estado/publicación.

## Lote manual y por foto

- Reutilizar `ImportacionEstudiantesLote`: `id`, `materia_id`, `creado_por`, `archivo_nombre`, `archivo_sha256`, `job_id`, `archivo_key`, `estado`, `resultado_json`, timestamps.
- Manual: UUID de operación del cliente como `id`, origen manual identificable en metadata sin secreto, nombre descriptivo, huella del payload canónico, `job_id/archivo_key` nulos. No inventar otra tabla.
- Filas existentes: orden, nombre detectado/revisado, decisión crear/asociar/omitir, referencia de alumno y confirmación de homónimo. De 1 a 100 filas; validación también en servidor.
- Estados manuales: revisión → confirmado; foto conserva extracción/job → revisión → confirmado y sus errores actuales.
- Replay: mismo UUID + actor/materia/origen/huella devuelve lote existente; cualquier discrepancia rechaza 409 tras validar permisos sin exponer otro grupo. Conflicto de inserción se resuelve dentro de transacción, no por check previo solamente.
- Confirmado: persistir conteos, nunca contraseñas en `resultado_json`. Respuesta inicial puede emitir credenciales una sola vez; replay devuelve conteos y lista de credenciales vacía.

## Usuario y matrícula

- Cuenta interna: `User.id`, nombre, email único interno, `password_hash`, `email_es_interno`, `debe_cambiar_password`, `auth_version`; rol estudiantil fijado por servicio.
- Matrícula: referencia materia/alumno; unicidad `(materia_id, estudiante_id)`. Asociar preserva contraseña, identidad e historial; reactivar conserva relación existente.
- Renovación autorizada: bloqueo de cuenta → hash nuevo → cambio inicial obligatorio → incrementar versión auth → respuesta efímera. No borrar entregas/notas ni revelar hash/clave previa; comprobar enlaces de recovery y revocaciones con mecanismos actuales.

## Ficha efímera

Nombre, usuario/email, contraseña temporal recién emitida, ID de estudiante y URL de login. Solo memoria de la operación autorizada; no DB, query key, URL, storage, logs o artefactos CI. Selección para imprimir es estado local. Cerrar/cambiar grupo/logout destruye tarjetas y resultados de mutation. Imprimir no muta ninguna entidad.

## Perfil propio

Nombre completo continúa en `nombre`; email canónico único y hash vigente. `current_password` y confirmación son controles transitorios, no nuevos campos persistidos. La confirmación permanece en cliente; servidor valida contraseña nueva y actual. Verificación y cambios son atómicos: ningún campo cambia si otro falla. No aceptar rol/estado/permisos/ID objetivo en autoedición.

Cambio nombre/email refresca identidad sin cambiar relaciones; email cambiado invalida recovery previo. Cambio contraseña incrementa `auth_version`, invalida recovery, limpia cookies y sesión cliente. Los anteriores access/refresh se rechazan y el nuevo login usa datos actualizados.

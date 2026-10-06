# Investigación y decisiones

Fecha: 2026-10-06. Revisión local de código y investigación de apoyo solo de lectura según Spec Kit Plan. No se ejecutaron pruebas ni servicios, ni se consultó producción. Sin incógnitas pendientes para diseñar.

## 1. Guardado parcial compatible

**Decisión**: añadir PATCH y conservar PUT completo.

**Evidencia**: `service.save_attendance_day` exige igualdad entre IDs enviados y matriculados activos; `attendanceModel.buildAttendancePayload` devuelve null si hay pendientes. `MateriaAsistencia` es el único consumidor productivo localizado de `saveAsistenciaDia`; E2E exige cero escrituras antes del botón manual.

**Razón**: un guardado individual no puede usar ese contrato sin cambiar su significado. PATCH aditivo reduce el riesgo para clientes anteriores y permite reversión de frontend.

**Alternativas**: relajar PUT a subconjunto cambia su contrato; mandar todos los marcados cada vez sobrescribe cambios ajenos y agrega tráfico; rellenar alumnos omitidos con un estado inventa asistencia. Rechazadas.

## 2. Persistencia atómica sin migración

**Decisión**: upsert PostgreSQL por clave única existente; compartir persistencia con PUT, conservando validaciones separadas.

**Evidencia**: `models.py` y migración `202607280001_asistencia_diaria.py` definen `uq_asistencia_materia_estudiante_fecha`. El servicio actual selecciona existentes y después inserta; dos primeras escrituras pueden competir. SQLAlchemy ya se usa en el proyecto.

**Razón**: upsert resuelve identidad y concurrencia de inserción sin nueva tabla. Actualizar `updated_at` explícitamente y preservar ID/creación en conflicto. Ordenar lotes por alumno y validar antes de escribir.

**Alternativas**: capturar errores de unicidad tras INSERT complica recuperación; locks solo sobre filas existentes no protegen filas nuevas; modificar tablas sin necesidad agrega riesgo.

**Precondición**: la migración histórica no comprueba la restricción si encuentra tabla previa. Verificar en base aislada migrada y detener si no existe; no alterar producción silenciosamente. Concurrencia entre sesiones del mismo alumno permanece último commit aceptado, sin protocolo nuevo de versiones globales.

## 3. Cola y confirmación de revisiones locales

**Decisión**: hook acotado a contexto, una solicitud en vuelo, instantáneas/revisiones por alumno, conciliación de base y borrador.

**Evidencia**: `MateriaAsistencia` reinicia todo el borrador tanto ante cambios en `attendanceQuery.data` como en `saveMutation.onSuccess`. Estas rutas perderían correcciones hechas durante un autosave. `useBlocker` y beforeunload ya existen y pueden mantenerse basados en cambios no confirmados.

**Razón**: la respuesta de un envío confirma solo su versión. Guardado de alumnos diferentes se agrupa sin bloquear; no se aplican indiscriminadamente todos los datos de una respuesta a ediciones locales.

**Alternativas**: disparar solicitudes paralelas del mismo alumno puede invertir intención; debounce global sin cola pierde casos de corrección mientras se envía; deshabilitar lista al guardar empeora llamar asistencia. Rechazadas.

## 4. Observaciones, fallos y navegación

**Decisión**: debounce de 500 ms/blur para observaciones marcadas; selección guarda de inmediato; reintento explícito; protección de salida y aislamiento de contexto.

**Razón**: evitar envío por tecla y éxito falso. Una observación no define estado, por lo que espera selección y queda pendiente local. Un error de transporte puede ocurrir después de commit; repetir upsert conserva un registro. No afirmar cancelación de peticiones enviadas ni durabilidad offline.

**Alternativas**: toast por selección satura; reintentar indefinidamente no resuelve falta de permisos; borrar selección ante error pierde trabajo. Rechazadas.

## 5. Cobertura que debe evolucionar

- Unitarias actuales `test_asistencia_service.py`, `test_asistencia_report.py`, `test_authorization_contracts.py`: extender sin eliminar regresiones PUT.
- `attendanceModel.test.ts`: preservar builder completo, búsqueda y marcado de pendientes; agregar diferencias/conciliación.
- No hay pruebas de componente de MateriaAsistencia ni integración de persistencia de asistencia localizada; agregar hook y PostgreSQL aislado, siguiendo patrón seguro de `test_evaluation_criteria_update.py`.
- `e2e/mock/grading-review.mock.spec.ts` prueba guardado manual PUT y fixture no persistente. Adaptar solo asistencia; mantener pruebas de notas/calificación intactas.
- `e2e/p2-responsive.spec.ts` comprueba resumen no fijo, scroll, teclado y zoom real. Mantener y adaptar textos/status.
- Configurar `SPEC085_TEST_DATABASE_URL` en CI sin fallback a `DATABASE_URL`, para no convertir una omisión de integración en éxito.

# Contrato

GET api/config añade límites/release. POST api/responses sigue idempotente; completion_metrics opcional. Rechazos legibles con field/code si se conocen, sin datos ingresados en logs.

Confirmación: ID, contenido completo, fecha, sha256, settings, esquema y consentimiento correspondientes; un 200 arbitrario no acredita guardado.

GET admin/summary y admin/summary.csv privados, sin identidades. Recuentos por versión y docentes declarados; CSV previo conserva esquema_snapshot de cada constancia.

4.0 abierto usa archivo explícito autorizado, nunca rutas elegidas por cliente; cierre global sigue vigente. Versiones desconocidas se rechazan.

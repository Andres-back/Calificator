# Contrato del lector

Entrada: foto privada válida, MIME, docente, sesión y snapshot administrativo. Selección ausente falla sin modelo fijo. Perfiles usan revisión de clave por conexión; principal/respaldo no comparten secretos accidentalmente. Legacy OpenCode conserva origen institucional/docente.

Salida: hasta100 nombres normalizados, confianza y advertencias; no crea cuentas. Dos variantes solo para ausencia/JSON inválido; error de transporte sale tras reintentos internos.

Fallo `resultado_json.codigo`: `no_names`, `invalid_response`, `service_unavailable`. Mensaje público/logs nuevos no incluyen excepciones externas, URLs, nombres ni claves. UI traduce códigos conocidos; legacy/desconocido usa mensaje neutral. Botón conserva cancelación y elección de otra foto.

API/permisos, cancelación, expiración y eliminación temporal siguen061.

# Administracion y despliegue independiente

Esta aplicacion tiene su propio contenedor, credenciales, volumen SQLite y backup.
No utiliza usuarios, tablas, API keys ni servicios de IA de la aplicacion academica.

## Respuestas

El panel /encuesta-docente/admin/ muestra un formulario de inicio de sesion propio.
Usa ADMIN_USER y ADMIN_PASSWORD del .env existente, sin cambiar las credenciales.
Las sesiones duran ocho horas; se guardan solo como hashes en SQLite y se revocan
al pulsar Salir. La cookie es HttpOnly, Secure en HTTPS, SameSite=Strict y queda
limitada a /encuesta-docente/admin. Ingresar y salir requieren CSRF del mismo origen.
HTTP Basic preautenticado sigue disponible para las comprobaciones de administracion,
pero los navegadores ya no dependen de su ventana emergente de credenciales.
Permite buscar por docente, codigo, institucion, area, grado, etiquetas o notas;
filtrar por institucion, estado, etiqueta, interes en demo, version y fecha;
ordenar por fecha/nombre/institucion; leer cada respuesta y descargar su constancia.

Los estados son Por revisar, Revisada, Seguimiento y Excluida del analisis.
Cada respuesta admite hasta ocho etiquetas y una nota privada.
La organizacion se guarda en response_reviews, separada de responses.
No modifica los campos respondidos, consentimiento, firma ni hash original.

Desde el 2026-10-19 solo se aceptan nuevos envios con firma dibujada y autorizacion
expresa de guardado. Nombre escrito no sustituye el dibujo. Las respuestas
historicas con nombre siguen consultables y descargables sin modificacion.
No se debe convertir un nombre antiguo en una firma ni reescribir su consentimiento.

El CSV conserva todas las respuestas e incluye estado_revision y etiquetas_revision.
Para analizar la muestra, filtre las excluidas; marcarlas no elimina la constancia.
El CSV no incluye identidad, contactos, firma ni notas privadas.
Los textos libres y las etiquetas aun pueden identificar personas: revisarlos antes de compartir.

## Operacion

El despliegue VPS usa compose.vps.yaml y el proyecto Docker encuesta-docente.
El volumen de respuestas es persistente: no usar down -v ni eliminar volumenes.
El proxy central solo agrega /encuesta-docente/ al dominio existente.
El puerto 8092 solo existe en la red dedicada de Docker; no se publica en el host.

El respaldo diario usa SQLite backup, copia un snapshot fuera del volumen a
/var/backups/encuesta-docente y mantiene treinta dias con permisos privados.
Esta copia local no sustituye una copia externa.
Las credenciales reales solo estan en el .env privado del servidor y en la nota
privada de Obsidian entregada al propietario, nunca en Git.

Validacion: python -m unittest discover -s tests -v.

La encuesta envia Cache-Control: no-store, no-transform para evitar almacenamiento
en cache e inyeccion automatica de scripts de Cloudflare en estas respuestas.
Su politica CSP conserva script-src 'self'. No se agregan trackers al formulario.
Referencia: https://developers.cloudflare.com/web-analytics/faq/

## Formato separado del piloto

`/retroalimentacion-piloto/` recibe observaciones y sugerencias del uso del piloto,
con consentimiento y firma al final. Sus respuestas se conservan en otra base,
`retroalimentacion-piloto.sqlite3`, y se consultan en
`/retroalimentacion-piloto/admin/`. Comparte las credenciales administrativas del
servicio, pero usa sesiones, registros y revisiones propios. El panel identifica
el instrumento y no presenta el filtro de interés en una demostración del diagnóstico.

`compose.vps.yaml` verifica la salud de los dos formularios sin publicar puertos.
La copia actualizada de `backup.vps.sh` respalda las dos bases en archivos separados
y conserva el plazo de treinta días de los respaldos diarios. Al actualizar el VPS,
copiar también este script a la ubicación que usa el servicio systemd; modificar
solo el archivo del repositorio no cambia una copia instalada previamente.
Añadir al proxy central la ruta `/retroalimentacion-piloto/`, apuntando al mismo
contenedor en la red dedicada. No modificar el volumen de respuestas existente.

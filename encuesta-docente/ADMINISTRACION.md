# Administracion y despliegue independiente

Esta aplicacion tiene su propio contenedor, credenciales, volumen SQLite y backup.
No utiliza usuarios, tablas, API keys ni servicios de IA de la aplicacion academica.

## Respuestas

El panel /encuesta-docente/admin/ requiere sus propias credenciales HTTP Basic.
Permite buscar por docente, codigo, institucion, area, grado, etiquetas o notas;
filtrar por institucion, estado, etiqueta, interes en demo, version y fecha;
ordenar por fecha/nombre/institucion; leer cada respuesta y descargar su constancia.

Los estados son Por revisar, Revisada, Seguimiento y Excluida del analisis.
Cada respuesta admite hasta ocho etiquetas y una nota privada.
La organizacion se guarda en response_reviews, separada de responses.
No modifica los campos respondidos, consentimiento, firma ni hash original.

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

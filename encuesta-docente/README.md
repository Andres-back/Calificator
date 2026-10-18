# Encuesta docente independiente de XCalificator

Web pública sin cuenta para docentes, consentimiento informado, firma con dedo/ratón y confirmación accesible con nombre. Recoge el instrumento LR-CR-01 adaptado como **3.3-web**, conserva respuestas en SQLite y genera constancia imprimible. El acceso a resultados exige contraseña. Es una aplicación separada: no modifica ni requiere el backend, usuarios o base académica de XCalificator.

La adaptación y sus límites investigativos se documentan en [METODOLOGIA.md](METODOLOGIA.md). Cubre necesidades, preferencias y registro de línea base. No sustituye satisfacción posterior, comparación pareada de tiempos ni concordancia docente-IA.

La [justificación de elección del cuestionario](FUNDAMENTACION_INSTRUMENTO.md) contiene referencias académicas, correspondencia entre preguntas y propósito y distinción entre fundamentación y validación.

El [planteamiento del problema](PLANTEAMIENTO_PROBLEMA.md) relaciona tiempo de calificación, organización y recuperación de evidencia, rúbricas e informes por estudiante con lo que se debe preguntar y comprobar. La versión 3.2-web amplía esos aspectos; conserva la configuración anterior en `versions/3.1-web/`.

La versión actual 3.3-web recoge **solo tiempos manuales**, sin XCalificator ni otra herramienta que sugiera notas o retroalimentación automáticamente. No pregunta si ya utilizó la herramienta, qué función probaría primero ni si participaría en mediciones de concordancia. La única invitación final pregunta si desea recibir contacto para una demostración o prueba piloto; no compromete su participación. El consentimiento pasa a v2 y se conserva 3.2-web en `versions/3.2-web/`.

## Instalación en el mismo VPS

Requiere Docker Compose y el proxy HTTPS que ya usa XCalificator. No requiere suscripción a un servicio de formularios ni APIs externas; utiliza almacenamiento y recursos del servidor existente. No publicar con GitHub Pages: una página estática no guarda las respuestas de este sistema.

Desde la copia del repositorio en el servidor:

```bash
cd encuesta-docente
python3 configure.py --origin https://xcalificator.daimuz.com
docker compose -p xcalificator-encuesta up -d --build
docker compose -p xcalificator-encuesta ps
curl -fsS http://127.0.0.1:8092/encuesta-docente/health
```

`configure.py` crea `.env` con dos secretos independientes, no los muestra y se niega a sobrescribir una configuración existente. Si ya existe `.env`, edítelo conservando sus secretos. El usuario inicial de administración es `investigacion`; la contraseña se consulta **privadamente** en `.env`. No enviar ese archivo por Git ni al grupo de docentes.

En `settings.json` están responsables, correos, teléfono, finalidad y conservación. Los nombres se basan en la información del autor y los contactos en la propuesta. Verifique esos datos de contacto antes de distribuir la encuesta. Si cambia el contenido del consentimiento, cambie también `consent_version` y reconstruya el contenedor; las constancias existentes conservan el texto que se aceptó.

Añada el contenido de `nginx-location.conf` **dentro del bloque `server` HTTPS que sirve el dominio**, valide `nginx -t` y recargue ese proxy. No reemplazar su configuración existente. El ejemplo supone Nginx en el host. Si el proxy está dentro de otro contenedor, `127.0.0.1` se refiere a ese contenedor: conéctelos a una red Docker compartida y use el nombre del servicio como upstream. El servicio no se expone a Internet directamente.

Rutas después de instalar el proxy:

- Docentes: `https://xcalificator.daimuz.com/encuesta-docente/`
- Investigadores: `https://xcalificator.daimuz.com/encuesta-docente/admin/`
- Salud: `/encuesta-docente/health`

Estas son rutas de instalación previstas, no prueba de publicación. El código no despliega automáticamente en el VPS. Si usa un subdominio independiente, configure `PUBLIC_ORIGIN` con ese origen y `BASE_PATH=` vacío; adapte el proxy para `/`.

El administrador usa autenticación HTTP Basic del navegador sobre HTTPS. El CSV excluye identidad y firma, pero sigue siendo **codificado, no garantizadamente anónimo**: los textos libres y combinaciones de contexto pueden identificar personas. Las constancias completas son privadas. No adjuntar datos reales a issues, PR, capturas públicas o el repositorio.

## Operación y conservación

Las respuestas y los dibujos de firma se almacenan en el volumen Docker `respuestas`. No están en archivos servidos por la web. No ejecutar `docker compose down -v` mientras se deban conservar datos. La configuración de acceso no contiene contraseñas predeterminadas útiles. Si la contraseña de administración está vacía o tiene menos de 20 caracteres, el panel no permite entrar.

Después de confirmar una respuesta, el docente puede descargar una constancia HTML autocontenida o imprimirla/guardar PDF desde el navegador. Incluye respuestas, consentimiento aceptado, firma, versión, fecha UTC del servidor, código y huella SHA-256. Cada registro conserva también los enunciados y alternativas de la versión respondida, para reproducir la constancia aunque después cambie el cuestionario. No se envía por correo automáticamente. La firma dibujada no autentica por sí sola la identidad ni es firma digital certificada; la huella no es un sello externo de tiempo.

Durante la respuesta se conserva el formulario **en memoria de esa pestaña**, sin persistir nombre o firma en almacenamiento local. Si falla el envío, los campos permanecen para reintentar; si recarga o cierra antes de confirmar, puede perder lo diligenciado. Reintentos idénticos usan el mismo UUID y no duplican registros. Un UUID con contenido distinto se rechaza para evitar sobrescribir una constancia ya recibida. Una persona podría responder más de una vez desde sesiones distintas: concilie personas y aplicaciones antes de contar la muestra.

Comandos de custodia (contienen datos reales una vez en producción):

```bash
# Conteo sin mostrar identidades
docker compose -p xcalificator-encuesta exec encuesta-docente python manage.py stats

# Verificar correspondencia de contenido y huellas
docker compose -p xcalificator-encuesta exec encuesta-docente python manage.py verify

# Respaldo consistente: elija un nombre nuevo, luego copie el archivo a almacenamiento privado
docker compose -p xcalificator-encuesta exec encuesta-docente python manage.py backup /data/respaldo-AAAA-MM-DD.sqlite3
```

Para atender una supresión procedente, `manage.py delete CODIGO --confirm-id CODIGO` elimina la fila y compacta la base; ejecútelo solo tras resolver la solicitud. Se deben gestionar por separado copias, exportaciones y respaldos. Al finalizar validación de tesis y eventual publicación, exportar únicamente resultados agregados o efectivamente anonimizados y eliminar identificadores, contactos y firmas conforme al consentimiento. La aplicación **no determina automáticamente** que esos procesos terminaron ni anonimiza textos libres por sí sola.

Cerrar recolección: cambiar `enabled` a `false` en `settings.json` y ejecutar nuevamente `docker compose -p xcalificator-encuesta up -d --build`. El panel de investigadores sigue disponible. Mantener copias y credenciales con acceso restringido; la base no está cifrada por la aplicación, por lo que los permisos y la protección del disco/respaldos corresponden al operador del VPS.

## Vista local y pruebas

Python 3.11 o posterior. Para la vista local y las pruebas no se necesitan paquetes externos:

```bash
cd encuesta-docente
python app.py --port 8092
python -m unittest discover -s tests -v
```

Vista local: `http://127.0.0.1:8092/encuesta-docente/`. El servidor integrado es solo para desarrollo; producción usa Gunicorn en el contenedor. Para probar el panel local, defina `ADMIN_USER` y un `ADMIN_PASSWORD` de al menos 20 caracteres en el entorno antes de iniciar. Use una base separada mediante `DATABASE_PATH` para pruebas; no copiar datos ficticios a producción.

El servicio usa bibliotecas estándar de Python y Gunicorn 23.0.0 en producción. No añade servicios de IA ni comparte información con proveedores de IA. La exportación y la impresión funcionan sin servicios externos.

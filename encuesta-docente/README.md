# Encuesta docente independiente de XCalificator

Web pública sin cuenta, con la identidad visual de XCalificator: logotipo original, paleta índigo/violeta y tipografías locales Inter y Plus Jakarta Sans (licencias SIL OFL incluidas en `public/branding/`). No carga fuentes ni servicios externos.

Versión actual **LR-CR-01 5.1-web-flexible**, release **5.2.0**: 24 preguntas opcionales, incluida institución, sin dependencias que bloqueen el envío. Conserva nombre para la constancia, consentimiento v5.1 y firma. Acepta porcentajes como `50 %` o `50,5`; aproximaciones no numéricas se conservan como texto, sin usarse como mediciones. La duración real está pendiente de preprueba con docentes; no se anuncia 5–7 minutos. Servicio independiente del backend académico. El nombre se escribe una sola vez y se muestra automáticamente al firmar; no hay segundo campo que deba coincidir manualmente. Se mantienen límites de tamaño, formato de correo opcional y protección de peticiones.

Recoge contexto, carga de calificación manual, dificultades, organización/consulta de evidencias y necesidades de apoyo. Una sola invitación final permite expresar interés en demo/piloto. No requiere haber usado el programa ni participar en el piloto. No evalúa satisfacción/TAM ni compara tiempos asistidos; la medición exacta del piloto es separada.

El historial 3.x, 4.0 y 5.0 se conserva en `versions/`; pestañas 4.0/5.0 ya abiertas pueden enviarse con su contrato y consentimiento originales. Para usar el formulario flexible deben recargar antes de empezar. No se convierten rangos antiguos en minutos exactos ni se mezclan versiones. El panel privado muestra respuestas y docentes declarados por versión y exporta un resumen CSV. Docentes declarados significa nombre/institución normalizados, no identidad verificada. Véase [METODOLOGIA.md](METODOLOGIA.md).

La [fundamentación](FUNDAMENTACION_INSTRUMENTO.md) respalda la elección y reducción sin atribuir validación no realizada. El [planteamiento del problema](PLANTEAMIENTO_PROBLEMA.md) relaciona diagnóstico, funciones y comprobaciones posteriores.

## Retroalimentación firmada del piloto

El mismo servicio incluye un formato separado **FR-PIL-01 1.0-web**, de nueve preguntas sobre la prueba, observaciones y sugerencias, con firma en pantalla y constancia descargable. Es para docentes que utilizaron XCalificator o presenciaron una demostración, registrando la diferencia. No sustituye satisfacción/TAM ni mediciones de impacto. El [protocolo de retroalimentación](RETROALIMENTACION_PILOTO.md) detalla propósito, análisis y custodia.

- Docentes del piloto: `/retroalimentacion-piloto/`.
- Investigadores: `/retroalimentacion-piloto/admin/`, con las mismas credenciales del servicio.
- Base independiente: `retroalimentacion-piloto.sqlite3`, junto a la base de encuesta; en Docker queda en el mismo volumen `/data`.

Para actualizar una instalación existente, reconstruir el servicio y añadir las nuevas ubicaciones de `nginx-location.conf` al servidor HTTPS, validar y recargar Nginx. No es necesario regenerar `.env`; `FEEDBACK_BASE_PATH` y `FEEDBACK_DATABASE_PATH` son opcionales. Las respuestas de diagnóstico se conservan. Cada formato tiene su propia configuración de cierre (`enabled`).

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
- Salud de retroalimentación: `/retroalimentacion-piloto/health`

Estas son rutas de instalación previstas, no prueba de publicación. El código no despliega automáticamente en el VPS. Si usa un subdominio independiente, configure `PUBLIC_ORIGIN` con ese origen y `BASE_PATH=` vacío; adapte el proxy para `/`.

El administrador inicia sesión desde un formulario web sobre HTTPS con las credenciales del `.env`. La sesión dura ocho horas y se revoca al pulsar Salir; no depende de la ventana emergente de HTTP Basic del navegador. El CSV excluye identidad y firma, pero sigue siendo **codificado, no garantizadamente anónimo**: los textos libres y combinaciones de contexto pueden identificar personas. Las constancias completas son privadas. No adjuntar datos reales a issues, PR, capturas públicas o el repositorio.

## Operación y conservación

Desde el 19 de octubre de 2026 los nuevos envíos de ambos formularios requieren
firma dibujada con dedo o ratón y autorización expresa para guardar el dibujo.
El nombre escrito identifica a quien firma, pero no reemplaza el trazo. La API
también aplica esta regla. Se actualizaron los consentimientos a CI-NEC-01-v4-2026-10-19
y CI-PIL-RET-01-v2-2026-10-19; no se cambiaron las preguntas del instrumento.
Las respuestas anteriores, incluidas las confirmadas solo con nombre, conservan
su contenido, versión, consentimiento y hash originales y siguen disponibles en admin.

Las respuestas y los dibujos de firma se almacenan en el volumen Docker `respuestas`. No están en archivos servidos por la web. No ejecutar `docker compose down -v` mientras se deban conservar datos. La configuración de acceso no contiene contraseñas predeterminadas útiles. Si la contraseña de administración está vacía o tiene menos de 20 caracteres, el panel no permite entrar.

Después de confirmar una respuesta, el docente puede descargar una constancia HTML autocontenida o imprimirla/guardar PDF desde el navegador. Incluye respuestas, consentimiento aceptado, firma, versión, fecha UTC del servidor, código y huella SHA-256. Cada registro conserva también los enunciados y alternativas de la versión respondida, para reproducir la constancia aunque después cambie el cuestionario. No se envía por correo automáticamente. La firma dibujada no autentica por sí sola la identidad ni es firma digital certificada; la huella no es un sello externo de tiempo.

El formulario y un envío pendiente permanecen **solo en memoria de la pestaña**. Si la recepción es incierta se congela el contenido enviado y «Comprobar envío» reintenta el mismo paquete/UUID; un rechazo conocido permite corregir. Solo una constancia correspondiente al paquete completo habilita éxito y limpieza. Si se cierra o recarga sin confirmar, no se promete recuperación. No hay borradores personales en localStorage. Una persona puede responder desde sesiones distintas: concilie aplicaciones antes de contar su muestra. Los logs nuevos registran categoría de rechazo, nunca respuestas, identidad ni firma.

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

Retroalimentación local: `http://127.0.0.1:8092/retroalimentacion-piloto/`. Para pruebas, puede fijar también `FEEDBACK_DATABASE_PATH` a una base de prueba diferente. Si no se indica, se crea junto a `DATABASE_PATH`.

El servicio usa bibliotecas estándar de Python y Gunicorn 23.0.0 en producción. No añade servicios de IA ni comparte información con proveedores de IA. La exportación y la impresión funcionan sin servicios externos.

# Investigación: recuperación de contraseña y SMTP

## Decisión 1: token reconstruible y revocable

- **Decisión**: UUID v4 como selector, firma HMAC-SHA256 con `SECRET_KEY`, hash SHA-256 del token completo en PostgreSQL y comparación constante.
- **Motivo**: el worker puede reconstruir el enlace usando solo el ID; no se persiste ni se encola el secreto completo.
- **Alternativas consideradas**: JWT sin estado (no permite revocación simple), token aleatorio en Celery/Redis (expone el secreto en la cola), token cifrado temporalmente en DB (aumenta superficie sensible).

## Decisión 2: invalidación de sesiones

- **Decisión**: agregar `auth_version` al usuario e incluirlo en access/refresh JWT.
- **Motivo**: los JWT actuales son sin estado y no pueden revocarse individualmente.
- **Alternativas consideradas**: lista negra Redis (más estado y mantenimiento), rotación global de `SECRET_KEY` (cerraría sesiones de todos).

## Decisión 3: entrega SMTP

- **Decisión**: SMTP estándar con STARTTLS, ejecución Celery y configuración global cifrada en PostgreSQL con respaldo por entorno.
- **Motivo**: funciona con Google y con otros proveedores sin acoplar el dominio; la solicitud web no espera al proveedor.
- **Alternativas consideradas**: envío síncrono (bloquea y filtra latencia), Gmail API/OAuth (más complejidad inicial), proveedor transaccional propietario (acoplamiento).

## Decisión 4: administración del secreto

- **Decisión**: formulario exclusivo de admin con campos host, puerto, TLS, usuario/remitente y reemplazo opcional de contraseña. Las lecturas exponen solo `has_password` y resultados de prueba.
- **Motivo**: permite rotación operativa sin acceso al VPS ni recuperación del secreto anterior.
- **Alternativas consideradas**: solo variables de entorno (seguro pero no cumple gestión desde interfaz), mostrar máscara parcial (innecesario para una contraseña de aplicación).

## Decisión 5: Google

- **Decisión**: valores iniciales compatibles con `smtp.gmail.com:587`, STARTTLS y contraseña de aplicación; para Workspace se podrá cambiar a relay sin modificar código.
- **Motivo**: configuración portable y comprensible.
- **Alternativas consideradas**: fijar Gmail en código (impide migrar), contraseña normal (Google no la admite y es insegura).
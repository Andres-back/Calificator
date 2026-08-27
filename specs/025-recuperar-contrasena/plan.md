# Plan: Recuperación segura de contraseña

**Rama**: `codex/025-recuperar-contrasena` | **Fecha**: 2026-08-27 | **Spec**: [spec.md](./spec.md) | **Issue**: #37

**Estado**: Aprobado por el usuario el 2026-08-27

## Resumen

Incorporar solicitud y consumo de enlaces de recuperación de un solo uso para todos los roles, invalidación de sesiones mediante versión de autenticación y entrega asíncrona por SMTP. La configuración global de correo será exclusiva del administrador, guardará la credencial cifrada y permitirá rotarla o probarla sin exponerla.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11; TypeScript 5.6; React 18.
**Dependencias**: FastAPI, SQLAlchemy async, PostgreSQL 16, Celery/Redis, `smtplib`/`ssl` de la biblioteca estándar, React Query y React Router.
**Persistencia**: PostgreSQL mediante una migración Alembic posterior a `202608260002`; Redis solo para transportar el identificador no secreto del trabajo.
**Pruebas**: pytest unitario/integración; Vitest; E2E mockeado dirigido; build TypeScript/Vite.
**Plataforma objetivo**: contenedores Linux del VPS y navegadores móviles/escritorio.
**Rendimiento y escala**: respuesta neutral de solicitud en menos de 1 s sin esperar SMTP; un solo enlace vigente por cuenta; envío observable y reintentable; formularios utilizables desde 360 px.

## Verificación de la constitución

- Separación de roles: los endpoints públicos solo solicitan/consumen; la configuración SMTP usa dependencia `admin` en backend y ruta protegida en frontend.
- Integridad y trazabilidad: no modifica roles ni datos académicos; cada solicitud conserva estados mínimos auditables.
- Asincronía e idempotencia: la web confirma tras persistir y encola por ID; el worker reconstruye el enlace y evita envíos duplicados por estado.
- Datos y secretos: el token completo no se persiste ni viaja en la cola; se reconstruye con HMAC desde un UUID aleatorio y `SECRET_KEY`. La clave SMTP se cifra con Fernet y nunca se devuelve.
- Accesibilidad: estados de carga, éxito, vencimiento y error; controles táctiles y claro/oscuro desde 360 px.
- Gobernanza y pruebas: issue #37, especificación, plan, tareas y pruebas dirigidas antes de PR.

## Estructura del proyecto

```text
backend/
├── alembic/versions/                         # tablas de recuperación, SMTP y auth_version
├── app/core/                                 # configuración y tokens versionados
├── app/modules/auth/                         # modelos, esquemas, servicio y endpoints públicos
├── app/modules/admin_mail/                   # configuración SMTP exclusiva de admin
├── app/services/                             # cifrado y entrega SMTP
└── app/workers/                              # tarea de correo asíncrona
frontend/src/
├── config/                                   # rutas y navegación admin
├── modules/auth/                             # solicitar y restablecer contraseña
└── modules/admin/                            # configuración global de correo
backend/tests/                                # contratos, seguridad, concurrencia y SMTP simulado
frontend/src/**/*.test.tsx                    # formularios, rol y secreto enmascarado
```

## Decisiones y complejidad

- El enlace tendrá un identificador UUID aleatorio y una firma HMAC derivada de `SECRET_KEY`. La base guarda su hash y el worker recibe solo el ID, por lo que puede reconstruir el enlace sin guardar ni encolar el secreto completo.
- Se agrega `auth_version` al usuario. Los JWT nuevos incluyen esa versión y los tokens antiguos se interpretan como versión 1 para un despliegue compatible; un restablecimiento la incrementa e invalida todas las sesiones previas.
- SMTP tiene tabla propia para no mezclar correo transaccional con proveedores de IA. Las variables de entorno actúan como respaldo si aún no existe configuración administrativa.
- La prueba SMTP se envía al propio remitente y devuelve solo estado/latencia/código seguro.
- No se añade una librería SMTP externa: la biblioteca estándar cubre STARTTLS y reduce dependencias.

## Verificación posterior al diseño

Los contratos mantienen respuestas neutrales, ningún esquema contiene la credencial de lectura, las transiciones de datos son atómicas y el trabajo asíncrono transporta únicamente un UUID. No hay excepciones a la constitución.
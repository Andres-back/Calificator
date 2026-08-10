# Auditoría defensiva de seguridad — XCalificator

Fecha: 2026-08-09
Alcance: repositorio local `E:\tesis` y servicios de desarrollo accesibles desde la máquina Kali autorizada `192.168.1.133`.
Metodología: revisión estática de FastAPI/React, validación de configuración, auditoría de dependencias y pruebas HTTP anónimas no destructivas mediante túnel SSH local.

## Estado de remediación — 2026-08-10

Los hallazgos SEC-001 a SEC-007 quedaron corregidos y cubiertos por pruebas automatizadas: el registro público fuerza el rol estudiante; las evidencias se sirven mediante autorización; autenticación y digitalización tienen límites Redis; las operaciones por cookie validan CSRF; las cargas se leen por bloques con corte temprano; React Router quedó actualizado sin avisos de `npm audit`; y la plantilla Nginx de producción aplica CSP. SEC-008 queda controlado por el preflight obligatorio de despliegue, que rechaza secretos o dominios de ejemplo antes de iniciar producción.

La digitalización de evaluaciones también pasó a ejecutarse como trabajo persistente en segundo plano. La prueba funcional con el PDF de referencia creó un borrador de 7 preguntas en 16,2 segundos, permitió navegar durante el proceso y notificó la finalización sin errores de consola.

## Resumen ejecutivo

No se encontraron vulnerabilidades críticas ni exposición directa de los puertos de XCalificator hacia la LAN. Se identificó un hallazgo de severidad alta: el registro público permite solicitar el rol `profesor`. También se encontraron seis hallazgos medios y uno bajo relacionados con protección de evidencias, limitación de solicitudes, CSRF, cargas de archivos, dependencias, CSP y preparación de despliegue.

Advertencia del laboratorio: el servicio SSH de Kali quedó accesible en la LAN con una credencial débil compartida. La contraseña no se guardó en este informe. Debe rotarse, sustituirse por autenticación mediante clave y restringirse el puerto 22 al equipo de pruebas.

Prioridad recomendada:

1. Impedir inmediatamente que el registro público acepte cualquier rol distinto de estudiante.
2. Eliminar la publicación estática de `uploads` desde FastAPI y servir evidencias únicamente mediante endpoints autorizados.
3. Implementar limitación real con Redis para autenticación y operaciones de IA/visión.
4. Completar CSRF, límites de carga, dependencias y cabeceras antes del siguiente despliegue.

## Alcance y límites

- Se comprobó conectividad SSH con Kali y se usaron Nmap 7.99, Nikto 2.6.0 y curl.
- Los servicios locales de XCalificator estaban vinculados a `127.0.0.1`. Desde Kali, los puertos `5173` y `8000` de `192.168.1.107` aparecieron filtrados.
- Para evitar exponer la aplicación a la LAN, las pruebas se hicieron mediante puertos de túnel disponibles solo en `127.0.0.1` dentro de Kali.
- No se ejecutó fuerza bruta, SQLMap, explotación, creación de cuentas, modificación de datos ni análisis autenticado.
- No se evaluó la dirección pública configurada en el entorno porque no se confirmó autorización expresa sobre esa infraestructura.

## Hallazgos

### SEC-001 — El registro público permite autoconcederse el rol de profesor

- Rule ID: FASTAPI-AUTHZ-001
- Severity: High
- Location:
  - `backend/app/modules/auth/schemas.py:11`, `RegisterRequest`
  - `backend/app/modules/users/schemas.py:9-16`, `UserBase` / `UserCreate`
  - `backend/app/modules/auth/service.py:20-26`, `register_public_user`
  - `backend/app/modules/auth/router.py:30-38`, `register`
- Evidence: `RegisterRequest` hereda de `UserCreate`; `UserBase` expone `rol`; el servicio solo rechaza `UserRole.ADMIN`. Una validación exclusivamente en memoria confirmó `public_schema_accepts_role=profesor` sin crear usuarios.
- Impact: cualquier persona con acceso al endpoint público podría registrarse como profesor y obtener capacidades privilegiadas para crear materias, evaluaciones o recursos. Es una escalación vertical de privilegios.
- Fix: crear un esquema público separado que no incluya `rol` y asignar `UserRole.ESTUDIANTE` dentro del servidor. Mantener la creación de profesores y administradores en un endpoint administrativo o flujo de invitación/aprobación.
- Mitigation: deshabilitar temporalmente `/api/auth/register` en producción si el autorregistro no es indispensable.
- False positive notes: solo sería intencional si el producto permite explícitamente que cualquier visitante sea profesor; aun así debería existir verificación/aprobación y quedar documentado.

### SEC-002 — Las evidencias son públicas al alcanzar directamente el backend

- Rule ID: FASTAPI-FILES-001 / FASTAPI-AUTHZ-001
- Severity: Medium
- Location:
  - `backend/app/main.py:54-59`, montaje de `StaticFiles`
  - `backend/app/services/storage_service.py:37-46`, nombre y URL pública
  - `nginx/templates/default.conf.template:48-52`, bloqueo compensatorio en Nginx
- Evidence: desde Kali, una solicitud anónima a una evidencia de prueba devolvió HTTP `200`. FastAPI monta todo `UPLOADS_DIR` como estático sin autenticación.
- Impact: si el puerto del backend se publica, se configura mal el proxy o se filtra una URL, fotos/PDF de estudiantes pueden descargarse sin verificar matrícula, propiedad ni rol.
- Fix: eliminar el montaje estático de `uploads`; devolver identificadores opacos y servir cada archivo desde un endpoint que compruebe profesor propietario, estudiante dueño o matrícula autorizada. Usar `Content-Disposition` seguro cuando corresponda.
- Mitigation: conservar el bloqueo `location ^~ /uploads/ { return 404; }`, mantener el backend en loopback/red privada y añadir una prueba de despliegue que confirme `404` desde el borde.
- False positive notes: el despliegue Nginx actual mitiga este acceso y los puertos estaban filtrados desde la LAN. El riesgo reaparece ante acceso directo al backend.

### SEC-003 — No existe limitación efectiva de solicitudes

- Rule ID: FASTAPI-LIMITS-001
- Severity: Medium
- Location: `backend/app/core/rate_limit.py:4-6`, `rate_limit_placeholder`
- Evidence: el único limitador encontrado es una función vacía que retorna `None` y no aparece aplicada a las rutas. Nikto pudo completar 7.982 solicitudes en 55 segundos contra el backend de prueba.
- Impact: facilita ataques de credenciales, creación masiva de cuentas, abuso de endpoints costosos de IA/visión y agotamiento de CPU, memoria o cuota del proveedor.
- Fix: implementar un limitador Redis por IP y por usuario, con políticas específicas para login, registro, refresh, generación, digitalización y calificación. Devolver `429` con `Retry-After` y registrar alertas sin almacenar contraseñas o tokens.
- Mitigation: aplicar `limit_req` en Nginx y límites de concurrencia en workers mientras se implementa el control de aplicación.
- False positive notes: podría existir un WAF externo no visible en el repositorio; debe verificarse en producción.

### SEC-004 — Autenticación por cookies sin token CSRF

- Rule ID: FASTAPI-CSRF-001 / REACT-CSRF-001
- Severity: Medium
- Location:
  - `backend/app/core/permissions.py:15-31`, autenticación tomada de cookie
  - `backend/app/modules/auth/service.py:29-50`, cookies de sesión
  - `backend/app/modules/auth/router.py:14-62`, acciones de sesión
  - `frontend/src/lib/api.ts:8-13`, `withCredentials: true`
- Evidence: las solicitudes autenticadas usan cookies automáticas y no se encontró generación o validación de token CSRF ni validación centralizada de `Origin`/`Referer` para operaciones mutables.
- Impact: un contexto atacante que consiga enviar cookies en una petición válida —por ejemplo, un origen same-site comprometido— podría provocar cambios con la sesión de la víctima.
- Fix: incorporar un mecanismo CSRF probado y exigir el token en POST/PUT/PATCH/DELETE. Añadir validación estricta de `Origin` como defensa adicional.
- Mitigation: las cookies ya usan `HttpOnly`, `Secure` y `SameSite=Lax`; CORS rechazó dinámicamente un origen no autorizado. Conservar estas defensas.
- False positive notes: `SameSite=Lax` reduce fuertemente el CSRF cross-site común, por lo que no se clasifica como alto. CORS por sí solo no sustituye CSRF.

### SEC-005 — Varias cargas se almacenan completas en memoria antes del límite

- Rule ID: FASTAPI-LIMITS-001 / FASTAPI-UPLOAD-001
- Severity: Medium
- Location:
  - `backend/app/modules/evaluaciones/router.py:43,89`
  - `backend/app/modules/dba/router.py:162`
  - `backend/app/modules/calificaciones/router.py:109,315,419,740,932-934`
  - `nginx/templates/default.conf.template:14`, límite del borde de 50 MB
- Evidence: múltiples endpoints ejecutan `await file.read()` antes de comprobar tamaño; en digitalización de evaluaciones y DBA no se encontró un límite local. Los lotes pueden acumular hasta 100 MB después de haber leído los archivos.
- Impact: un usuario autenticado puede aumentar el consumo de memoria y bloquear workers mediante solicitudes grandes o concurrentes. SEC-001 amplía quién podría alcanzar endpoints de profesor.
- Fix: validar `Content-Length` cuando esté disponible, leer en bloques con corte temprano, aplicar límites por archivo y por lote antes del procesamiento, y limitar concurrencia para visión/LLM.
- Mitigation: reducir y alinear `client_max_body_size` con el máximo real de la aplicación; no publicar el backend directamente.
- False positive notes: el límite Nginx reduce el impacto cuando todo el tráfico atraviesa ese proxy.

### SEC-006 — React Router tiene dos avisos de seguridad moderados

- Rule ID: REACT-SUPPLY-001
- Severity: Medium
- Location:
  - `frontend/package.json:36`
  - `frontend/package-lock.json:7454-7476`
- Evidence: `npm audit --omit=dev` detectó dos vulnerabilidades moderadas en `react-router`/`react-router-dom` 6.30.4: redirección abierta con posible XSS y constructor injection en hidratación SSR. Existe corrección automática compatible.
- Impact: una ruta controlada por atacante podría contribuir a redirecciones inseguras; la segunda alerta afecta principalmente escenarios SSR/hydration, no observados en esta SPA Vite.
- Fix: actualizar con una versión corregida, revisar el diff del lockfile y ejecutar unitarias, E2E y build.
- Mitigation: mantener destinos de navegación como rutas relativas controladas; la aplicación ya valida el enlace especial del editor de presentaciones.
- False positive notes: la vulnerabilidad SSR probablemente no es alcanzable en la arquitectura actual; la de navegación debe corregirse de todos modos.

### SEC-007 — Falta Content-Security-Policy en el frontend de producción

- Rule ID: REACT-CSP-001 / REACT-HEADERS-001
- Severity: Medium
- Location: `nginx/templates/default.conf.template:16-19,137-150`
- Evidence: Nginx configura `nosniff`, protección de frame, referrer y permisos, pero no aparece `Content-Security-Policy`. Nikto también la reportó ausente en el servicio directo.
- Impact: una futura inyección XSS tendría menos contención del navegador y podría acceder a datos visibles o realizar acciones con la sesión.
- Fix: desplegar primero CSP en modo Report-Only, inventariar conexiones/imágenes/fuentes y luego aplicar una política sin `unsafe-eval`; evitar `unsafe-inline` mediante nonces/hashes si resulta necesario.
- Mitigation: el frontend no contiene `dangerouslySetInnerHTML`, `rehype-raw`, `eval`, `document.write` ni otros sumideros directos detectados. React Markdown mantiene desactivado HTML crudo.
- False positive notes: podría existir una CSP en un CDN/WAF externo no visible; verificar cabeceras del dominio final.

### SEC-008 — El preflight actual no considera el entorno listo para producción

- Rule ID: FASTAPI-DEPLOY-001 / FASTAPI-CORS-001
- Severity: Low
- Location: `scripts/preflight.py:44-76` y configuración local no versionada
- Evidence: `python scripts/preflight.py .env` falló sin mostrar secretos: `SERVER_NAME` no es apto para producción y `CORS_ORIGINS` no contiene únicamente orígenes HTTPS.
- Impact: un despliegue accidental con esta configuración puede producir cookies que no funcionen, orígenes incorrectos o una postura de transporte inconsistente.
- Fix: usar configuración separada por entorno y hacer obligatorio el preflight en el proceso de despliegue antes de iniciar contenedores.
- Mitigation: el runtime sí tiene `ENABLE_API_DOCS=False`, secreto JWT no predeterminado de 64 caracteres, hosts explícitos y cookies `Secure`.
- False positive notes: si `.env` es exclusivamente local y nunca se usa para desplegar, el hallazgo es de preparación operativa, no una vulnerabilidad activa.

## Controles verificados correctamente

- CORS rechazó un origen atacante durante la prueba dinámica.
- Los puertos de backend, base de datos, Redis, Ollama y Presenton están publicados únicamente en loopback.
- Trusted Host está habilitado y no acepta comodín en la configuración observada.
- OpenAPI, Swagger y ReDoc devolvieron `404` en el runtime de producción.
- Las rutas funcionales, salvo login/registro/refresh/logout, mostraron dependencias explícitas de autenticación en el análisis estático.
- Contraseñas con Argon2/Bcrypt; JWT firmado con algoritmo permitido y expiración.
- Cookies `HttpOnly`, `Secure` y `SameSite=Lax`.
- Los archivos reciben nombres UUID, validación por magic bytes y límites parciales.
- `.env` está ignorado y no apareció en el historial consultado.
- `pip-audit` no encontró vulnerabilidades conocidas en las dependencias Python.
- `npm audit` no encontró vulnerabilidades altas o críticas.
- El CI usa `npm ci`, `pip-audit`, pruebas, lint, compilación y builds de contenedores.

## Evidencia dinámica resumida

- Nmap desde Kali hacia `192.168.1.107`: `5173/tcp` y `8000/tcp` filtrados.
- Túnel aislado: frontend Vite y backend Uvicorn identificados correctamente.
- Origen CORS no autorizado: no recibió `Access-Control-Allow-Origin`.
- Evidencia de prueba sin cookie contra backend directo: HTTP `200`.
- Nikto: 7.982 peticiones, 0 errores, ausencia de cabeceras en el backend directo; varias cabeceras sí están configuradas en Nginx.
- Dependencias: Python sin CVE conocida; frontend con dos avisos moderados.

## Orden sugerido de corrección y verificación

1. SEC-001 y pruebas de regresión de roles.
2. SEC-002 y pruebas anónimas/profesor/estudiante sobre evidencias.
3. SEC-003 con pruebas de `429` y límites por usuario/IP.
4. SEC-004 y pruebas CSRF positivas/negativas.
5. SEC-005 con cargas por encima del límite y concurrencia controlada.
6. SEC-006, suite completa de frontend.
7. SEC-007 en Report-Only y después enforcing.
8. SEC-008 como gate obligatorio de despliegue.

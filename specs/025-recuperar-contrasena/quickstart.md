# Validación rápida

## Preparación

1. Aplicar migraciones con `alembic upgrade head`.
2. Iniciar PostgreSQL, Redis, backend, worker y frontend.
3. Ingresar como administrador y abrir “Correo y recuperación”.
4. Configurar un remitente SMTP de prueba mediante la interfaz; nunca copiar credenciales al repositorio.

## Escenarios

### Solicitud neutral

- Solicitar recuperación con un correo registrado y otro inexistente.
- Ambos deben responder 202 con el mismo mensaje y tiempo comparable.
- Solo la cuenta activa produce un registro y un trabajo de correo.

### Entrega

- Confirmar que la respuesta web aparece antes de terminar SMTP.
- El worker recibe únicamente el UUID de la solicitud.
- El correo contiene enlace HTTPS del dominio configurado.

### Consumo e invalidación

- Abrir el enlace, asignar una contraseña válida e iniciar sesión.
- Reutilizar el enlace debe fallar.
- La contraseña anterior, access token y refresh token anteriores deben fallar.
- Dos consumos concurrentes deben producir un solo éxito.

### Configuración administrativa

- Estudiante y profesor reciben 403 en `/api/admin/mail/*`.
- Admin puede guardar host/remitente y reemplazar contraseña.
- GET nunca contiene contraseña cifrada, texto claro ni últimos caracteres.
- La prueba envía solo al remitente y presenta estado comprensible.

### Accesibilidad

- Verificar solicitud, restablecimiento y configuración a 360×800 y escritorio, en claro/oscuro y con teclado.

## Pruebas dirigidas

```powershell
cd backend
python -m pytest tests/unit/test_password_recovery.py tests/integration/test_password_recovery_api.py tests/integration/test_admin_mail_config.py -q
cd ..\frontend
npm run typecheck
npm run lint:strict
npm run test:run -- PasswordRecovery AdminMail
npm run build
```
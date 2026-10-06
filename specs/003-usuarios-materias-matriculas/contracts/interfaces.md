# Contratos vigentes

| Superficie | Familias o módulos | Actores | Regla |
|---|---|---|---|
| Backend | /auth/*, /users/*, /materias/*, /matriculas/* | profesor, estudiante y administrador | Autorización según operación |
| Importación | /materias/{id}/importaciones-estudiantes/*, /materias/{id}/estudiantes-existentes/* | docente titular y administrador | Extracción sin altas; confirmación atómica; reutilización explícita |
| Acceso inicial | POST /auth/initial-password | estudiante con clave temporal | Cambia la clave, incrementa auth_version y desbloquea la cuenta |
| Frontend | Login, Mis materias, detalle e inscripción | profesor, estudiante y administrador | Acciones permitidas y estados visibles |
| Persistencia | users, materias, matriculas, importacion_estudiantes_lotes, importacion_estudiantes_filas | Servicios | Sesiones, borradores y altas transaccionales |

## Evolución 084 — docente móvil

- `POST /materias/{id}/importaciones-estudiantes/manual`: lote revisable de 1–100 nombres, sin IA, UUID/huella idempotentes, `subjects.update` y alcance de materia. Confirmación reutiliza altas/matrícula actuales; replay sin recuperar secretos.
- Claves temporales: confirmación explícita de renovación, permiso efectivo y bloqueo de usuario. Confirmar/renovar devuelve `Cache-Control: no-store`; imprimir fichas disponibles no solicita nuevas claves. Asociación a otra materia mantiene la contraseña.
- `GET/PATCH /users/me` y `/app/perfil`: solo cuenta autenticada, campos propios y respuestas privadas. Contraseña actual obligatoria ante cambio real de email/password; 422 por clave incorrecta y 409 por correo repetido sin cambios parciales. Email invalida recovery anterior; password incrementa `auth_version`, invalida recovery, limpia cookies y exige nuevo login. Admin mantiene su contrato separado.

Diseño, aceptación y evidencia: [084-docente-mobile-first](../084-docente-mobile-first/quickstart.md). Este dominio conserva la responsabilidad única de usuarios/materias/matrículas; 084 no reasigna tablas.

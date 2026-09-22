# Plan: Importar estudiantes desde una lista fotografiada

**Rama**: `codex/061-importar-estudiantes-lista` | **Fecha**: 2026-09-22 | **Spec**: [spec.md](./spec.md) | **Issue**: #121

## Resumen

Añadir un único flujo reutilizable desde estudiantes y asistencia: el docente carga una foto, un trabajo persistente especializado extrae solo candidatos de nombres y genera un borrador editable; únicamente la confirmación crea cuentas estudiantiles y matrículas en una transacción. Los alumnos reciben un correo interno único y una contraseña temporal de una sola visualización. El inicio inicial queda restringido al cambio de contraseña.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11, FastAPI 0.139, SQLAlchemy 2.0; TypeScript 5.6, React 18.
**Dependencias**: almacenamiento privado y detección MIME existentes, Pillow para orientación, transporte de IA configurable, Celery/Redis para trabajos, Argon2 para claves.
**Persistencia**: PostgreSQL; migración aditiva para lotes/filas y estado de acceso inicial del usuario. La contraseña en claro no se persiste.
**Pruebas**: pytest unitario/integración con PostgreSQL, Vitest/Testing Library, Playwright para los dos puntos de entrada y móvil.
**Plataforma objetivo**: navegador móvil/escritorio y los contenedores de producción existentes.
**Rendimiento y escala**: foto de hasta 20 MB; hasta 100 filas por lote; creación transaccional de 50 cuentas en menos de 10 segundos, aparte del reconocimiento asíncrono.

## Verificación de la constitución

- Separación de roles: solo titular/admin; el servidor valida materia y el frontend oculta la acción a otros actores.
- Integridad y trazabilidad: lote, filas, decisión y resumen auditables; ninguna cuenta se crea en extracción.
- Asincronía e idempotencia: extracción en trabajo persistente con recuperación; confirmación bloqueada e idempotente.
- Datos y secretos: archivo privado temporal; correos internos explícitos; contraseñas solo en respuesta inicial y nunca en logs/analítica.
- Accesibilidad: flujo común responsive, edición por fila, teclado, estados anunciados y controles táctiles.
- Gobernanza y pruebas: issue #121, spec aprobada, plan y tareas trazables; migración, autorización, regresión y E2E obligatorios.

## Estructura del proyecto

```text
backend/
├── alembic/versions/
├── app/modules/auth/
├── app/modules/importacion_estudiantes/
├── app/modules/jobs/
├── app/modules/materias/
├── app/modules/users/
├── app/services/
├── app/workers/
└── tests/
frontend/
├── e2e/
└── src/modules/materias/
specs/
├── 003-usuarios-materias-matriculas/
└── 061-importar-estudiantes-lista/
```

## Decisiones y complejidad

- Se crea un extractor visual especializado. El extractor de evaluaciones no se reutiliza porque valida preguntas/respuestas y su sobreescritura de prompt no se aplica actualmente.
- El correo interno usa el dominio de la aplicación y un sufijo aleatorio; es identificador de acceso, no buzón. Un correo real verificado puede sustituirlo luego.
- La coincidencia por nombre solo advierte; nunca une identidades de materias distintas.
- La reutilización entre materias se ofrece mediante selección explícita desde alumnos accesibles al mismo docente; conserva una sola identidad y crea únicamente la matrícula.
- La clave temporal se devuelve una sola vez y solo se persiste su hash. Si se pierde, se emite otra y se invalidan sesiones.
- Un reintento de confirmación devuelve el resumen previo sin crear nuevas cuentas; no puede volver a mostrar claves ya entregadas.
- La foto se elimina al cancelar o finalizar. El resultado estructurado mínimo se conserva para trazabilidad, sin la imagen original.

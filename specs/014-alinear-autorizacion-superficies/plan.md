# Plan: Alineación de autorización efectiva

**Rama**: `codex/014-alinear-autorizacion-superficies` | **Fecha**: 2026-08-14 | **Spec**: [spec.md](./spec.md) | **Issue**: #17

## Resumen

Resolver las diez diferencias de autorización sin reemplazar controles por objeto que ya funcionan. El trabajo se divide en tres frentes: demostrar con pruebas los permisos efectivos existentes; endurecer el registro analítico para validar tipo, rol, referencias y metadatos; y registrar decisiones auditadas en el inventario cuando el análisis estático no puede seguir una comprobación delegada a servicios. No cambian las URL públicas ni el esquema de datos.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11; TypeScript 5.6; React 18
**Dependencias**: FastAPI 0.139, Pydantic 2.10, SQLAlchemy 2.0 asíncrono, PostgreSQL, Axios, React Router 7 y el inventario estático de la especificación 013
**Persistencia**: tablas existentes de usuarios, matrículas, materias, materiales, presentaciones, evaluaciones, calificaciones, incidencias y eventos analíticos; sin migración
**Pruebas**: pytest 9, TestClient, pruebas de servicios asíncronos, Vitest, Playwright, inventario determinístico y gobernanza Spec Kit
**Plataforma objetivo**: API y aplicación web en Docker, escritorio y móvil; comportamiento equivalente en local y producción
**Rendimiento y escala**: las lecturas mantienen su cantidad actual de consultas; validar referencias analíticas agrega como máximo una comprobación de ámbito por evento y el registro sigue sin bloquear la interfaz

## Hallazgos de investigación

- Asistencia ya llama `ensure_can_manage_materia`, por lo que profesor ajeno y estudiante son rechazados aunque el extractor solo observe autenticación.
- El DBA combinado usa `ensure_can_read_materia`: profesor y administrador pueden leer; el estudiante solo con matrícula activa. Las mutaciones siguen siendo docentes.
- Recursos aplican propiedad docente o, para estudiantes, publicación/asignación y matrícula activa; además ocultan soluciones y saneamiento de contenido evaluable.
- Presentaciones filtran profesor propietario, administrador o estudiante matriculado cuando el contenido está publicado; crear, exportar y eliminar continúan siendo acciones docentes.
- Resolver incidencias ya exige profesor/administrador y propiedad de la evaluación. El actor incorrecto procede de una heurística frontend basada en la palabra `resolver`.
- Analítica deriva `actor_id` de la sesión, pero acepta cualquier nombre, referencia académica y metadato. Este es el endurecimiento funcional necesario.

Las decisiones completas están en [research.md](./research.md).

## Decisiones cerradas después del análisis

- El administrador conserva acceso global a asistencia, DBA, listados de recursos por materia, presentaciones e incidencias. La consulta directa de un recurso por identificador permanece limitada a recursos cuyo autor sea ese administrador; no se crea acceso administrativo global nuevo en esa superficie.
- Los endpoints heredados conservan sus códigos y cuerpos públicos salvo que un cuerpo exponga contenido, propietario o estado interno. La no revelación se comprueba sin convertir indiscriminadamente respuestas `403` en `404`.
- Solo el nuevo endurecimiento de analítica adopta el contrato explícito `401/403/404/422` descrito en [contracts/analytics-errors.md](./contracts/analytics-errors.md); una referencia inexistente y una ajena comparten el mismo `404`.
- Las tareas de regresión son deterministas: primero fijan el comportamiento aprobado mediante pruebas y cualquier trabajo adicional descubierto se incorpora posteriormente con `$speckit-converge`.

## Diseño de la solución

### 1. Contratos de autorización por objeto

- Mantener como autoridades canónicas los helpers de lectura y gestión existentes para materia, presentación, material y evaluación.
- Añadir pruebas para las diez superficies: acceso legítimo, rol incorrecto y objeto ajeno cuando corresponda.
- Comprobar explícitamente publicación y matrícula en lecturas estudiantiles de recursos y presentaciones.
- Conservar los códigos públicos heredados y asegurar que las denegaciones no incluyan contenido, propietario ni estado interno; para las referencias nuevas de analítica, usar una respuesta no reveladora idéntica ante objeto inexistente o ajeno.

### 2. Registro analítico seguro

- Definir un catálogo cerrado de eventos con roles admitidos y referencias opcionales por evento.
- Derivar actor y rol de la sesión; nunca aceptar identidad declarada por el cliente.
- Validar que evaluación y calificación, cuando se admitan, pertenezcan al ámbito del actor y sean coherentes entre sí.
- Limitar profundidad, claves, tamaño y tipos escalares de `metadata_json`; descartar identidad, rol, credenciales, respuestas y evidencia.
- Mantener la interfaz fire-and-forget: rechazar telemetría nunca bloquea ni revierte una acción académica.

### 3. Inventario verificable

- Usar overrides solo donde la autorización depende de un servicio delegado o de consumidores compartidos que el AST no puede resolver.
- Exigir actores, motivo, issue y rutas de prueba; el generador rechazará evidencia inexistente o fuera de pruebas.
- Registrar nueve decisiones backend para asistencia, DBA, recursos, presentaciones y analítica, y una decisión frontend para resolver incidencias.
- Regenerar inventario y vistas de dominio; ningún hallazgo se elimina sin prueba asociada.

### 4. Interfaz y regresión

- No se añaden menús ni pantallas.
- Los recorridos de profesor y estudiante mantienen sus estados actuales.
- Una prueba frontend fijará que resolver incidencias es docente y que la telemetría no envía identidad ni rol.

## Verificación de la constitución

### Antes del diseño

- Separación de roles: cumple; el servidor mantiene autoridad y las pruebas cubren rol y propiedad.
- Integridad y trazabilidad: cumple; la incidencia conserva actor y resolución, y analítica no modifica datos académicos.
- Asincronía e idempotencia: cumple; la telemetría sigue desacoplada y no altera la acción principal.
- Datos y secretos: cumple; se minimizan metadatos y las pruebas usan identidades ficticias.
- Accesibilidad: no cambia la interfaz; los rechazos analíticos no bloquean navegación.
- Gobernanza y pruebas: cumple; issue #17, spec aprobada, plan, contratos y pruebas.

### Después del diseño

No hay excepciones constitucionales. No existe migración, ampliación de roles, acceso productivo ni cambio destructivo. Los overrides documentan controles probados; no los sustituyen.

## Estructura del proyecto

```text
backend/app/modules/analytics/
├── router.py
└── service.py
backend/tests/unit/
├── test_analytics_events.py
├── test_authorization_contracts.py
├── test_presentaciones_router.py
└── test_student_review_request.py
frontend/src/lib/
├── analytics.ts
└── analytics.test.ts
scripts/system_inventory/
├── config.py
├── ownership.py
└── tests/
specs/system-inventory/
├── permission-overrides.json
└── current.json
specs/{004,006,008,010,011}-*/inventory.md
specs/014-alinear-autorizacion-superficies/
├── contracts/
├── data-model.md
├── plan.md
├── quickstart.md
└── research.md
```

## Estrategia de pruebas

1. Catálogo, roles, referencias y saneamiento de analítica.
2. Profesor propietario, profesor ajeno, estudiante matriculado, estudiante no matriculado, administrador y sesión ausente según cada contrato.
3. Coherencia entre evaluación y calificación referenciada.
4. Overrides sin issue, sin evidencia, con evidencia inexistente y con evidencia válida.
5. Dos regeneraciones del inventario para probar determinismo y cero diferencias incluidas.
6. TypeScript, lint estricto, frontend, backend, E2E aplicables y construcción Docker.

## Decisiones y complejidad

- Se conserva la lectura estudiantil publicada de recursos y presentaciones; retirarla rompería un contrato legítimo.
- No se implementa análisis interprocedural general. Diez overrides con evidencia son más simples, deterministas y revisables.
- No se crea una tabla de políticas: las relaciones vigentes siguen siendo la fuente de propiedad.
- El servidor responde con error para telemetría inválida; el cliente lo absorbe sin bloquear la acción educativa.
- Tablas históricas y cobertura faltante de otros dominios permanecen fuera de alcance.

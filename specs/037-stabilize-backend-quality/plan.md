# Plan: Estabilización de evidencia y calidad backend

**Rama**: `codex/037-stabilize-backend-quality` | **Fecha**: 2026-09-11 | **Spec**: [spec.md](./spec.md) | **Issue**: #76

## Resumen

Restaurar la respuesta de la ruta existente que entrega la evidencia completa, convertir el bloqueo de validación en un conflicto estable y añadir pruebas que ejerzan ambas ramas. Incorporar en CI una comprobación estática limitada a nombres indefinidos para impedir la misma clase de regresión sin introducir una limpieza masiva dentro del hotfix.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11, FastAPI, SQLAlchemy asíncrono; YAML de GitHub Actions
**Dependencias**: `FileResponse`, servicio de almacenamiento existente, Pytest, Ruff ya incluido en el entorno de desarrollo
**Persistencia**: PostgreSQL sin cambios de esquema; archivos existentes en almacenamiento privado/local
**Pruebas**: pruebas unitarias de rutas y servicio, compilación, Ruff F821/F822/F823, suite backend aplicable
**Plataforma objetivo**: backend web y CI en Linux; desarrollo compatible con Windows
**Rendimiento y escala**: no añadir consultas ni copias de archivos; respuesta transmitida por `FileResponse`; el control estático debe completar dentro del presupuesto actual de CI

## Verificación de la constitución

- Separación de roles: cumple; se conservan y prueban los permisos existentes de estudiante y docente.
- Integridad y trazabilidad: cumple; la evidencia vuelve a estar disponible para revisión humana sin alterar notas.
- Asincronía e idempotencia: no aplica; no se modifica el procesamiento de trabajos.
- Datos y secretos: cumple; no hay migración, credencial ni contenido real de estudiantes en pruebas.
- Accesibilidad: no aplica al contrato visual; se preserva la visualización en línea existente.
- Gobernanza y pruebas: cumple; issue #76 con `hotfix` y `spec-approved`, rama, artefactos, regresión, PR y CI.

## Estructura del proyecto

```text
backend/app/modules/calificaciones/router.py
backend/app/modules/evaluaciones/service.py
backend/tests/unit/test_calificaciones_revision_workspace.py
backend/tests/unit/test_evaluaciones_service.py (o prueba equivalente existente)
.github/workflows/ci.yml
specs/037-stabilize-backend-quality/
specs/README.md
```

## Decisiones y complejidad

- El `FileResponse` del documento completo vuelve a su propia ruta antes de declarar la ruta de páginas; no se cambia URL, autorización ni encabezados.
- El mensaje de estructura bloqueada se define como constante del servicio para que el contrato sea estable y comprobable.
- CI ejecutará inicialmente `ruff check --select F821,F822,F823 app tests`. No se activa Ruff completo porque mezclaría 79 ajustes no funcionales con un hotfix productivo.
- No se eliminan rutas, tablas, adaptadores ni scripts en este cambio; su retiro requiere evidencia de ausencia de consumidores y un issue independiente.

## Verificación posterior al diseño

El diseño no modifica esquemas, autoridad de notas ni contratos públicos. Las pruebas usarán archivos sintéticos temporales y dobles de base de datos; los permisos continuarán evaluándose antes de resolver rutas de almacenamiento.

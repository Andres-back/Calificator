# Plan: Inventario técnico exhaustivo

**Rama**: codex/013-inventario-tecnico-exhaustivo | **Fecha**: 2026-08-14 | **Spec**: [spec.md](./spec.md) | **Issue**: #15

## Resumen

Construir un inventario determinista derivado exclusivamente del código versionado. Un extractor
estático identificará endpoints, rutas y llamadas frontend, tablas, trabajos e integraciones; una
configuración explícita asignará cada superficie a una especificación y permitirá excepciones
temporales revisables. El resultado se versionará en JSON y Markdown por dominio, y CI rechazará
cualquier deriva. No se importará la aplicación ni se accederá a servicios o datos reales.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11 para extracción y validación; fuentes Python 3.11 y TypeScript 5
**Dependencias**: biblioteca estándar de Python; pytest 9.1.1 solo para pruebas
**Persistencia**: archivos JSON y Markdown versionados; sin cambios en PostgreSQL, Redis o uploads
**Pruebas**: pytest para extractores, esquema, determinismo, cobertura y deriva; CI Spec governance
**Plataforma objetivo**: Windows PowerShell local y Ubuntu 22.04 en GitHub Actions
**Rendimiento y escala**: inventariar el repositorio completo en menos de 10 segundos y validar en menos de 2 minutos incluyendo pruebas

## Verificación de la constitución

- Separación de roles: cumple; permisos backend y frontend se registran por separado y las discrepancias generan hallazgos.
- Integridad y trazabilidad: cumple; no se modifica calificación alguna y las superficies sensibles mantienen propietario y cobertura.
- Asincronía e idempotencia: cumple; los jobs se documentan y dos ejecuciones sobre el mismo commit producen salida equivalente.
- Datos y secretos: cumple; solo se leen rutas fuente permitidas y se excluyen configuraciones locales, uploads y datos productivos.
- Accesibilidad: no aplica a interacción de producto; la documentación generada usa tablas legibles y navegación por dominio.
- Gobernanza y pruebas: cumple; issue, spec aprobada, plan, tareas, pruebas de deriva y CI son obligatorios.

No existen violaciones constitucionales.

## Estructura del proyecto

- scripts/build_system_inventory.py: interfaz de línea de comandos.
- scripts/system_inventory/: modelo canónico, extractores, asignación, renderizado y validación.
- specs/system-inventory/ownership.json: reglas explícitas de propiedad.
- specs/system-inventory/permission-overrides.json: resoluciones revisadas de permisos ambiguos.
- specs/system-inventory/exceptions.json: excepciones temporales estrictas.
- specs/system-inventory/current.json: instantánea canónica generada.
- specs/002...012/inventory.md: vista humana generada por dominio.
- specs/013-inventario-tecnico-exhaustivo/: diseño y contratos de esta iniciativa.
- tests/spec_governance/test_system_inventory.py: pruebas unitarias y de deriva.
- .github/workflows/spec-governance.yml: ejecución obligatoria en PR y main.
- specs/README.md: enlace al inventario global y a cada vista de dominio.

## Diseño por fases

### Fase 0 - Investigación

Confirmar extracción estática, claves canónicas, formato JSON, tratamiento de permisos ambiguos,
excepciones y estrategia de determinismo. Las decisiones quedan en research.md.

### Fase 1 - Modelo y contratos

Definir Superficie, Propiedad, Evidencia, Excepción y Hallazgo; publicar el esquema de inventario,
el contrato CLI y escenarios reproducibles de aceptación.

### Fase 2 - Extracción

- Backend: decoradores de rutas, prefijos de routers, inclusiones y dependencias de autorización.
- Frontend: árbol del router, guardas, vistas y llamadas de los clientes API.
- Datos: modelos activos, tablas, relaciones, unicidad, estados y migraciones relacionadas.
- Jobs: módulos incluidos, tareas, beat schedule, reintentos y estados.
- Pruebas: archivos y referencias observables relacionadas por dominio.

### Fase 3 - Propiedad y renderizado

Aplicar reglas de ownership, conservar permisos ambiguos salvo override válido, rechazar coincidencias cero o múltiples, validar excepciones y generar
JSON global más Markdown determinista por dominio.

### Fase 4 - Gobernanza

Añadir modo --check, pruebas de deriva y paso de CI. Actualizar las doce especificaciones y el
índice sin cambiar runtime, contratos públicos o base de datos.

## Decisiones y complejidad

- Se prefiere análisis estático frente a importar FastAPI/Celery para evitar efectos secundarios y secretos.
- Se usa JSON frente a YAML para no añadir dependencias a la gobernanza mínima.
- Los permisos ambiguos requieren un override separado con superficie, actores, justificación e issue; no se infieren como seguros.
- Las escrituras usan archivos temporales y reemplazo atómico solo después de validar el conjunto completo.
- Los artefactos generados se versionan para revisión humana; campos volátiles como fecha u hora quedan prohibidos.
- Las inconsistencias detectadas se registran como issues separados y no se corrigen en esta rama.

## Verificación constitucional posterior al diseño

El modelo, contratos y quickstart mantienen todos los controles: lectura limitada a fuentes,
salida determinista, propiedad única, excepciones auditables, pruebas sin producción y CI obligatorio.
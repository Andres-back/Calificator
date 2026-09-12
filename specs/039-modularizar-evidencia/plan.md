# Plan: Modularización segura de evidencia de calificación

**Rama**: `codex/039-modularizar-evidencia` | **Fecha**: 2026-09-12 | **Spec**: [spec.md](./spec.md) | **Issue**: #80

## Resumen

Extraer del router de calificaciones las responsabilidades cohesivas de evidencia —representación segura, renderizado de páginas, rotaciones, metadatos y limpieza— a un servicio interno. El router conservará permisos, despacho HTTP, carga de archivos y encolado. Durante esta primera extracción mantendrá importaciones compatibles para que consumidores y pruebas existentes no cambien de golpe.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11, FastAPI y SQLAlchemy asíncrono
**Dependencias**: Pillow y PyMuPDF ya instalados; almacenamiento local existente; sin paquetes nuevos
**Persistencia**: sin migraciones ni cambios de esquema, metadatos o archivos persistidos
**Pruebas**: Ruff, compilación, pruebas unitarias de evidencia/reemplazo/modalidad, suites backend y gobernanza
**Plataforma objetivo**: backend web y workers actuales en Linux; desarrollo compatible con Windows
**Rendimiento y escala**: conservar el caché por huella, el máximo de 20 páginas y cero llamadas adicionales a almacenamiento, base de datos o IA

## Verificación de la constitución

- Separación de roles: cumple; las guardas y dependencias de autorización permanecen en las rutas existentes.
- Integridad y trazabilidad: cumple; no cambia ninguna entrega, nota, historial ni metadato persistido.
- Asincronía e idempotencia: cumple; el encolado y ciclo de trabajos quedan fuera del movimiento.
- Evolución de datos: cumple; no hay migraciones, retiros ni escrituras nuevas.
- Datos y secretos: cumple; las rutas internas siguen sanitizadas y no se añaden credenciales.
- Accesibilidad: no aplica; no cambia la interfaz visible.
- Proveedores de IA: cumple; visión, selección y fallback quedan intactos.
- Gobernanza y pruebas: cumple mediante issue #80, rama, aprobaciones, artefactos, regresión, PR y CI.

## Estructura del proyecto

```text
backend/app/modules/calificaciones/
├── router.py                 # conserva HTTP, permisos, carga y coordinación
└── evidence_service.py       # propietario de presentación y metadatos de evidencia

backend/tests/unit/
├── test_calificaciones_revision_workspace.py
├── test_evidence_replacement.py
└── test_mixed_evaluation_flow.py

specs/039-modularizar-evidencia/
specs/README.md
specs/system-inventory/current.json
tests/spec_governance/test_spec_baseline.py
```

## Decisiones y complejidad

- Mover únicamente `EvidencePageError`, renderizado/caché de páginas, parseo de rotaciones, metadatos de evidencia, URL segura, copia serializable y limpieza tolerante a fallos.
- Mantener en `router.py` nombres importados equivalentes durante esta fase para preservar monkeypatches y consumidores internos existentes.
- Mantener límites de carga y construcción del paquete en el router; forman parte de la recepción HTTP y no deben ampliarse dentro de esta extracción.
- No mover `_enqueue_persisted_grading`; mezcla persistencia, agregación y publicación de cola y merece una fase independiente con pruebas de idempotencia.
- No crear subrouters todavía; cambiar el registro de rutas aumentaría el riesgo sin ser necesario para obtener el primer límite modular.

## Verificación posterior al diseño

El diseño conserva los ocho principios constitucionales. El nuevo servicio es interno, no modifica contratos ni datos y reduce el router sin introducir una segunda implementación. Las pruebas compararán los mismos resultados observables y el inventario confirmará una única propiedad de cada función.

# Plan: Calidad de fotografía y claves seguras al digitalizar

**Rama**: `codex/064-calidad-imagen-claves` | **Fecha**: 2026-09-23 | **Spec**: [spec.md](./spec.md) | **Issue**: [#129](https://github.com/Andres-back/Calificator/issues/129)

## Resumen

Incorporar diagnóstico ligero de nitidez, iluminación y resolución en cliente y servidor,
preparar copias legibles sin exigir recorte manual, y separar estrictamente la respuesta
observada del estudiante de la clave propuesta. Las claves no demostrables quedarán vacías
y pendientes de revisión; la publicación existente continuará bloqueándolas.

## Contexto técnico

**Lenguajes/versiones**: Python 3.12, TypeScript 5, React 18
**Dependencias**: FastAPI, Pillow, React Query, Canvas API del navegador
**Persistencia**: PostgreSQL y almacenamiento privado existente; sin migración
**Pruebas**: pytest, Vitest, TypeScript y lint selectivo
**Plataforma objetivo**: Navegadores móviles/escritorio y workers Linux
**Rendimiento y escala**: diagnóstico cliente <3 s; análisis servidor local antes de visión; hasta 10 fotos por entrega

## Verificación de la constitución

- Separación de roles: cumple; no cambian permisos ni rutas por rol.
- Integridad y trazabilidad: cumple; una respuesta observada nunca se convierte por presencia en clave.
- Asincronía e idempotencia: cumple; se conserva el job durable y la evaluación única.
- Datos y secretos: cumple; las métricas de imagen no incluyen contenido ni credenciales.
- Accesibilidad: cumple; avisos comprensibles, no bloqueantes y controles táctiles existentes.
- Gobernanza y pruebas: cumple; issue, rama, spec, pruebas de regresión y PR obligatorios.

## Estructura del proyecto

```text
backend/app/services/image_preprocessing.py
backend/app/modules/evaluaciones/digitalize_service.py
backend/app/services/vision_service.py
backend/tests/unit/
frontend/src/components/evidence/
frontend/src/modules/evaluaciones/components/
specs/064-calidad-imagen-claves/
```

## Decisiones y complejidad

- Se usa Pillow ya instalado para evitar añadir OpenCV y aumentar la imagen Docker.
- El diagnóstico es heurístico y conservador: advierte, pero solo bloquea archivos dañados o sin información.
- No se exige detectar cuatro esquinas ni ajustar perspectiva manualmente.
- No se modifica ninguna evaluación ya persistida.

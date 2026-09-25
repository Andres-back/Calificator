# Plan: Reconocer claves literales en respuestas abiertas

**Rama**: `codex/071-respuesta-abierta-literal` | **Fecha**: 2026-09-24 | **Especificación**: [spec.md](spec.md)

## Resumen

Se extenderá la validación objetiva existente con una coincidencia normalizada y conservadora para preguntas abiertas: igualdad exacta o prefijo completo. El resultado ya alimenta el puntaje mínimo y el consenso por componente, por lo que no se crean rutas, entidades ni procesos nuevos.

## Contexto técnico

**Lenguaje**: Python 3.12

**Dependencias**: funciones puras existentes en el orquestador

**Almacenamiento**: sin cambios

**Pruebas**: pytest unitario y gobernanza Spec Kit

**Restricciones**: sin escritura retroactiva; sin publicación automática; alta precisión antes que cobertura

## Verificación constitucional

- Integridad: pasa; la clave oficial es la fuente y el docente conserva autoridad.
- Trazabilidad: pasa; la coincidencia queda en `objective_validation`.
- Datos: pasa; no hay migración ni cambio de contrato.
- Pruebas y PR: pasa; incluye regresión focal e issue de hotfix.

## Archivos

```text
backend/app/modules/calificaciones/orchestrator.py
backend/tests/unit/test_photo_grading_failures.py
specs/071-respuesta-abierta-literal/
```

## Decisión

No se usa una similitud difusa: solo igualdad o prefijo de la clave completa tras normalización. Esto resuelve respuestas como «Nico …» sin convertir menciones casuales o negadas en aciertos seguros.


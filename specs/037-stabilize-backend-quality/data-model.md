# Modelo de datos: Estabilización de evidencia y calidad backend

Este hotfix no crea ni modifica entidades persistentes.

## Entidades existentes involucradas

- **Entrega**: identifica la evidencia, su propietario estudiante y la evaluación asociada. Conserva una única referencia de archivo.
- **Evaluación**: conserva su estado y estructura actual. La regla de validación continúa permitiendo la operación únicamente en borrador.
- **Usuario**: determina autorización mediante los permisos existentes; no cambia su identidad ni rol.

## Transiciones

- No se añade ninguna transición de estado.
- Una solicitud de lectura de evidencia no modifica datos.
- Una validación bloqueada continúa sin modificar la evaluación y finaliza como conflicto.

## Migraciones

No se requiere migración de base de datos.

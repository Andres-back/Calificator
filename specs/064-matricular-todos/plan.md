# Plan de implementación: Selección “Todos” al matricular estudiantes

**Rama**: `codex/064-matricular-todos` | **Fecha**: 2026-09-23 | **Spec**: [spec.md](spec.md)

## Resumen

Extender el diálogo existente de estudiantes reutilizables con una acción de selección masiva limitada a los resultados visibles. La lógica será local al frontend y reutilizará el mismo arreglo de identificadores que ya alimenta la matrícula actual.

## Contexto técnico

**Lenguaje**: TypeScript  
**Dependencias**: React, TanStack Query y componentes UI existentes  
**Almacenamiento**: No aplica  
**Pruebas**: Vitest y Testing Library  
**Plataforma**: Web responsiva desde 360 px  
**Restricciones**: Sin cambios de API, permisos ni persistencia

## Verificación constitucional

- Roles: el control permanece dentro del flujo docente autorizado.
- Integridad: no crea matrículas hasta la confirmación existente.
- Accesibilidad: conserva selección individual y añade un objetivo táctil operable por teclado.
- Especificación y pruebas: issue, artefactos, prueba de regresión y CI obligatorios.
- Producción: entrega exclusiva mediante PR protegido.

## Estructura

```text
frontend/src/modules/materias/
├── ExistingStudentsDialog.tsx
└── ExistingStudentsDialog.test.tsx

specs/064-matricular-todos/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/mobile-selection-ui.md
├── quickstart.md
└── tasks.md
```

## Decisión de estructura

El cambio se limita al componente responsable de la selección y a una prueba dedicada. No se modifica el servicio de matrícula ni se introducen entidades nuevas.

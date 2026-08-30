# Plan de implementación: Listas y botones personalizados

**Rama**: `codex/027-listas-botones-personalizados`  
**Issue**: #55  
**Aprobación humana**: alcance y plan aprobados con “adelante”.

## Objetivo

Crear primitivas visuales reutilizables y validarlas en Recursos, conservando íntegramente rutas, permisos, consultas y mutaciones.

## Contexto técnico

- React 18, TypeScript, Tailwind, React Router y TanStack Query.
- Sin cambios de backend, base de datos, API ni dependencias.
- Pruebas con Vitest y Testing Library.

## Diseño

1. Ampliar `Button` con tamaño `xl`, icono y ancho completo para eliminar `BotonGrande`.
2. Añadir controles compartidos: `IconButton`, `ActionMenu`, `SegmentedControl` y `CollectionToolbar`.
3. Migrar Recursos a búsqueda local, filtros compartidos y jerarquía de dos acciones visibles más menú.
4. Mantener el diálogo de confirmación y las funciones existentes de descarga, duplicación y eliminación.
5. Verificar accesibilidad, vista móvil, modo oscuro, pruebas focalizadas, tipos, lint y build.

## Riesgos y mitigación

- **Acciones ocultas accidentalmente**: prueba que abre el menú y verifica sus tres opciones.
- **Regresión del asistente de evaluaciones**: conservar las props y validar su prueba existente.
- **Menú inaccesible**: roles ARIA, cierre con Escape, clic exterior y objetivos de 44 px.
- **Cambios excesivos**: migración limitada a Recursos; las demás listas quedan para incrementos posteriores.

## Constitución

Cumple separación por rol, accesibilidad móvil, pruebas obligatorias y flujo por issue/rama/PR. No toca datos, IA ni calificaciones.

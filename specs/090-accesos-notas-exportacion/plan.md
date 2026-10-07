# Plan: exportaciones de accesos y notas

**Rama**: codex/090-accesos-notas-exportacion | **Issue**: #186 | **Fecha**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

## Resumen
Solo exportaciones aprobado por el usuario. Ampliar RosterCredentials con usuarios sin claves y CSV; botón permanente en Estudiantes. Selector de evaluaciones del libro, consultas frescas de roster/evaluaciones/notas y buildFollowUpRows compartido. No nuevas APIs, migraciones, dependencias ni renovaciones masivas.

## Contexto técnico
React 18, TS 5.6, React Query 5, Vitest/Testing Library, Playwright Chromium/WebKit. Backend FastAPI existente sin cambios funcionales. CSV UTF-8 BOM, punto y coma, escape, fórmulas neutralizadas. Móvil 360 px y escritorio, claro/oscuro. Lecturas asíncronas, concurrencia acotada a tres evaluaciones, no IA.

## Constitución
Roles: subjects.update para entrega y grading.read para libro; servidor existente valida alcance. Integridad: exportar no muta ni calcula otra nota. Datos: claves nuevas solo memoria de ventana, nunca storage/caché/logs. Asincronía: carga/error visible, sin archivos parciales. Accesibilidad: Modal scrolleable, labels y controles 44 px. Gobernanza: aprobaciones humanas solo exportaciones, checklist revisado con autorización, tasks/analyze/implement/converge, CI y PR sin push main. Sin excepciones.

## Estructura y fases
Helper frontend/src/lib/csvExport.ts y tests; RosterCredentials y MateriaVistaGeneral (US2 de spec); GradebookExport y MateriaBoletin (US3), tests. Inventario y tests/spec_governance baseline.
1. CSV seguro y pruebas.
2. Entrega permanente y descarga de claves recién emitidas.
3. Selector con lectura completa fresca, estado de nota compartido.
4. Typecheck/lint/tests/build y E2E móvil sintético, inventario y PR.

## Decisiones
No recuperación de claves históricas: usuario con clave vacía y aviso; «Nueva clave» individual existente mantiene confirmación global. No nuevo endpoint de exportación para evitar duplicar cálculo/permisos. getMateriaEstudiantes/listEvaluaciones/listCalificaciones frescos antes de archivo; selección obsoleta, sesión cambiada o error bloquean descarga. CSV suficiente, no XLSX. Los cambios de usuarios y reutilización quedan diferidos explícitamente.

Hallazgo previo a implementar: listCalificaciones asigna ceros vencidos al consultar. Añadir parámetro opcional `solo_lectura=true` en esa ruta existente y opción readOnly en cliente únicamente para exportar. Valor por defecto false conserva todos los consumidores existentes. La opción no elude permisos ni validación de materia; prueba regresión: exportar no llama assign_overdue_zero_grades y la consulta habitual sí.

# Plan: exportaciones de accesos y notas

## Enmienda #190 — plan aprobado 2026-10-07

Ampliación aprobada por el usuario («adelante y cuando recien los registre por foto igual»). Además del formato de notas descrito abajo:

- Ampliar los componentes existentes `RosterAccessDelivery.tsx` y `RosterCredentials.tsx`: selección todos/algunos, elegibilidad por `email_es_interno`, acción separada «Generar nuevas claves y entregar» y confirmación con recuento, excluidos y efecto global. No recuperar claves antiguas ni persistir claves reversibles.
- Reutilizar `resetTemporaryPassword` y su endpoint autorizado actual, sin nueva API ni cambios de esquema. Ejecutar una solicitud por alumno de forma secuencial, sin reintentos automáticos ni doble envío por clic; bloquear cierre/selección mientras se renueva, comprobar sesión y permisos antes/después de cada respuesta. Resultados solo en memoria de la ventana y nunca en React Query/storage. Descargar/copiar/imprimir reutiliza ese resultado sin nuevas mutaciones.
- Refrescar lista autorizada antes de renovar y validar matrícula/elegibilidad; el backend continúa validando cada solicitud. Ante fallo detener el recorrido, preservar resultados confirmados y mostrar no intentados/inciertos. Evitar volver a renovar alumnos que ya tienen clave recibida en la ventana; otra generación necesita selección/confirmación nueva. Cuentas personales excluidas sin modificar sus claves. Al cambiar de sesión eliminar resultados y detener próximas solicitudes.
- Reutilizar `RosterCredentials` en el alta desde foto/manual y comprobar el recorrido desde respuesta de confirmación hasta CSV/impresión, con advertencia para descargar antes de cerrar. Solo las nuevas cuentas tienen clave; las reutilizadas quedan sin clave inventada.
- Ampliar pruebas de los componentes en archivos de pruebas existentes donde sea razonable; prueba focalizada del servicio/endpoint de renovación para permisos, pertenencia, cuentas internas y auth_version. E2E de lista nueva por foto sintética y entrega renovada a 360/390 px, sin operaciones reales en producción. Conservar la prueba pasiva de CSV sin mutaciones.

El usuario aprobó este plan ampliado («adelante») el 2026-10-07. Gates inicial/posterior: mutación de claves únicamente con consentimiento explícito, permisos servidor conservados, resultados efímeros y fallos visibles; no se intervienen IA, notas ni matrículas. El resto del documento refleja la entrega histórica #186/#189 cuando indique «solo exportaciones» o «sin renovación masiva».

Rama `codex/090-notas-csv-simple`, formato aprobado 2026-10-07. Este plan complementa la entrega fusionada en PR #189; no reabre usuarios cortos, reutilización ni modo de calificación.

1. En `frontend/src/modules/materias/GradebookExport.tsx`, conservar las consultas frescas, selección, sesión, permisos y `buildFollowUpRows`; reemplazar solo la matriz CSV por encabezado «Nombre del estudiante» más nombres de evaluaciones, y filas de nombre más notas. Conservar decimal coma y vacíos para pendientes. No modificar el modelo compartido ni el backend.
2. Discriminar encabezados repetidos con ordinal, evitando colisiones con otros nombres ya presentes; no modificar las evaluaciones ni agrupar alumnos por nombre. Indicar brevemente el formato y los pendientes vacíos en el diálogo existente.
3. Actualizar `GradebookExport.test.tsx` y `frontend/e2e/mock/exports.mock.spec.ts` para verificar columnas exactas, correspondencia de notas, múltiples evaluaciones, cero real, pendientes, homónimos y encabezados duplicados. Reutilizar las pruebas de CSV seguro y permisos/errores/sesión.
4. Ejecutar pruebas focalizadas, TypeScript, lint y recorrido sintético Chromium/WebKit; revisar diff y gobernanza, abrir PR enlazado #190. No fusionar ni desplegar sin CI verde y autorización correspondiente.

Sin dependencias nuevas ni migraciones; escrituras solo en la renovación de claves expresamente confirmada. Chequeo de constitución inicial y posterior: roles, integridad, privacidad, asincronía y accesibilidad conservados; formato y plan aprobados. Sin hooks de Plan (`.specify/extensions.yml` ausente). No incógnitas ni investigación externa necesaria: se reutiliza el contrato comprobado del libro y el helper CSV existente.

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

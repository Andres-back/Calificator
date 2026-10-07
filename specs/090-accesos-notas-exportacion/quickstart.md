# Validación
Datos sintéticos únicamente.
- Frontend: npm run typecheck, npm run lint:strict, Vitest focalizado csvExport/RosterCredentials/MateriaVistaGeneral/GradebookExport/MateriaBoletin/gradebookModel; npm run build.
- Estudiantes: todos/algunos, copiar/CSV/print; antigua clave vacía y cero renovaciones automáticas. Alta ficticia entrega clave nueva; cerrar/cambiar sesión retira secretos.
- Libro: una/varias/todas, alumnos ocultos por búsqueda incluidos; cero confirmado, sugerencia, processing y sin nota. Fallar lecturas o cambiar sesión en vuelo: cero descarga parcial.
- E2E sintético Chromium/WebKit a 360×800 y 390×844 y escritorio: sin overflow, selector/descarga. Validación física iPhone/Android declarada pendiente si no disponible.
- Inventario/gobernanza y PR #186 con ambas etiquetas y CI verde antes de merge; no renovaciones masivas reales.

## Evidencia local — 2026-10-07
TypeScript, lint estricto, 32 pruebas frontend en 7 archivos, 11 backend (lectura pura, compatibilidad y permisos), build y auditorías de acciones/build verdes. Dos E2E Chromium/WebKit: 360×800 claro, 390×844 oscuro y 1280×800, 30 alumnos ficticios, archivos completos con búsqueda activa y cero escrituras. No se afirma prueba física iPhone/Android ni despliegue.
Primera corrida E2E: faltaba gradebook.read en cuenta ficticia. Se corrigió solo fixture y corrida completa verde, sin eludir guardas.

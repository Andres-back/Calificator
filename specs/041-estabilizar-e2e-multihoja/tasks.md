# Tareas: Estabilización del E2E de carga multihoja

**Flujo**: hotfix abreviado aprobado en el issue #84
**Cobertura**: FR-001, FR-002, FR-003, FR-004 y FR-005.

- [x] T001 Documentar impacto, reproducción, causa y alcance del hotfix (FR-004).
- [x] T002 Esperar el contexto `estudiante=s2` y la desaparición del estado anterior antes de interactuar con el panel reemplazado (FR-001).
- [x] T003 Usar un archivo distinto y esperar explícitamente que «Enviar a calificar» esté habilitado (FR-002).
- [x] T004 Conservar las aserciones de fallo, reintento, propietarios y cola local (FR-003).
- [x] T005 Ejecutar la prueba de regresión específica de forma repetida y las verificaciones proporcionales (FR-005): 10/10 repeticiones locales acumuladas aprobadas.
- [x] T006 Validar gobernanza, inventario, diff y ausencia de cambios productivos (FR-004, FR-005): lint y diff aprobados; 536 superficies sin cambios y ningún archivo de producto modificado.
- [x] T007 Abrir el PR #85 enlazado al issue #84 y someterlo a CI; la fusión queda condicionada a todos los controles verdes (FR-005).

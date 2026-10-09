# Validación: boletín docente en mosaico

**Estado**: alcance/plan aprobados y lista personalizada revisada con autorización; implementación y pruebas locales completadas el 2026-10-08. No fusionado ni desplegado.

## Preparación y comandos

Usar la rama `codex/092-boletin-mosaico` en `E:/tesis/.worktrees/rag-preflight`, dependencias frontend instaladas. Fixture: 30 alumnos ficticios, homónimos/nombres largos, dos escalas y todos los estados del [modelo](data-model.md), cero y `4.67`. No datos o credenciales productivos.

Desde `frontend/`, después de implementar:

```powershell
npx vitest run src/modules/materias/MateriaBoletin.test.tsx src/modules/materias/gradebookModel.test.ts src/modules/materias/GradebookExport.test.tsx src/hooks/useBodyScrollLock.test.ts
npm run typecheck
npm run lint:strict
npm run build
```

Después de añadir el caso E2E al archivo existente y habilitarlo en WebKit:

```powershell
npx playwright test e2e/p2-responsive.spec.ts --grep "boletín docente en mosaico" --project=chromium --project=webkit
```

No ejecutar E2E antes de que el caso exista. Regresiones backend aplicables: `test_calificaciones_boletin_permissions.py` y pruebas actuales de `solo_lectura`. No nueva batería general local por un cambio de presentación; CI completo antes del merge.

## Recorrido verificable

1. Abrir boletín: 30 fichas, búsqueda, nombres completos; no todas las notas expandidas.
2. Buscar/filtrar/limpiar; conservar matrículas. Borradores excluidos.
3. Abrir ficha con filtro único: diálogo con todas las evaluaciones no borrador de ese alumno y materia.
4. Contrastar cero, `4.67`, escalas y publicación; sugerencia explícita, procesamiento/ausencia sin ceros ficticios.
5. Retrasar/fallar otra evaluación: mosaico disponible, diálogo con carga/error; reintento recupera sin escrituras.
6. Cerrar por botón/Escape: búsqueda/filtros/scroll intactos y foco en ficha. Con datos cargados, reapertura en menos de un segundo, sin llamadas por alumno.
7. Ver explicación: detalle correcto y retorno filtrado. Exportar: mismo formato de 090 para una/varias evaluaciones.
8. Cambiar usuario/materia/permiso/padrón: no mostrar selección privada anterior. Sin `grading.read`, no consultas docentes ni notas fabricadas.
9. Vista estudiante intacta, sin mosaico/exportación/consultas docentes.

## Matriz visual

Chromium/WebKit en 360, 390, 768 y 1280 píxeles, claro/oscuro. Nombres largos y suficientes evaluaciones para exigir scroll; último resultado y cierre alcanzables, controles táctiles de 44 píxeles, sin desbordamiento horizontal. Tabulación confinada/retorno de foco. Validar scroll de documento móvil y `main` escritorio.

Registrar evidencia una vez al cierre; repetir solo casos afectados por correcciones. Actualizar tareas después de ejecutar, no antes. Converge y PR enlazado al #194, CI verde y autorización separada para fusión/producción.

## Evidencia ejecutada — 2026-10-08

- Vitest: 31/31 en `MateriaBoletin`, `gradebookModel` y `GradebookExport`; 5/5 en `useBodyScrollLock`. Después del ajuste de foco Safari, 16/16 del boletín repetidos y verdes. Las dos pruebas de solo lectura/permisos fallaron antes de implementar y pasaron después.
- Backend: `C:/Python313/python.exe -m pytest tests/unit/test_calificaciones_boletin_permissions.py -q`, 7/7; lectura sin reconciliación de ceros y rechazo por propiedad/permisos. Advertencia existente de `dateutil` sobre fecha UTC.
- `npm run typecheck`, `npm run lint:strict` y `npm run build`: correctos. Advertencias existentes de tamaño de bundle y tiempos de plugins Vite; sin nuevas dependencias.
- Matriz Playwright: 16/16, Chromium/WebKit × 360/390/768/1280 × claro/oscuro; 30 alumnos ficticios y 12 evaluaciones. Valida cero real, `4.67`, escala 10, sugerencia, procesamiento y ausencia; diálogo completo pese al filtro, último resultado/cierre accesibles, Tab/Escape/foco, scroll y filtros conservados, exportación sin diálogos apilados, sin escrituras académicas ni errores de página.
- Apertura cacheada: inserción de resultados medida dentro del navegador desde el evento de selección, 13–40 ms en los 16 casos; no se confunde con latencia de API/LLM ni con tiempo del controlador de pruebas. Ninguna lectura adicional por abrir la ficha. Informe local ignorado: `output/playwright/boletin-092/results.json`.
- Revisión visual de capturas locales de mosaico móvil oscuro y diálogo WebKit claro; nombres completos, estados, notas y cierre legibles. Capturas sintéticas ignoradas en `output/playwright/boletin-092/`.
- Correcciones de validación: esperar animaciones del diálogo en tests unitarios, medir rendimiento desde el evento real y no desde el controlador; restaurar foco en Safari enfocando la ficha al tocarla. No se modificó el Modal compartido. La telemetría de navegación existente no se considera escritura académica.
- Inventario regenerado con `scripts/build_system_inventory.py --write`: 573 superficies conservadas; únicamente cambia el digest del código fuente. Sin nuevas rutas/endpoints/tablas.
- `StudentGradebook`, `gradebookModel`, `GradebookExport`, criterios y servicios backend conservados. Se retiraron presentaciones docentes antiguas y sus helpers sin consumidores; no se alteraron registros ni fórmulas.

Fusión, CI remoto completo y verificación productiva no se declaran terminados en esta evidencia local.

Entrega: [PR #195](https://github.com/Andres-back/Calificator/pull/195), enlazado a #194, etiquetas `spec-approved` y `plan-approved`, adjunto al chat. CI remoto pendiente; no fusionado ni desplegado.

## Converge

Revisión inicial limpia sobre funcionalidad: 10 requisitos funcionales, 6 criterios de éxito, 12 escenarios de aceptación, 9 casos límite, 7 decisiones técnicas y 8 principios constitucionales contrastados con código/evidencia local. La entrega del PR es administrativa, no una capacidad ausente.

CI del PR detectó un hallazgo administrativo `partial`: `test_baseline_contains_all_active_specs` no incluía la nueva 092. Converge añadió T015 (Constitución VII/VIII). Se añadió únicamente el nombre a `ALL_SPECS` en `tests/spec_governance/test_spec_baseline.py`, sin relajar comprobaciones; prueba específica 1/1 y batería completa `C:/Python313/python.exe -m pytest tests/spec_governance -q` 41/41. Revisión final de T015 y su evidencia sin tareas pendientes ni hallazgos accionables. La corrección no requiere reconstrucción del frontend porque no modifica código funcional.

## Cierre autorizado y corrección de CI

El usuario autorizó continuar con «adelante» el 2026-10-08. Fusión y verificación productiva condicionadas a todos los controles verdes. Producción comprobada por SSH en lectura antes de fusionar: commit `3803df8c25fb9cfaf1bb144fc886985093465e96`, backend/web/worker saludables; no se modificaron servicios ni datos.

CI del HEAD `9ac3a06` pasó backend, contenedores y gobernanza; frontend tuvo 571/572 pruebas correctas. Falló la comprobación inmediata de visibilidad de «Imprimir seleccionados» en `MateriaVistaGeneral.test.tsx`, durante la animación del diálogo. Converge añadió T016; Implement sustituyó esa comprobación por `waitFor` de visibilidad, manteniendo las aserciones de consentimiento, cancelación y renovación única. Regresiones focalizadas de vista general y boletín: 22/22. Sin código funcional ni contratos cambiados; CI completo del nuevo HEAD sigue siendo obligatorio antes del merge.

Tras la corrección, gobernanza local completa 41/41 y digest del inventario regenerado (573 superficies). Converge de T016: aserción de visibilidad eventual, consentimiento, cancelación y llamada única conservados; sin nuevos hallazgos funcionales ni tareas pendientes. Hooks ausentes; listas de requisitos 16/16 y UX 8/8 intactas.

CI del HEAD `069c8d9` pasó backend, contenedores, gobernanza, unitarias frontend, build y E2E. Las regresiones contextuales reportaron seis fallos: el recorrido anterior aún buscaba «Notas de Multiplicación» y un enlace directo a la nota en la lista sustituida; los fixtures tampoco contemplaban el parámetro `solo_lectura=true`. Converge añadió T017. Se actualizaron únicamente esas pruebas/fixtures al recorrido mosaico → previsualización completa → explicación, conservando los 30 alumnos, búsqueda, cero real, estado «Calificando», compactación (dos/cuatro columnas y cuatro fichas en 500 px), retorno de filtros y todo el recorrido de asistencia. `npm run test:mock -- grading-review.mock.spec.ts`: 14/14, incluidos 360/390/1366 píxeles claro/oscuro. Los 500/503 de recuperación son errores sintéticos esperados. Sin modificaciones de código funcional ni producción.

Converge de T017: sin casos omitidos, checks de datos/estados conservados, dos evaluaciones no borrador en la previsualización aun con filtro único y explicación navegable; digest regenerado con las mismas 573 superficies. El nuevo CI completo debe aprobar antes de fusionar y desplegar.

# Guía de validación

## Condiciones

Implementación posterior a aprobación consolidada de la ampliación, revisión autorizada del checklist y actualización de tareas/análisis. Dependencias del frontend instaladas según lockfile. Datos sintéticos; sin claves ni conexión a producción. No se requiere Docker para las pruebas con API simulada. Los escenarios definen la aceptación; los resultados ejecutados se registran al final.

## Comprobaciones locales

Desde `frontend/`:

```powershell
npm run typecheck
npm run lint
npm run test:run -- src/modules/materias/attendanceModel.test.ts src/modules/materias/gradebookModel.test.ts src/config/studentNavigation.test.ts
npm run test:mock -- grading-review.mock.spec.ts
```

Agregar a la ejecución focal las pruebas de componente o escenarios ampliados por las tareas; no asumir que los archivos actuales ya prueban controles todavía no implementados.

## Escenarios

1. Asistencia con 100 alumnos: marcar y anotar dos; buscar por fragmento de nombre con/sin tildes y por correo; limpiar. Verificar menos de un segundo para coincidencias, numeración original y conservación de marcas. Buscar cero resultados y recuperar el grupo.
2. Mantener pendientes ocultos: guardar sigue deshabilitado. Marcar pendientes presentes actúa sobre todo el grupo y lo indica; guardar envía todos los IDs y observaciones. Cambiar búsqueda no debe producir ninguna escritura.
3. Libro con dos evaluaciones publicadas/cerradas y un borrador: seleccionar una. Ver lista compacta de todos los matriculados con sus notas/estados y enlaces, incluidos alumnos sin nota. No incluir borrador ni notas de la otra evaluación. Combinar búsqueda y «Por decidir»; regresar a «Todas» y recuperar seguimiento original. Con 30 alumnos verificar 30 filas y al menos cinco filas de nombres cortos en 500 px de alto a 390 px de ancho.
4. Repetir con cero real, procesamiento y sugerencia pendiente. Retirar la evaluación del listado simulado y comprobar retorno a todas con aviso.
5. Lateral docente: no aparece el acceso redundante. Abrir Materias > Evaluaciones > Calificar y un enlace anterior. Rol personalizado con `grading.read` sin `evaluations.read` conserva acceso; estudiante conserva «Mis resultados»; admin conserva sus secciones.
6. 360×800, 390×844 y 1366×768, claro/oscuro: medir ausencia de desbordamiento y controles de 44 px; escribir, limpiar, cambiar selección, abrir menú móvil y desplazar hasta guardar sin contenido tapado.
7. Desde una evaluación abrir «Notas y entregas», pulsar una nota y comprobar cuatro secciones numeradas en el orden acordado, con solo nota/explicación abiertas. Consultar evidencia, respuestas y retroalimentación con una acción cada una, regresar y conservar filtros. Revisar respuestas cortas sin grandes bloques vacíos.
8. Con datos sintéticos: respaldo de suma por pregunta, ajuste global con motivo y registro antiguo sin explicación. Verificar valores/ausencias sin nuevas inferencias ni escrituras. Abrir enlaces a pregunta/hoja y una alerta: sección adecuada abierta; no quedan bloqueos ocultos. Ajustar puntaje, conservar cambios sin guardar y comprobar confirmación/publicación, historial, PQRS y evidencia multihoja mediante pruebas de regresión existentes.
9. Creador desde A: contexto fijo sin grado/área/materia solicitados; opciones complementarias plegadas con resumen y errores recuperables; rúbrica/escala/pesos y revisión siguen accesibles. Guardar un borrador A, abrir B y comprobar que no se restaura ni sobrescribe A; volver a A y recuperarlo. Repetir con el formato anterior de borrador y con edición de evaluación existente. Entrada general conserva selección autorizada.

Capturas y trazas en directorios de salida ignorados; no versionar datos ni imágenes escolares. Ejecutar CI obligatorio aplicable antes de fusión, sin push directo a main. Fusión/despliegue requieren autorización separada.

## Validación local del 2026-09-30

- Checklist de requisitos: 16/16; checklist UX: 17/17. Revisión humana autorizada y análisis consistente antes de código.
- Pruebas focales: 56 aprobadas en ocho archivos (asistencia, seguimiento, libro, navegación, acceso desde evaluaciones, explicación/acciones, modelo y componente del creador).
- Playwright: **10/10 aprobadas**, 1.2 minutos. Los seis recorridos 360×800, 390×844 y 1366×768, claro/oscuro, comprueban ausencia de desbordamiento, controles de 44 px, expansión explícita, comparación breve, retorno con filtros y desplazamiento hasta guardar.
- Asistencia: búsqueda sobre 100 alumnos, pendientes ocultos, marcas/observaciones conservadas y guardado simulado con exactamente 100 registros. Buscar/consultar no escribe; el PUT se produce solo tras pulsar «Guardar asistencia».
- Libro: 30 filas, cinco filas en menos de 500 px, cero real separado de procesamiento, sugerencias rotuladas y selección de evaluación restaurada al volver. La prueba unitaria también verifica desaparición de evaluación y consultas por ID.
- Resultado: nota/fórmula registradas; ajuste global y motivo separados; histórico sin explicación informado. Enlaces a pregunta/hoja abren la sección correcta. El ajuste 0.7 se conserva al abrir evidencia y salir activa la guarda; seguir editando conserva el borrador.
- Creador: contexto fijo sin seleccionar materia/grado/área; entrada general con selección; opciones complementarias accesibles. Modelo A→B→A y formato anterior recuperables sin sobrescritura ajena. Rúbrica editable, preguntas, revisión y payload existentes pasan sus regresiones.
- `GradeBreakdown` ya tenía comparación compacta de altura natural y editor por pregunta: se reutiliza sin cambiar su cálculo ni guardado. `EvaluacionesPage` y `DigitalizarEvaluacionModal` conservan entradas/contexto y contratos; no se añadieron controles de grado/área.
- Auditoría de acciones: 397 botones y 116 enlaces; auditoría de build público dentro del presupuesto. Inventario canónico regenerado, 565 superficies sin reasignación de dueños.
- Capturas locales: `output/playwright/teacher-flow/`, datos sintéticos. Inspección visual móvil clara y escritorio oscuro, además de medidas en las seis combinaciones.
- La nueva regresión de navegador se incorpora a CI. Sin modificaciones de backend, APIs, permisos, tablas, IA o calificaciones persistidas. No se ha fusionado ni desplegado a producción.

Las ejecuciones amplias simultáneas produjeron timeouts locales de rúbrica/Xali; sus regresiones focales pasaron. La comprobación completa final serial (`npx vitest run --maxWorkers=1`) terminó con **439/439 pruebas y 84/84 archivos aprobados** (330.19 s), sin aumentar los tiempos límite de las pruebas. TypeScript, lint estricto y compilación final aprobados; permanece el aviso previo de un chunk superior a 500 kB, sin error de construcción. CI remoto y producción no se declaran verificados con estos resultados locales.

Gobernanza e inventario: **41/41 pruebas aprobadas** tras el cierre de tareas y la normalización de referencias FR explícitas; `build_system_inventory.py --check` confirma 565 superficies vigentes. Convergencia sin brechas de implementación: 19 FR, 10 SC, 29 escenarios de aceptación, 14 decisiones y ocho principios constitucionales comprobados; no se añadió una fase vacía. Se prepara el PR de `codex/078-asistencia-libro-notas` contra `main`, enlazado a #163 y a la aprobación registrada. No se autoriza fusión/despliegue mediante el cierre de tareas; CI sigue siendo obligatorio antes de fusionar.

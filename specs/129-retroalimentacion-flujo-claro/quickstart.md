# Validación prevista 129

Spec/plan y revisión aprobados el 2026-10-26. Implementación y validación local completadas; no se comprobó ni modificó producción. Usar únicamente datos/archivos sintéticos y enlaces example.test.

## Diagnóstico ya ejecutado

Base d871fbe, 2026-10-26:

`npm run test:run -- src/modules/feedback_sharing/ShareFeedbackDialog.test.tsx src/modules/feedback_sharing/FeedbackWorkspace.test.tsx src/modules/feedback_sharing/FeedbackLinkActions.test.tsx src/modules/feedback_sharing/FeedbackToolsButton.test.tsx`

4 archivos, 23/23 aprobadas. Comprueban contratos vigentes con mocks; no acreditan que el recorrido nuevo esté construido. Inspección confirma separación vertical de controles y listas en ShareFeedbackDialog y pie global en revisión de calificación. Investigación de emisión/copia/ciclo completa sin red, datos reales o modificaciones académicas.

## Antes de implementar

1. Aprobación humana de spec/plan y permiso para revisar la lista de calidad contra su alcance. Checklist documental 16/16 revisado por Specify; checklist específico de calidad, Tasks y Analyze se harán después, antes de código.
2. Verificar ignorados Git/Docker/lint, permisos y estado del worktree. No añadir output, credenciales, URLs privadas ni datos de profesores/estudiantes.
3. Generar tareas trazables FR-001–016 y SC-001–005 y analizar consistencia; cualquier ampliación backend no prevista se presenta antes de ejecutarla.

## Muestra de aceptación

- Grupo de 40 estudiantes, nombres largos/homónimos, notas cero y distintas, mensajes extensos. Pendientes/sin nota/listos; activos recuperables, antiguos no recuperables, vencidos, suspendidos y varios enlaces por alumno. Una muestra de 105 comprueba cursores y particiones de 100 sin mezclar lote académico de 25.
- Seleccionar desde inicio/mitad/final y comprobar botones dentro de viewport, última fila visible y contador exacto. Buscar sin perder seleccionados ocultos y confirmar alcance visible de selección masiva.
- Compartir con solo activos: cero emisión/publicación/renovación, misma vigencia/estado/cuota. Mixto: leer/reutilizar activos, crear únicamente faltantes autorizados y no tratar cerrado como inexistente.
- Resultado en el mismo panel: exactamente los IDs/destinatarios confirmados; copiar uno/varios, clipboard denegado y texto manual completo, sin éxito falso. Evitar URL privada en trazas/logs/almacenamiento.
- Fallos parciales/red/doble clic, respuesta ausente o duplicada y reintento de la misma identidad, recarga con manifiesto y caducidad. No cambiar UUID para resolver incertidumbre ni crear de nuevo por abrir el panel.
- Edición sucia, aprobar/publicar separado, conservar ajustes/evidencia, abrir respuestas y volver, impresión/motivos y retorno sin perder selección/contexto. No modificar diseño de fichas o chat público.
- Renovación del mismo usuario conserva operación; logout/cambio de actor/evaluación o permiso revocado invalida estados y respuestas tardías. Rutas docentes continúan denegadas a alumnos/terceros.

## Comandos posteriores a implementación

Desde frontend: `npm run typecheck`, `npm run lint:strict`, `npm run test:run`, `npm run build`, `npm run audit:actions`, `npm run audit:build`.

Playwright: registrar el nuevo archivo feedback-workspace-responsive.spec.ts para Chromium y WebKit en la configuración real. Ejecutar 360/390/768/1440 y claro/oscuro con viewport reducido, texto ampliado, foco/teclado y capturas sintéticas; no omitir por grep ni reemplazar suites actuales. El test debe comprobar acciones visibles tras scroll, no solo ausencia de overflow.

Backend aplicable sin cambios de producto: regresiones test_feedback_link_copy.py, test_feedback_sharing_authorization.py, test_feedback_sharing_routes.py, test_feedback_sharing_lifecycle.py y test_feedback_sharing_quota.py en su base sintética prevista. No apuntarlas a producción ni inventar una fixture que use DATABASE_URL real por defecto.

Final: inventario `scripts/build_system_inventory.py --write/--check`, gobernanza completa, Converge y tareas comprobadas; PR con aprobaciones y CI antes de cualquier fusión. La prueba física móvil y la verificación con demo productiva requieren su alcance autorizado y se informan por separado.

## Estado

Issue #272, rama129 y tareas registrados. Aprobación humana «Aprueb» del 2026-10-26 incluye revisión de calidad y continuidad; etiquetas spec-approved/plan-approved registradas. El PR/CI remoto se reporta en su asociación al issue; esta evidencia local no acredita fusión ni despliegue.

## Revisión previa a código

Checklist documental 16/16 y UX/entrega 8/8 revisados con autorización. Hooks ausentes; ignorados Git/Docker/ESLint cubren dependencias, build, temporales y datos sensibles. Tasks: 17, con tres historias independientes, ejecución secuencial en archivos compartidos.

Analyze de solo lectura: 16 FR, 5 SC y 12 escenarios; cobertura 100 %, cero requisitos sin tareas, cero tareas sin razón normativa, cero ambigüedades/duplicaciones bloqueantes y cero conflictos constitucionales. Mapa: FR001–003 T008/009; FR004 T007/011; FR005–008 T003–007; FR009 T007–009; FR010 T005/006/009; FR011 T003/004/006/010; FR012 T003–006; FR013/014 T011/012/014; FR015 T007/008/012/014; FR016 T007/013–015. SC001 T007/011/012/014; SC002 T005–009/014; SC003 T003–006/015; SC004 T011–014; SC005 T003–006/010/014/015. No se modificaron archivos durante Analyze; este registro se añadió después.

## Evidencia de implementación en curso

- RED: primero faltaban los dos módulos nuevos; se reprodujo import no resuelto fuera del bloqueo de temporales Windows. Después: nueve pruebas nuevas aprobadas; ampliadas a recuperación, copia individual/homónimos y respuestas tardías. El módulo completo pasó 89 casos antes de las últimas regresiones de sesión.
- General frontend: 158 archivos/987 pruebas aprobadas en la primera repetición (113.85 s), con ruido AggregateError ya existente en jsdom; no se trató como fallo ni se omitieron casos. Se repetirá tras los últimos ajustes.
- TypeScript/lint iniciales detectaron una guarda nullable y una opción de test inválida; corregidas. Primer build y auditorías de acciones/recursos aprobados; repetición final pendiente.
- Backend: 40/40 regresiones existentes aprobadas (20.46 s) sobre copia/ACL/rutas/ciclo/cuota en PostgreSQL local exclusivo spec107, sin notas reales. El primer contenedor temporal no incluía pgvector y falló al migrar; se retiró solo ese contenedor sintético y se recreó con pgvector/pgvector:pg16. Migraciones completas y suite posterior aprobadas; no se modificó backend para eludirlas.
- Navegador inicial detectó tolerancia de IntersectionObserver 0.9999995 pese a control completo; se usa 0.999, sin omitir visibilidad. Copia múltiple quedó ordenada por nombre/identidad de forma determinista. Repeticiones durante HMR no cuentan como cierre; ejecución final congelada en curso.
- Se retiró IndividualLinks sin consumidores productivos; su cobertura de copia individual sin agrupar apellidos pasó al panel común. Los archivos previos permanecen recuperables por Git. No se retiraron contratos ni reglas de servidor.

## Cierre local

- TypeScript y lint estricto aprobados. Repetición completa con dos workers: **158 archivos/996 pruebas aprobadas** (81.45 s). Una repetición concurrente anterior había producido tres fallos de temporización/visibilidad en módulos sin cambios (PresentacionForm/GenerationWizard); sus 35 casos pasaron aislados y la suite completa posterior quedó verde sin modificar esos archivos ni ampliar sus límites.
- Build definitivo y auditorías de acciones/recursos aprobados: 601 botones, 122 enlaces y presupuesto público vigente. Sin dependencias, modelos ni proveedores nuevos.
- Módulo de retroalimentaciones: 20 archivos/96 casos aprobados, incluidos estados individuales parciales, almacenamiento bloqueado sin escritura, roles separados, nombres de la solicitud recuperada, copia manual y cambio de cuenta.
- Regresión de navegador previa al último ajuste de foco: **94/94** aprobadas (11.4 min), incluidos revisión individual/grupal, autorización pendiente, publicación 30 en tandas de 25, biblioteca/motivos, 30 fichas completas, PDF A4/Letter y devolución pública en ambos temas/anchuras. No se retiraron aserciones de contenido o privacidad.
- El flujo129 pasó primero 22/22. Añadir una aserción explícita de foco detectó que Safari táctil no enfoca botones al pulsarlos; se guarda el currentTarget real y el contenedor, no solo activeElement. La regresión específica WebKit360 pasó (1/1, 23 s). Repetición final: **28/28 aprobadas (5.3 min)** en Chromium/WebKit, incluidos estos focos, texto150/200 %, 40/105 estudiantes y tres casos126 por motor. No se quitaron aserciones ni se afirmó éxito con controles omitidos.
- Inventario regenerado y vigente: 661 superficies; propietarios 008/107/120/122/126 actualizados y129 añadido a la línea base, sin alterar propietarios backend.
- Base temporal retirada al terminar las cuarenta pruebas. No se consultaron estudiantes, notas, evidencias, claves o APIs IA reales. No hay despliegue ni prueba física de iPhone/Android en esta validación.
- Primera Converge: una brecha media de cobertura, no de aplicación: inicio/mitad/final no estaban juntos explícitamente en la muestra40. Se añadió T018 sin reescribir tareas previas; Implement añadió el caso y ambos motores pasaron **2/2 (21 s)**. La cobertura de navegador reúne 94 regresiones existentes y 24 casos129; la repetición final28 incluye seis casos126 ya contados, por lo que no se suman como pruebas distintas otra vez.
- Segunda Converge, solo lectura: 16 FR, 5 SC, 12 escenarios, 10 decisiones y 8 principios revisados; cero brechas missing/partial/contradicts/unrequested y cero hallazgos por severidad. tasks.md se mantuvo idéntico durante esa evaluación (SHA256 antes/después: 6E9B7CA243EF9250EF04A4A9229ED91410A94EB31A42008D66663D69220A609D). No añadió una fase vacía; la marca final de T017 se cerró después en Implement. **18/18 tareas completadas**, sin hooks de extensión.
- Particiones reales de CI verificadas con verify-e2e-shards: 536 casos, distribuidos 137/143/129/127, cero faltantes y duplicados. CI ejecuta todos los proyectos en la suite general, incluido webkit-feedback-workspace; no se depende de los greps heredados que omitían129.
- Gobernanza: **61/61 aprobadas (16.83 s)** y contrato del conjunto staged aprobado con issue272 y etiquetas autorizadas. El primer intento dentro del sandbox Windows no pudo crear temporales/iniciar Bash; se repitió fuera de esa restricción sin modificar ni excluir controles. Inventario661 vigente, diff sin errores de espacios y18 tareas completas.

## Regresión de CI posterior — PR #275

La tarea T029 de Spec130 registra la corrección autorizada de `feedback-workspace-responsive.spec.ts`, detectada en CI40437931033. Comprobar el mismo estudiante visible, en vez de solo una coordenada antigua, reprodujo una pérdida real de contexto en cuatro casos móviles WebKit. Se corrige la restauración del listado por ID y desplazamiento relativo del estudiante visible cuando cambian alturas o aparecen acciones de enlace, conservando selección completa y foco restaurado. La comprobación no fuerza un desplazamiento para aprobar y verifica por separado que no se vuelve al inicio. Se mantienen privacidad, copia manual, destinatarios, límites, controles de emisión y todas las variantes de navegador/tema/anchura. Se cumplen los requisitos existentes sin modificar tareas históricas ni producción. Implementación, pruebas RED y resultados en `specs/130-digitalizacion-secciones/quickstart.md`.

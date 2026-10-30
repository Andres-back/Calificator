# Validación prevista de la corrección

Estado2026-10-30: implementación local y correcciones de CI verificadas; PR293 abierto, pendiente de CI actualizado. No se acredita producción ni teléfono físico.

## Antes de código

1. Aprobar spec y plan; registrar issue/etiquetas correspondientes y vincular la especificación a los dominios131/134/135 sin reescribir su historia.
2. Generar Tasks y ejecutar Analyze; verificar checklists como calidad documental, no aprobación de código. No solicitar de nuevo una aprobación de calidad idéntica si ya se revisó y está completa.
3. Escribir regresiones que reproduzcan la altura excesiva y el bloqueo de scroll desde el texto antes de corregirlos.

## Matriz funcional

-360/384/390/412/768/1440px, claro/oscuro, horizontal, texto normal/150%/200%; nombres y mensajes largos.
-8/17/30 preguntas, prioridades mixtas, números repetidos de secciones, nota sugerida/confirmada/publicada y sin desglose/coordenadas.
- Lectura integrada individual, centro del grupo modal, compartir, editar, impresión, historial y regreso a evidencia.
- Navegación anterior/siguiente en extremos, selección directa y borrador de puntaje/mensaje sin guardar; cero escrituras no solicitadas y sin IA.

## Pruebas de desplazamiento

Medir el tamaño/recorrido de cada ancestro, hacer entrada nativa desde el centro y ambos márgenes del texto y comprobar el desplazamiento real en ambas direcciones. No dar por probado un gesto por asignar `scrollTop` o por no detectar overflow horizontal. En modal comprobar que se mueve su contenido y no el documento de fondo. Repetir cerca del final, en mensajes cortos/largos y al abrir/cerrar teclado.

La comprobación física Android se pedirá después de disponer del arreglo verificable. Emulación y wheel no se etiquetan como éxito táctil nativo en S23 Ultra. iPhone físico solo si está disponible y se comprueba; WebKit emulado se informa por separado.

## Cierre antes de PR

Ejecutar unidades, tipos/lint/build/auditorías, regresiones de navegador aplicables y gobernanza/inventario, conservando resultados fallidos y sus causas. No subir fotos reales o archivos privados. Converge contra los requisitos, PR con CI verde y autorización separada de fusión; no desplegar manualmente en esta fase.

## Resultados locales2026-10-30

- RED inicial:5 fallos esperados en dos suites (grid/navegación y contención integrada);31 pruebas previas pasaron. Se corrigió únicamente la presentación y protección del borrador al seleccionar.
- Unidades completas:188 archivos/1219 pruebas verdes; después se añadieron dos regresiones de layout de edición/impresión, verificadas en su suite de23 pruebas. Lint estricto y TypeScript verdes.
- Build Vite correcto; aviso existente de chunks grandes, sin ocultarlo ni subir límites. No se añadieron dependencias.
- E2E del incremento:17 Chromium +17 WebKit verdes; después4 comprobaciones de scroll del modal (dos tamaños/dos motores), todas verdes. Ocho regresiones Chromium de129/126/131 verdes (grupo, foco/texto ampliado y evidencia).
- Las ocho preguntas ocupan dos filas y≤112px desde360hasta412px. Se probaron17/30 componentes,150%/200%, orientación horizontal, seis anchos y dos temas. Se conserva descripción accesible de puntaje/estado y selección por identidad; números repetidos incluyen posición accesible.
- La entrada nativa wheel desde centro/izquierda/derecha mueve el dueño de scroll; el grupo mueve solo su panel y no el fondo. Cambiar pregunta con puntaje sin guardar conserva el borrador; cambiar pestaña con mensaje sin guardar no lo descarta. Cero escrituras académicas no solicitadas en estos recorridos, cero IA.
- No se convierte wheel/WebKit emulado en una afirmación de swipe probado en el S23 Ultra o Safari físico. Esa validación se comunica al usuario tras la entrega verificable.
- Gobernanza:24 pruebas verdes al ejecutar con temporales preparados y permisos normales del host. Los intentos iniciales se bloquearon por permisos del sandbox/Bash y por faltar el padre del temporal; no fueron fallos del producto ni se quitaron comprobaciones. Inventario actualizado mecánicamente con referencias de la nueva evidencia E2E (670 superficies, sin nuevas rutas/backend).
- Auditorías:647 botones/122 enlaces con propósito verificable; build público y recursos dentro del presupuesto. La primera ejecución del auditor de acciones usó un directorio incorrecto; se repitió desde frontend y pasó.
- Converge: requisitos12, decisiones4 y principios8 comprobados, sin trabajo funcional pendiente. La tarea final se expresa como preparación de PR; su publicación ocurre después del commit con gobernanza, no antes. Fusión y despliegue no autorizados en esta entrega.

El cambio de reparto de puntos aprobado posteriormente pertenece al issue292/spec137; no forma parte de este incremento frontend ni autoriza modificar notas al probarlo.

CI inicial: backend, frontend quality/build y contenedores verdes; gobernanza encontró que faltaba registrar136 en el catálogo explícito de especificaciones activas. Se añadió solo la entrada nueva, conservando todas las aserciones y controles. Se repite la suite completa de gobernanza antes de actualizar el PR.

Resultado de la corrección del registro:61/61 pruebas de gobernanza completas verdes. Se publica una actualización del PR293; no se reintenta el mismo fallo documental ni se altera el workflow.

Convergencia de CI: se retiró una guarda de toast redundante que impedía abrir el diálogo global existente «Cambios sin guardar». La selección y anterior/siguiente vuelven a usar ese bloqueo, conservando el borrador. Se protege además el foco frente al frame diferido de entrada de sección cuando el docente ya enfocó otro control. Dos pruebas unitarias nuevas y las once de integración móvil pasaron; lint/tipos/build verdes. Quince recorridos focalizados (tres repeticiones, Chromium/WebKit) de borrador y creación/copia con teclado pasaron. La navegación interna WebKit a evidencia que había fallado en CI también pasó al repetir el caso exacto, sin subir tiempos ni omitir aserciones. Esto no certifica que el problema transitorio del motor no pueda repetirse; el CI se ejecutará de nuevo con los controles intactos.

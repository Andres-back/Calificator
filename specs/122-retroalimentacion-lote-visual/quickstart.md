# Guía de validación

**Estado**: implementación y validación local sintética en cierre el 2026-10-24; CI y revisión de PR pendientes. No se han aceptado/publicado notas reales ni cambiado producción durante estas pruebas.

## Preparación

1. Tras aprobación humana, completar tareas/análisis antes de código. Crear una base PostgreSQL aislada sin volúmenes ni credenciales de producción y aplicar migración desde `202610230002`.
2. Fixture de treinta estudiantes: propuestas, cero, ajustes previos, confirmadas, publicadas, procesamiento, falta de mensaje y fuente obsoleta. Dos docentes, un estudiante y un administrador con permisos diferenciados.
3. Fixtures de enlaces nuevos recuperables y enlaces heredados hash-only; vigentes, vencidos, suspendidos y desactivados. No incluir tokens reales en reportes, capturas o logs.

## Lote académico

- Seleccionar todo el grupo, abrir resumen y cancelar: cero cambios.
- Aceptar/publicar con confirmación global: los disponibles quedan publicados y con devolución autorizada sobre fuente final; ajustes conservados y publicadas sin reconfirmar.
- Un alumno inválido o una excepción tardía revierte solo su unidad y aparece como pendiente concreto. Comparar notas, historial, evidencias, estados y revisiones antes/después.
- Repetir/concurrir la misma solicitud y simular respuesta perdida: mismo recibo, cero duplicados, resultado recuperable. Fuente cambiada entre preview y decisión: conflicto sin sobrescritura.
- Política de intentos, material versionado y claves pendientes siguen sus preflight; no desactivar flags para hacer pasar el caso.

## Enlaces y copia

- Desde ficha individual y desde el menú global, crear cuando se solicita explícitamente; copiar uno/todos/seleccionados. Reabrir y comprobar URL idéntica, misma vigencia y cuota.
- Denegar a estudiante, otro profesor y sesiones sin permiso; no filtrar nombres ni URLs por errores. Recibir error claro si ciphertext falta, no coincide con digest, es ilegible o el enlace ya no está autorizado.
- Histórico hash-only sigue abriendo con su token previo; copiar no lo reemplaza. Reemplazo explícito muestra advertencia y conserva cuota.
- Denegar portapapeles: texto completo seleccionable, sin nueva emisión. Cambiar cuenta/evaluación o cerrar limpia credenciales de la vista.
- Verificar cinco preguntas cada diez minutos con proveedor simulado; no consumir el cupo de familias ni llamar una IA real.

## Visual e impresión

- Comprobar veinte imágenes alfa y hoja de contacto; escoger cada motivo, mezcla estable y «Sin decoración».
- E2E en 360/390/768/1440 px × claro/oscuro × Chromium/WebKit, selección de teclado, nombres largos y teclado móvil simulado. Comprobar scroll, foco, barras y acciones sin tapar el texto.
- PDF A4 y Carta: treinta fichas cortas/largas hasta 6.000 caracteres, continuaciones, veinte motivos y sin motivo. Extraer texto para comprobar integridad y renderizar páginas iniciales, medias y finales; revisar márgenes, cabeceras, ≥12 pt, líneas de corte y escala de grises.
- Fallo de una imagen no bloquea imprimir la devolución. No hacer uniforme la altura a costa de cortar mensajes.

## Comandos de cierre

Desde el workspace: ejecutar pytest focalizado de `feedback_sharing` y regresión de calificaciones; Vitest, TypeScript, lint y build del frontend; Playwright para nuevo flujo y anteriores de entrega; construcción de contenedores, gobernanza e inventario vigentes. Los nombres exactos de archivos nuevos y resultados se registrarán al implementar, sin afirmar ahora que las pruebas pasaron.

Cerrar mediante Converge y PR enlazado a #257. No fusionar con CI pendiente/fallido ni afirmar despliegue o dispositivo físico verificado por una simulación. El rollback de aplicación debe conservar los nuevos recibos/campos y las credenciales históricas; no ejecutar downgrade destructivo automático en producción.

## Resultados ejecutados

- Lista de especificación 16/16 y requisitos 8/8 revisados antes de implementación, con aprobación explícita. Sin hooks de extensión.
- PostgreSQL sintético: migración completa a `202610240001` y migración upgrade/downgrade en esquema aislado, sin cambios en los digest heredados. 81 pruebas de integración de entrega/permisos/ciclo de vida/chat/cuota/regresión pasaron; después, las 8 de lote completas pasaron incluyendo la nueva tanda de 25.
- Tanda de 25: 3,09 s y 884 sentencias SQL en la medición local; 24 éxitos, un conflicto aislado, ocho ajustes conservados y cero válido. Repetición recupera el mismo recibo. Esta medición no incluye IA ni representa un tiempo garantizado de calificación.
- Backend: 76 pruebas unitarias de política, proyección y calificación pasaron. Tras reforzar la validación heredada, otras 37 focalizadas pasaron; no se suman como casos distintos. Auditoría de veinte PNG pasó por separado. Ruff focalizado sin errores.
- Frontend: 201 pruebas de calificaciones/retroalimentación pasaron; después, las 4 de copia (incluido nuevo fallo parcial con estudiante identificado) pasaron. TypeScript, lint estricto, build y auditoría pública de assets pasaron.
- Matriz inicial de 32 E2E pasó en 360/390/768/1440 px, ambos temas y Chromium/WebKit. La repetición ampliada a 36 obtuvo 31 éxitos y cinco timeouts de escritorio WebKit con cuatro workers. Los cuatro casos nuevos de 1440 px pasaron al repetirlos con un solo worker, sin ampliar límites ni forzar clics. El recorrido heredado extenso se dividió en revisión/enlaces e impresión/consulta, conservando las verificaciones y el tope de 60 s de cada recorrido: ambos pasaron (1,5 min en conjunto). Dos casos Chromium de impresión finales pasaron después de esperar la carga del portal. No se cuentan los timeouts como éxitos ni se certifican dispositivos físicos.
- PDF finales `output/pdf/spec122-A4.pdf`, `spec122-Letter.pdf` y `spec122-sin-decoracion.pdf`: diez páginas cada uno, treinta identidades presentes, 54 apariciones completas de los mensajes sintéticos y fuente mínima de 12 pt. A4/Carta decorados contienen 32 ilustraciones contando continuaciones; la opción sin decoración contiene cero. Inspección automatizada de márgenes y texto, más revisión visual de páginas iniciales, intermedias, finales y grises. Se corrigió una regla global que ocultaba `header` sin decoración y se espera la carga de las imágenes del portal antes de abrir impresión.
- Veinte originales generados con imagegen incorporado, sin datos ni claves reales. Copias web RGBA de hasta 320 px, 1.243.439 bytes en total; galería clara/oscura revisada. Los motivos no dependen de la nota.
- Contenedores backend y web construidos localmente; no ejecutados en producción. La versión final del frontend conserva las mismas dependencias.
- Gobernanza final: 49 pruebas pasaron sobre una exportación del árbol preparado, sin cambios ajenos de Spec034/115/121. El validador del PR pasó con las dos etiquetas aprobadas y el inventario vigente contiene 638 superficies. Las restricciones iniciales del sandbox de Windows para carpetas temporales/Git Bash se resolvieron ejecutando la misma suite con el permiso local correspondiente, sin cambiar pruebas ni controles.

Las capturas, originales y PDF son evidencia local ignorada por Git; no contienen alumnos reales. No se hicieron llamadas a modelos de calificación, no se cambiaron proveedores y no se crearon accesos públicos reales. Una prueba de navegador no certifica un iPhone/Android físico ni una mejora del aprendizaje.

## Cierre de convergencia

Se contrastaron 12 requisitos funcionales, 5 criterios de éxito, 16 escenarios de aceptación, 8 decisiones de diseño y los 8 principios constitucionales. Las dos brechas detectadas quedaron trazadas en T022/T023 y reparadas con regresiones previas: cabecera al imprimir sin decoración y orden del rechazo de publicación individual. No quedan funcionalidades ausentes en el alcance aprobado. El estado de CI y la autorización de fusión son controles posteriores: este cierre local no autoriza fusión ni despliegue.

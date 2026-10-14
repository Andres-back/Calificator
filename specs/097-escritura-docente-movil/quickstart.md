# Validación: escritura docente móvil

Estado: alcance/plan aprobados por «perfecto adelante» y listas revisadas (16/16 y 8/8). Implementación y pruebas locales terminadas el 2026-10-13. Rama codex/097-escritura-docente-movil, base main 0619678. Sin cambios a producción ni llamadas LLM reales.

## Cambios comprobados

- IA/manual abren sin enfoque textual automático en celular. El docente toca el campo para escribir.
- VisualViewport ajusta altura/offset solamente en estos formularios; fallback conserva desplazamiento normal y zoom. La compactación depende del foco, no de un supuesto detector universal de teclado.
- Cabecera/ayudas secundarias se reducen; el control y su etiqueta conservan espacio y el nodo permanece montado.
- Listo termina la escritura sin generar, guardar o publicar. Al recuperar una altura previamente contraída vuelve el contexto; cambios de orientación no fuerzan blur.
- Manual usa áreas de texto para preguntas/respuestas, botones Agregar estables, opciones/resumen plegables y errores localizables.
- Revisar pendientes enfoca un puntaje inválido en el campo correcto y no roba el foco si el docente ya pasó a otro.
- Foco/trampa de opt-in omiten controles plegados. Los modales ajenos conservan su comportamiento.

## Evidencia local inicial (ce9bfef)

1. Suite completa Vitest: 103 archivos, 649 pruebas verdes antes de las dos regresiones adicionales de orientación y foco del puntaje.
2. Última ejecución focalizada, con el código final: 52/52 pruebas en hook, Modal, GenerationWizard y MateriaEvaluaciones; incluye ambas regresiones adicionales, datos pendientes, errores y cero mutaciones por Listo.
3. Matriz de creación existente: 32 escenarios Chromium/WebKit completados, incluyendo 360/390/768/1280/1440, ambos temas, permisos, recuperación y 30 preguntas. Primera ejecución 27 verdes; cinco se repitieron verdes tras dar al recorrido completo 60 segundos (plazo del navegador, no del LLM) y comprobar foco correcto.
4. Matriz 097: 10 escenarios de escritura IA/revisión/manual con alturas 300/340/380 y offsets, ambos temas y navegadores. Todos verdes; se repitió únicamente un caso por redondeo de un píxel del transform. La altura CSS se comprueba exactamente y el cuadro renderizado admite un píxel, sin tolerar solapamiento real.
5. Mock E2E de creación desde materia: 1/1 verde; conserva contexto/criterios sin pedir nuevamente grado/área.
6. TypeScript, lint estricto, build y auditorías de acciones/build verdes. Advertencia conocida del chunk inicial mayor de 500 kB; presupuesto de recursos aprobado, sin dependencias nuevas.
7. Inventario, baseline y gobernanza se validan localmente antes del PR; suite completa de gobernanza/backend/contenedores obligatoria en CI remoto.
8. Inventario vigente: 573 superficies; baseline 8/8 y validador del PR sin errores. Converge: 12 FR, 6 SC, 11 escenarios, ocho decisiones de plan y ocho principios revisados; cero brechas missing/partial/contradicts/unrequested y cero tareas añadidas. Sin hooks de extensiones; tareas conservadas sin reescritura por Converge.

Capturas sintéticas inspeccionadas en output/playwright/097-escritura/ (ignoradas por Git). El editor manual fue ajustado después de detectar una etiqueta recortada en captura; la prueba final mide etiqueta y control, no solo el textarea.

## Límites y entrega

Los escenarios de VisualViewport son simulaciones, no abren un teclado físico de iOS/Android. El usuario aclaró que el problema era prácticamente el mismo en Android; no facilitó captura física. Queda verificar en su dispositivo/PWA después de CI y autorización de entrega.

Cero migraciones, cambios de notas/evidencias, cuentas, proveedores o fórmulas; las pruebas no usan alumnos ni credenciales reales. No se requiere Docker para este ajuste exclusivamente frontend. No se acredita la duración de generación/calificación.

PR enlazado mediante Closes #204, con spec-approved/plan-approved. CI pendiente al abrir; no fusionar ni desplegar sin autorización independiente y todos los controles verdes. Reversión: revertir el PR por el flujo normal, sin intervención de datos.

## Corrección autorizada del PR #205

El usuario solicitó «fusion» y autorizó corregir los fallos antes de fusionar. CI de ce9bfef tuvo 182/185 E2E verdes: dos casos conservaban el nombre automático en vez del escrito; otro produjo error interno de WebKit durante navegación. No se fusionó ni se actualizó producción.

Reproducción del nombre: seis recorridos fallaron con aserción directa del campo, antes de la generación. La compactación síncrona en focusin podía restaurar el valor anterior de un input controlado. Ahora el cambio de presentación se agrupa en el siguiente frame, después de la secuencia nativa foco/entrada; el frame se cancela al cerrar y comprueba el foco activo. No cambia datos, payloads ni guardado.

Las pruebas esperan el modo de escritura antes de pulsar Listo, comprueban nombre antes/después y en el payload. No usan pausas arbitrarias ni reintentos para ocultar fallos. Antes de otra navegación, el helper de login espera la pantalla autenticada; elimina la superposición con su redirección pendiente, manteniendo errores visibles.

Validación de la corrección:

- Cuatro repeticiones de creación con criterios en 360/390: 4/4 verdes, campo/nombre enviado/listado correctos.
- Matriz completa de creación y escritura Chromium/WebKit: 32/32 verdes en una ejecución, incluido el caso Safari que falló, ambos temas, escritorio, altura reducida y 30 preguntas.
- Creación contextual desde materia: 1/1 verde.
- Hook/Wizard/manual: 50/50 unidades, incluida nueva regresión de nombre controlado y selección; tipos, lint estricto, build y auditorías verdes.
- Inventario: 573 superficies, baseline y gobernanza local comprobados; Converge sin nuevas brechas de código. Sin hooks de extensiones.

La entrega sigue condicionada a CI remoto completo verde y fusión squash del HEAD comprobado. La autorización no permite bypass ni modificaciones manuales de producción. No se acredita un teclado físico ni velocidad de LLM por estas pruebas.

CI posterior de c661dc3 tuvo 651/652 unidades verdes; la comprobación existente de visibilidad de rúbrica se ejecutaba antes de completar su apertura asíncrona. Se cambió exclusivamente esa aserción a waitFor, conservando visibilidad real, guardado bloqueado y cero mutaciones. No se omite la prueba ni se modifica la rúbrica. Suite completa local posterior: 103 archivos y 652/652 verdes en 60,11 segundos. Se actualiza inventario/gobernanza y se espera una nueva CI completa; ningún HEAD fallido se fusionó.

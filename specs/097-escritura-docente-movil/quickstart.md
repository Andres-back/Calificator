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

## Evidencia local

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

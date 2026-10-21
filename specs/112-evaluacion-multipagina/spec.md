# Especificación: Recuperar calificación multipágina
**Rama**: `codex/112-evaluacion-multipagina` | **Fecha**: 2026-10-21 | **Issue**: #232
**Estado**: Hotfix solicitado y aprobado expresamente por el usuario: investigar y resolver entregas sin nota de Sociales Hidrografía, 17 preguntas, Marcela Rosero, 6-B.

## Escenarios de usuario y pruebas

### Historia 1 — Conservar las respuestas de todas las hojas (Prioridad: P1)

La docente guarda lectura inicial y respuestas posteriores. Lo leído en una página no puede desaparecer porque otra no contenga esa pregunta.
**Razón de prioridad**: Incidente real con evidencia existente y notas ausentes.
**Prueba independiente**: lectura inicial y dos hojas de respuestas conservan todas las transcripciones legibles.
**Aceptación**:
1. Lectura con marcadores vacíos más respuestas legibles posteriores: se conservan respuestas y páginas.
2. Fragmento ilegible más fragmento legible: se conserva el legible identificado como parcial, sin inventar lo restante ni garantizar puntaje automáticamente.
3. Blanco en otra hoja: no borra una respuesta visible ni la etiqueta como vacía.

### Historia 2 — Terminar y recuperar sin perder trabajo (Prioridad: P1)

La docente puede recuperar la calificación sin repetir fotos guardadas. Se diferencian lectura introductoria, fallo técnico, respuesta ilegible y hojas realmente faltantes.
**Prueba independiente**: una página expira y otra termina; se conserva lo terminado, se identifica la faltante y se puede reintentar.
**Aceptación**:
1. La lectura sin áreas de respuesta no provoca una cascada innecesaria de lectores en un documento con más hojas.
2. Un timeout parcial no descarta páginas terminadas.
3. Recuperación acotada de entregas sin nota, conservando original, historial y decisiones docentes.

## Casos límite

Solo lectura, hoja realmente vacía, grafito ilegible, respuestas contradictorias, dibujos, preguntas que se responden en un cuaderno no adjunto y hojas fallidas. Nunca convertir fallo técnico en cero ni fabricar una respuesta. Reintento no duplica calificación; decisión docente concurrente prevalece.

## Requisitos funcionales

- **FR-001**: La unión de páginas DEBE conservar todo texto/dibujo recuperado con procedencia; ausencias y blancos de otra hoja no deben borrarlo.
- **FR-002**: Fragmentos incompletos o contradictorios DEBEN mantenerse identificados como parciales/revisables y llegar así al evaluador y verificador. No generan un piso automático de nota.
- **FR-003**: Una página introductoria DEBE distinguirse de un fallo de lectura y de preguntas ausentes, evitando contingencias innecesarias sin inventar contestaciones.
- **FR-004**: El límite temporal DEBE conservar páginas ya extraídas, señalar faltantes y permitir recuperar, sin afirmar cobertura completa.
- **FR-005**: Debe recuperarse de forma acotada el incidente, con diagnóstico previo, respaldo e historial, excluyendo calificaciones con nota existente o decisión docente. Los casos sin evidencia suficiente deben tener explicación concreta, no nota fabricada.
- **FR-006**: Seguridad, límites, permisos, evidencia original e idempotencia DEBEN mantenerse. No cambiar rutas globales de modelos, claves, preguntas o respuestas esperadas para ocultar el fallo.
- **FR-007**: Regresiones sintéticas, conservación de decisiones y CI verde DEBEN preceder fusión y publicación desde main. Sin nombres de menores en artefactos versionados.

### Entidades clave

Entrega con evidencia, páginas leídas y faltantes, respuesta parcial, nota sugerida y decisión/historial docente. El original permanece inmutable; reintentar genera un nuevo trabajo trazable, no un alumno o evaluación nuevos.

## Criterios de éxito

- **SC-001**: El 100 % de fragmentos legibles en las muestras multipágina llega a calificación con procedencia e incertidumbre conservadas.
- **SC-002**: Lectura introductoria sin respuestas no consume contingencias por página; timeout parcial conserva páginas terminadas.
- **SC-003**: Las nueve entregas sin nota del diagnóstico terminan con sugerencia verificable o motivo específico de evidencia pendiente; cero sobrescrituras de notas existentes o decisiones docentes y cero pérdidas de originales.

## Supuestos

Se prioriza la reparación urgente sobre maquetación. Conservar lectura digitalizada, impresión compacta y digitalizar varias fotos se investigaron en paralelo y se implementarán como entrega separada con su propia especificación, sin bloquear este hotfix. Encuesta Spec111 fuera de alcance y sin fusionar/publicar por esta tarea. La IA sugiere y la docente decide.

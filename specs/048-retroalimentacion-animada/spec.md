# Especificación: retroalimentación animada con Xali

**Feature Branch**: `codex/048-retroalimentacion-animada`  
**Created**: 2026-09-19  
**Status**: Especificación y plan aprobados por el usuario el 2026-09-19. Issue [#95](https://github.com/Andres-back/Calificator/issues/95) con `spec-approved` y `plan-approved`. Implementación y validación local completadas; sin push, PR ni despliegue.  
**Input**: Presentar la retroalimentación como una historia breve y motivadora guiada por un personaje, conservando una experiencia rápida y comprensible.

## User Scenarios & Testing

### User Story 1 - Entender mi resultado sin sentirme castigado (Priority: P1)

Un estudiante abre una nota publicada y Xali le presenta una secuencia breve: reconoce el esfuerzo, explica uno o dos hallazgos sustentados, propone el siguiente paso y cierra con ánimo para continuar.

**Why this priority**: La retroalimentación debe ayudar a comprender y actuar, no ser una decoración que distraiga de la evidencia.

**Independent Test**: Abrir una calificación publicada con aciertos, errores y orientación, recorrer la secuencia y comprobar que nota, evidencia y texto completo siguen disponibles.

**Acceptance Scenarios**:
1. **Given** una calificación publicada, **When** el estudiante abre la retroalimentación, **Then** ve un resumen visual de máximo cuatro escenas y puede consultar el detalle original sin perder información.
2. **Given** una respuesta correcta, **When** Xali la presenta, **Then** reconoce el acierto sin inventar errores ni repetir elogios vacíos.
3. **Given** una respuesta mejorable, **When** Xali explica el siguiente paso, **Then** la orientación coincide con la evidencia y no modifica ni oculta la justificación de la nota.

### User Story 2 - Controlar la experiencia (Priority: P1)

Un estudiante puede pausar, avanzar, retroceder, omitir o volver a reproducir la historia. Quien prefiera menos movimiento recibe la misma información en una vista estática.

**Why this priority**: La motivación no puede sacrificar accesibilidad, autonomía ni rapidez.

**Independent Test**: Activar reducción de movimiento y verificar que todas las escenas se convierten en tarjetas estáticas operables con teclado y lector de pantalla.

**Acceptance Scenarios**:
1. **Given** reducción de movimiento activa, **When** se abre la retroalimentación, **Then** no hay movimientos automáticos y todo el contenido permanece accesible.
2. **Given** una animación en curso, **When** el estudiante pulsa pausar u omitir, **Then** el control responde inmediatamente y conserva su posición.
3. **Given** un recurso visual que no carga, **When** se muestra la retroalimentación, **Then** aparece la alternativa estática sin bloquear la nota.

### User Story 3 - Mantener una identidad coherente y ligera (Priority: P2)

El equipo reutiliza a Xali en múltiples emociones, acciones y tamaños sin producir una imagen nueva por estudiante ni cargar cientos de archivos independientes.

**Why this priority**: La biblioteca debe ser sostenible, consistente y apta para celulares y conexiones escolares.

**Independent Test**: Combinar estados, expresiones y gestos y verificar al menos 100 variaciones coherentes usando un conjunto pequeño de recursos base.

**Acceptance Scenarios**:
1. **Given** diferentes tipos de feedback, **When** se elige una escena, **Then** se reutilizan estados aprobados de Xali y no se generan imágenes con datos estudiantiles.
2. **Given** modo claro u oscuro y distintos tamaños, **When** Xali aparece, **Then** conserva contraste, proporciones y legibilidad.

### Edge Cases

- Calificación sin feedback general, sin orientación por respuesta o con evidencia ilegible.
- Nota en revisión, no publicada o reclamada: no celebrar un resultado provisional.
- Retroalimentación extensa: resumir la presentación sin recortar el texto original consultable.
- Varias respuestas incorrectas: priorizar máximo dos acciones por recorrido y ofrecer el resto en detalle.
- Conectividad lenta, recurso ausente o error de renderizado: degradación estática inmediata.
- Estudiante que reabre la misma nota: no forzar reproducción automática repetida.
- Lenguaje sensible: no usar castigo, comparación social, estigmas ni atribuciones personales.

## Requirements

### Functional Requirements

- **FR-001**: La experiencia DEBE usar a Xali como guía visual y conservar intactas la nota, evidencia, explicaciones y orientaciones publicadas.
- **FR-002**: La historia DEBE limitarse a cuatro momentos: bienvenida/contexto, acierto principal, aspecto prioritario por mejorar y siguiente paso motivador.
- **FR-003**: El estudiante DEBE poder pausar, avanzar, retroceder, omitir y repetir sin bloquear la navegación.
- **FR-004**: DEBE existir una versión estática equivalente y respetarse la preferencia de reducción de movimiento.
- **FR-005**: La presentación DEBE distinguir resultados publicados de estados pendientes, en revisión o reclamados y evitar celebraciones engañosas.
- **FR-006**: Los recursos visuales NO DEBEN contener nombres, respuestas, notas ni datos personales, y NO DEBE generarse una imagen nueva por estudiante.
- **FR-007**: La biblioteca DEBE producir al menos 100 combinaciones coherentes a partir de piezas, expresiones, gestos, accesorios educativos y transiciones reutilizables.
- **FR-008**: La experiencia DEBE funcionar en celular y escritorio, modo claro y oscuro, teclado y lector de pantalla.
- **FR-009**: Un error o demora visual NO DEBE impedir consultar la calificación ni su retroalimentación textual.
- **FR-010**: El contenido animado NO DEBE añadir otra evaluación de IA ni modificar el número de llamadas necesarias para calificar.
- **FR-011**: El estudiante DEBE poder abrir el detalle completo asociado a cada escena y volver a la historia en el mismo punto.
- **FR-012**: La primera versión DEBE medirse separadamente de la calidad de la nota: comprensión, motivación percibida, finalización y uso de controles.

### Key Entities

- **Escena de retroalimentación**: momento narrativo, mensaje ya aprobado, referencia al detalle y estado visual.
- **Estado de Xali**: expresión, gesto, postura y accesorio reutilizables, sin datos personales.
- **Preferencia de movimiento**: reproducción normal, pausada o estática.
- **Recorrido**: secuencia derivada de una calificación publicada y su progreso local de visualización.
- **Evento de experiencia**: inicio, pausa, omisión, detalle consultado y recorrido completado, sin almacenar contenido de respuestas.

## Success Criteria

- **SC-001**: 100% de los controles críticos funcionan con teclado y la información completa permanece disponible sin animación.
- **SC-002**: En 360×800, 390×844, tableta y escritorio no hay contenido cortado ni desplazamiento horizontal.
- **SC-003**: La primera escena útil aparece en menos de 1 segundo cuando el texto de la calificación ya está disponible; los recursos decorativos no bloquean la vista.
- **SC-004**: Al menos 90% de estudiantes de una prueba guiada identifica correctamente qué hizo bien y cuál es su siguiente paso.
- **SC-005**: Al menos 80% completa u omite conscientemente el recorrido sin requerir ayuda para navegar.
- **SC-006**: El sistema ofrece al menos 100 combinaciones coherentes sin generar recursos personalizados por estudiante.
- **SC-007**: Las pruebas confirman que notas, explicaciones, evidencia, publicación y reclamos no cambian por activar o desactivar la experiencia.

## Assumptions

- Xali es la mascota oficial; no se introduce un segundo personaje.
- La lámina `assets/xali-pose-sheet-v1.png` es referencia conceptual, no un sprite listo para producción ni un recurso que deba mostrarse completo al estudiante.
- “Cientos de posiciones” se logra combinando un conjunto controlado de piezas y estados, no almacenando cientos de PNG pesados.
- La narración usa exclusivamente el feedback ya publicado; no agrega otra llamada de IA ni reescribe silenciosamente el contenido.
- La animación será breve y sobria; no incluirá recompensas competitivas, presión, sonidos automáticos ni reproducción infinita.
- La medición pedagógica definitiva requiere prueba con estudiantes y aprobación institucional correspondiente.

## Out of Scope

- Video generado, voz sintética, sincronización labial o avatares personalizados.
- Gamificación con monedas, rachas o tablas de posiciones.
- Cambios al cálculo, modelos, colas, publicación o resolución de reclamos.
- Generación de imágenes en tiempo real basada en la respuesta del estudiante.

# Especificación: Revisión docente por excepciones

**Rama**: `codex/050-revision-por-excepciones`

**Creada**: 2026-09-19

**Estado**: Aprobada

**Issue**: [#99](https://github.com/Andres-back/Calificator/issues/99)

**Entrada**: El docente no debe repetir una calificación completa para comprobar el trabajo de la IA; debe identificar y revisar primero las respuestas con señales de incertidumbre, conservando la decisión final.

## Escenarios de usuario y pruebas

### Historia 1 - Encontrar rápidamente lo que necesita atención (Prioridad: P1)

Como docente, quiero ver cuántas respuestas son seguras, cuántas necesitan atención y cuántas están bloqueadas para concentrar mi revisión donde puede existir un error.

**Por qué esta prioridad**: Es la reducción directa de trabajo repetitivo y el valor central de la calificación asistida.

**Prueba independiente**: Abrir una calificación con respuestas de distinta confianza y comprobar que el resumen identifica todas las excepciones y permite ir a ellas sin recorrer las respuestas seguras.

**Escenarios de aceptación**:

1. **Dada** una calificación con respuestas seguras y dudosas, **cuando** el docente abre el detalle, **entonces** ve los tres conteos y la primera excepción priorizada.
2. **Dada** una respuesta ilegible, no evaluable o marcada para revisión, **cuando** se construye el resumen, **entonces** aparece como bloqueada y nunca como segura.
3. **Dada** una respuesta con confianza insuficiente o verificaciones contradictorias, **cuando** se construye el resumen, **entonces** aparece en “Necesita atención” con una razón comprensible.
4. **Dada** una calificación sin excepciones, **cuando** el docente abre el detalle, **entonces** se informa que no se detectaron alertas sin afirmar que la IA sea infalible.

---

### Historia 2 - Revisar excepciones sin perder el contexto (Prioridad: P2)

Como docente, quiero avanzar entre excepciones y comparar cada una con la hoja de evidencia correspondiente para ajustar solo lo necesario.

**Por qué esta prioridad**: La priorización solo ahorra tiempo si la navegación entre evidencia, explicación y puntaje es directa.

**Prueba independiente**: Seleccionar “Revisar excepciones”, avanzar entre casos y verificar que cada selección conserva edición, evidencia y desglose existentes.

**Escenarios de aceptación**:

1. **Dada** una lista de varias excepciones, **cuando** el docente selecciona una, **entonces** se abre su respuesta y la hoja asociada sin cambiar la nota.
2. **Dada** una excepción revisada, **cuando** el docente avanza, **entonces** llega a la siguiente excepción y no a una respuesta segura intermedia.
3. **Dado** un teléfono de 360 px, **cuando** el docente usa el resumen y la navegación, **entonces** puede acceder a todos los controles sin desplazamiento horizontal.

---

### Historia 3 - Conservar control humano y medir el ahorro (Prioridad: P3)

Como responsable del piloto, quiero registrar el uso de la revisión por excepciones para comparar el tiempo y los ajustes frente a la revisión convencional.

**Por qué esta prioridad**: Permite demostrar si la función reduce tiempo docente sin convertir una interacción en una afirmación de precisión.

**Prueba independiente**: Completar una revisión usando el resumen y comprobar que se registran apertura, navegación y confirmación sin guardar respuestas ni evidencia sensible.

**Escenarios de aceptación**:

1. **Dada** una calificación sugerida, **cuando** el docente usa la priorización, **entonces** se registran eventos mínimos de interacción y duración sin contenido académico.
2. **Dada** cualquier calificación, **cuando** el docente confirma, ajusta o publica, **entonces** continúan aplicándose las validaciones actuales del servidor.
3. **Dada** una respuesta clasificada como segura, **cuando** el docente no la abre individualmente, **entonces** el sistema no la publica por separado ni omite la confirmación final.

### Casos límite

- Un desglose heredado o ausente mantiene la guía de revisión actual y no inventa una clasificación.
- Si todas las respuestas están bloqueadas, el resumen desactiva cualquier mensaje de revisión rápida y dirige a revisión manual.
- Una confianza ausente se trata como señal de atención cuando no existen otras verificaciones suficientes.
- Los estados “incorrecta” o “sin respuesta” no son por sí mismos errores de la IA; solo son excepciones si presentan incertidumbre, falta de evidencia o bloqueo.
- Si cambia el desglose después de un ajuste, el resumen se recalcula con la versión vigente.
- Las calificaciones ya publicadas muestran el resumen de forma informativa, sin habilitar edición.

## Requisitos

### Requisitos funcionales

- **FR-001**: El sistema DEBE clasificar cada componente del desglose como seguro, necesita atención o bloqueado usando señales auditables ya registradas.
- **FR-002**: El sistema DEBE mostrar conteos y razones de clasificación sin ocultar el desglose completo.
- **FR-003**: Una respuesta ilegible, no evaluable, sin puntaje o marcada para revisión DEBE clasificarse como bloqueada.
- **FR-004**: Una respuesta con confianza insuficiente, verificaciones contradictorias, explicación ausente o evidencia insuficiente DEBE clasificarse como necesita atención.
- **FR-005**: Una respuesta correcta, parcial, incorrecta o sin respuesta PUEDE ser segura cuando su lectura, referencia, explicación y verificaciones son consistentes.
- **FR-006**: El docente DEBE poder saltar a la primera excepción y avanzar únicamente entre excepciones.
- **FR-007**: Seleccionar una excepción DEBE conservar los flujos actuales de evidencia, edición de puntaje, explicación y navegación móvil.
- **FR-008**: La función NO DEBE confirmar, publicar ni modificar automáticamente ninguna nota o respuesta.
- **FR-009**: La confirmación final DEBE continuar dependiendo de la acción explícita del docente y de las validaciones actuales.
- **FR-010**: El sistema DEBE conservar una forma visible de revisar también las respuestas clasificadas como seguras.
- **FR-011**: El sistema DEBE registrar apertura del resumen, navegación por excepciones y finalización de la revisión sin incluir respuestas, imágenes ni retroalimentación.
- **FR-012**: La interfaz DEBE ser utilizable desde 360 px, en modos claro y oscuro, por teclado y con reducción de movimiento.
- **FR-013**: Las calificaciones sin desglose explicable DEBEN conservar el comportamiento vigente.

### Entidades clave

- **Clasificación de revisión**: Resultado derivado para un componente; contiene nivel, razones legibles y orden de prioridad, pero no altera el puntaje.
- **Resumen de excepciones**: Conteos derivados de la versión activa del desglose y lista ordenada de componentes que necesitan intervención.
- **Evento de revisión**: Registro mínimo de interacción y duración para medir el flujo, sin contenido educativo sensible.

## Criterios de éxito

### Resultados medibles

- **SC-001**: Un docente puede identificar la cantidad y ubicación de todas las excepciones en menos de 5 segundos desde que abre una calificación.
- **SC-002**: El 100 % de los componentes ilegibles, no evaluables, sin puntaje o marcados para revisión aparecen como bloqueados.
- **SC-003**: En una evaluación de diez respuestas con dos excepciones, el docente puede llegar a ambas usando como máximo cuatro acciones.
- **SC-004**: Ningún recorrido de revisión por excepciones publica o modifica una nota sin una acción explícita del docente.
- **SC-005**: La tarea completa funciona sin desbordamiento horizontal en 360×800 y mantiene controles táctiles accesibles.
- **SC-006**: El piloto puede comparar tiempo total, cantidad de respuestas abiertas y cantidad de ajustes entre revisión convencional y revisión por excepciones.
- **SC-007**: Al menos 80 % de los docentes del piloto comprende por qué cada respuesta fue priorizada sin asistencia adicional.

## Supuestos

- La confianza es una señal de priorización, no una garantía de corrección.
- Se reutilizan el desglose explicable, la evidencia y las verificaciones que ya existen.
- El primer incremento no cambia tablas, nota sugerida, fórmula, estados de publicación ni contratos públicos.
- La revisión rápida no sustituye la muestra de control ni la decisión profesional del docente.
- Los umbrales se definen de forma determinista y podrán calibrarse con datos del piloto en una especificación posterior.

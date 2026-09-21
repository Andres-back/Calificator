# Especificación: respuesta estructurada y rutas rápidas

**Rama**: `codex/055-fast-json-routing`

**Creado**: 2026-09-20

**Estado**: Aprobado como hotfix

**Entrada**: Prueba real autorizada en producción. La digitalización terminó en 26,18 s después de intentar rutas inválidas; la calificación terminó en 50,04 s porque la verificación independiente agotó su salida antes de cerrar el resultado estructurado.

**Issue**: [#109](https://github.com/Andres-back/Calificator/issues/109)

## Escenarios de usuario y pruebas

### Historia 1 - Verificación independiente completa (Prioridad: P1)

Como docente, quiero que el segundo evaluador entregue una comprobación válida y breve para saber qué preguntas requieren atención sin esperar una comparación adicional innecesaria.

**Por qué es prioritaria**: una salida incompleta oculta observaciones útiles, prolonga el proceso y reduce la confianza del docente.

**Prueba independiente**: calificar la evidencia matemática real de cuatro preguntas y comprobar que el evaluador principal y el verificador independiente terminan, que la suma se conserva por pregunta y que ninguna nota se publica automáticamente.

**Escenarios de aceptación**:

1. **Dado** un resultado principal completo, **cuando** el verificador independiente analiza cuatro preguntas, **entonces** devuelve un resultado estructurado completo sin agotar su límite de salida.
2. **Dado** que el verificador observa una respuesta de referencia posiblemente incorrecta, **cuando** termina, **entonces** la pregunta y la calificación quedan marcadas para revisión docente.
3. **Dado** que el verificador no puede producir un resultado válido, **cuando** el flujo se recupera, **entonces** conserva la nota calculada por pregunta, informa el fallo y no presenta consenso falso.

---

### Historia 2 - Digitalización sin rutas muertas (Prioridad: P1)

Como docente, quiero que una foto se convierta directamente en un borrador editable usando rutas disponibles para no perder tiempo en proveedores o modelos retirados.

**Por qué es prioritaria**: los intentos fallidos aumentan la espera aunque el sistema finalmente tenga un respaldo funcional.

**Prueba independiente**: digitalizar la misma imagen real y comprobar que se obtiene un borrador de cuatro preguntas y cuatro respuestas, sin respuestas 404 o 401 intermedias.

**Escenarios de aceptación**:

1. **Dado** un modelo principal disponible para estructurar, **cuando** se digitaliza la imagen, **entonces** no se consulta primero un modelo retirado.
2. **Dado** que la extracción visual ya terminó, **cuando** comienza la estructuración, **entonces** se usa la ruta guardada para esa etapa y se conserva la posibilidad de respaldo.
3. **Dado** que el trabajo termina, **cuando** el docente vuelve a evaluaciones, **entonces** ve el borrador editable con todas las preguntas y respuestas detectadas.

### Casos límite

- El segundo modelo devuelve texto alrededor del objeto estructurado.
- El segundo modelo alcanza su límite de salida o devuelve una estructura incompleta.
- El proveedor principal de una etapa está temporalmente indisponible.
- La clave docente contiene un valor intermedio en lugar de la respuesta final.
- La evidencia es legible, pero una pregunta exige revisar un dibujo o procedimiento.

## Requisitos

### Requisitos funcionales

- **FR-001**: El verificador independiente DEBE producir una salida breve y completa para cada pregunta evaluada.
- **FR-002**: El sistema DEBE detectar una salida truncada o inválida antes de tratarla como una verificación exitosa.
- **FR-003**: Una falla del verificador NO DEBE alterar la suma real de puntos ni publicar la nota.
- **FR-004**: Las alertas del verificador DEBEN quedar visibles y asociadas a la pregunta correspondiente cuando sea posible.
- **FR-005**: La digitalización DEBE usar la configuración vigente de cada etapa y evitar rutas conocidas como retiradas o inválidas.
- **FR-006**: La extracción visual, la valoración principal y la verificación independiente DEBEN conservar telemetría de modelo, etapa, duración y resultado.
- **FR-007**: Los cambios NO DEBEN modificar contratos públicos, la fórmula de nota ni la autoridad final del docente.
- **FR-008**: El borrador digitalizado DEBE conservar una respuesta esperada para cada pregunta antes de permitir su revisión.

## Criterios de éxito

### Resultados medibles

- **SC-001**: La evidencia real de cuatro preguntas termina la calificación asistida con los dos evaluadores en menos de 20 segundos en una ejecución de referencia, sin publicar la nota.
- **SC-002**: La imagen real se convierte en un borrador completo en menos de 20 segundos en una ejecución de referencia, sin intentos 404 o 401.
- **SC-003**: El 100 % de las salidas truncadas o inválidas del verificador quedan identificadas como tales y nunca como consenso.
- **SC-004**: La prueba real conserva cuatro componentes cuya suma coincide con la nota sugerida.
- **SC-005**: Las observaciones sobre claves dudosas aparecen como revisión docente y no corrigen silenciosamente la evaluación.

## Supuestos

- Se reutiliza la imagen real ya autorizada y almacenada solo como artefacto temporal de prueba.
- La configuración institucional mantiene a DeepSeek V4 Flash Vision Exp para extracción/valoración y a GLM 5.3 Flash para verificación independiente.
- No se confirma ni publica ninguna calificación durante las pruebas.
- La prueba de referencia depende de la disponibilidad de red del proveedor, pero no debe incluir esperas causadas por rutas inválidas conocidas.

# Validación: Retroalimentación orientada al siguiente paso y foto siempre adjunta

## PR 1: la foto siempre adjunta

### Pruebas

```
python -m pytest backend/tests/unit -q -k feedback
  201 passed

npx vitest run src/modules/feedback_sharing
  215 passed

npx playwright test e2e/feedback-link-reentry.spec.ts e2e/feedback-share-review.spec.ts e2e/feedback-workspace-responsive.spec.ts e2e/feedback-delivery.spec.ts --project=chromium
  102 passed
```

Antes de la corrección, 9 pruebas de backend fallaban: publicación sin foto, 409 al reutilizar, reemplazo y copia sin foto, y la opción de foto ofrecida a una entrega sin archivo. Las pruebas de integración con PostgreSQL y las de WebKit corren en CI.

### Hallazgo durante la implementación

`evidencia_disponible` solo miraba si existía la entrega, y un 404 de la foto cerraba toda la página con "Este enlace no está disponible". Con la foto siempre activa, un estudiante con entrega en línea habría perdido su nota y su mensaje al tocar el botón. Ahora la opción aparece solo si hay archivo, y un 404 vuelve a consultar el enlace: se oculta todo únicamente si está cerrado de verdad.

### Sin efecto en datos

- La huella de contenido no incluye `evidence_enabled`, así que los enlaces vigentes siguen abriendo.
- Ninguna migración ni escritura masiva. Un enlace vigente cambia solo cuando el docente actúa sobre él, y queda en auditoría como `feedback_evidence_attached`.
- Abrir el panel recupera los enlaces sin cambiar nada: lo cubre una prueba.

### Manual, después del despliegue

1. Generar un enlace de una entrega con foto, sin marcar nada: el estudiante ve **Ver foto de tu entrega**.
2. Generar un enlace de una entrega en línea: no aparece esa opción.
3. Abrir un enlace vigente sin foto: sigue igual hasta que el docente lo copie; después aparece la opción.

## PR 2: la acción primero y sin textos internos para el estudiante

### Pruebas

```
python -m pytest backend/tests/unit/test_feedback_action_first.py -q
  8 passed

python -m pytest backend/tests/unit -q   (sin test_evidence_scan* ni la versión de fpdf, que fallan solo en este equipo)
  2291 passed, 7 skipped

npx vitest run src/modules/feedback_sharing
  216 passed
```

Antes de la corrección, la importación de `repartition_explanations` fallaba y, con ella resuelta, 3 pruebas de orden seguían fallando: el mensaje empezaba por el error y terminaba con «Siguiente paso». Las pruebas de integración con PostgreSQL corren en CI.

### Hallazgo durante la implementación

El plan preveía tocar `projection.py` para que el aviso «Retroalimentación provisional» no llegara a enlaces nuevos. No hizo falta: `ensure_feedback_coherence` ya rechaza un enlace directo cuyo mensaje empieza por ese aviso, y el texto que se ofrece para aprobar pasa por `delivery_message`, que lo quita. Como la proyección no cambia, la huella de los enlaces vigentes es la misma. Una prueba lo fija.

### Sin efecto en datos

- Ninguna migración ni escritura masiva. Los mensajes y explicaciones guardados conservan su redacción.
- El orden nuevo se ve en las calificaciones nuevas y en los mensajes que se rehacen desde el desglose. La frase del reparto deja de añadirse a la explicación del estudiante en los próximos repartos; la del docente la conserva.

### Manual, después del despliegue

1. En una calificación nueva con una respuesta parcial, el borrador dice «Pregunta N: {qué hacer} Por qué: {motivo}».
2. Tras confirmar un reparto de puntos, la explicación del estudiante no empieza por «Con el reparto confirmado».

## PR 3: reglas de redacción

### Pruebas

```
python -m pytest backend/tests/unit/test_feedback_writing_rules.py backend/tests/unit/test_comparator_feedback.py -q
  25 passed

python -m pytest backend/tests/unit -q   (sin test_evidence_scan* ni la versión de fpdf, que fallan solo en este equipo)
  2296 passed, 7 skipped, 1 failed
```

La que falla es `test_normal_twenty_delivery_path_has_no_extra_calls_or_material_cpu_overhead`, que compara tiempos de proceso entre dos caminos que usan las mismas instrucciones. En este equipo es intermitente: repetida sola pasó 2 de 3 veces. No depende de este cambio; CI la corre en un entorno estable.

Con las instrucciones desplegadas, las 6 pruebas de `test_feedback_writing_rules.py` fallan. Las reglas obligatorias de puntaje no se tocaron.

### Muestra con IA, sin guardar nada

El 2026-11-23 se compararon las instrucciones desplegadas con las nuevas sobre entregas reales, sin nombres y sin escribir en la base: 8 entregas de 5 evaluaciones, cada una con al menos dos respuestas por mejorar. Modelo `claude-haiku-5-5`, 25 llamadas, 0,49 USD según el registro de uso. El costo se aprobó antes, con tope de 1 USD.

Resultado en las 7 entregas que se corrieron con la versión final de las reglas (63 preguntas):

| Medida | Instrucciones desplegadas | Instrucciones nuevas |
|---|---|---|
| Preguntas cuyo texto para el estudiante nombra el funcionamiento interno | 41 | 1 |
| Mensajes al estudiante que lo nombran | 1 de 7 | 0 de 7 |
| Alertas al docente que dicen de qué pregunta hablan | 13 de 23 | 21 de 23 |
| Orientaciones que empiezan por un verbo | 25 de 27 | 28 de 28 |
| Largo medio del mensaje al estudiante | 638 caracteres | 514 caracteres |
| Preguntas incorrectas que revelan la letra esperada, con «orientar sin dar la respuesta» activo | 4 de 21 | 0 de 22 |
| Nota sugerida | | igual en 5 de 7 |

La fila de la letra revelada se contó sobre las preguntas por mejorar cuyo texto se guardó, hasta cuatro por entrega.

Ejemplo de una misma pregunta. Antes: «La validación objetiva marcó la respuesta B (La comunidad) frente a la clave oficial (C) como incorrecta». Después: «La opción marcada no es la primera comunidad a la que pertenece una persona, por eso no suma puntaje».

### Hallazgo de la muestra

La primera versión de la regla decía que lo que es solo para el docente va en las alertas. En 5 de 8 entregas el modelo llevó ahí el aviso de que una respuesta era incorrecta, y las alertas subieron de 26 a 35. Desde la Spec 213 el docente ve cada alerta en su pregunta, así que eso tapaba las dudas reales. La regla final dice que una alerta es solo para lo que el docente debe comprobar o decidir. Con ella, las alertas volvieron a 23 en las 7 entregas repetidas y todas son dudas sobre la foto, la lectura, la clave o un criterio.

### Límites de la muestra

- El modelo de la muestra es más pequeño que el que califica en producción, y recibió las respuestas ya leídas, sin la foto. Sirve para comparar redacción, no para medir la exactitud de la nota.
- Cada entrega se calificó una vez por versión. En dos la nota sugerida bajó, 0,15 y 0,28. Al repetir esas dos con las instrucciones desplegadas, una varió 0,05 por sí sola. La otra diferencia está en una pregunta cuya respuesta esperada parece equivocada: las instrucciones desplegadas dieron el punto completo y las nuevas lo dejaron parcial y avisaron al docente para que revise la clave. Con esta muestra no se puede saber si es un efecto de las reglas o variación del modelo.
- Las 8 entregas pidieron revisión docente con ambas versiones.

### Sin efecto en datos

- Ninguna migración ni escritura. Las calificaciones guardadas conservan su redacción; las reglas nuevas se ven en las calificaciones nuevas y al recalificar.
- No cambia la proyección ni la huella de los enlaces vigentes.

### Manual, después del despliegue

1. Calificar una entrega con una respuesta incorrecta: la explicación del estudiante no dice «validación», «clave oficial» ni «transcripción».
2. Con «orientar sin dar la respuesta» activo, ni el mensaje ni la explicación dicen la letra o el texto correctos.
3. Las notas del modelo que ve el docente en cada pregunta son dudas por comprobar, no avisos de que la respuesta es incorrecta.

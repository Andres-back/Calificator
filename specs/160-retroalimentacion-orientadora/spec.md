# Especificación: Retroalimentación orientada al siguiente paso y foto siempre adjunta

**Rama**: `codex/160-retroalimentacion-orientadora` | **Creada**: 2026-11-08 | **Estado**: Aprobada | **Issue**: [#340](https://github.com/Andres-back/Calificator/issues/340)

**Entrada**: el usuario pidió que la retroalimentación sea orientadora, que no se fije tanto en el error sino en cómo solucionarlo, y que "la imagen de la evaluacion siempre va adjunta".

## Marco

La tesis se apoya en Hattie y Timperley (2007), con sus tres preguntas (hacia dónde voy, cómo voy, qué sigue), y en Shute (2008), que pide comentarios específicos y utilizables. El error se conserva como información sobre "cómo voy", pero al servicio del siguiente paso.

## Evidencia

Consultas de solo lectura en producción, el 2026-11-08:

| Hallazgo | Medida |
| --- | --- |
| Enlaces vigentes sin foto | 6 de 11 |
| Respuestas con error que traen orientación (30 días) | 1298 de 1315 |
| Explicaciones con "validación" o "clave oficial" | 187 de 1230 |
| Explicaciones con "Con el reparto confirmado" | 110 de 1230 |
| Explicaciones que parecen revelar la respuesta (conteo aproximado) | 116 de 1230 |
| Notas confirmadas con "Retroalimentación provisional" guardado | 29 de 49 |
| Enlaces vigentes que contienen "provisional" | 1 de 11 |

## Escenarios de usuario y pruebas

### Historia 1 - La foto siempre acompaña la devolución (Prioridad: P1)

Como estudiante, quiero ver la foto de mi evaluación junto a mi retroalimentación, para entender a qué se refiere cada comentario.

**Aceptación**:
1. **Dada** una entrega con foto o PDF, **cuando** el docente genera, reactiva, reemplaza o vuelve a copiar el enlace, **entonces** el estudiante ve su evidencia, sin que el docente marque nada.
2. **Dada** una entrega sin archivo, **cuando** se genera el enlace, **entonces** se genera igual y no aparece ninguna imagen ni error.
4. **Dada** una foto que no se puede abrir, **cuando** el estudiante la pide, **entonces** sigue viendo su nota y su mensaje.
3. **Dada** la pantalla de compartir, **cuando** el docente la abre, **entonces** ya no ve la casilla de fotos y se le indica que el estudiante verá su propia entrega.

### Historia 2 - Primero qué hacer (Prioridad: P1)

Como estudiante, quiero leer primero qué puedo hacer en cada pregunta, para saber cómo mejorar y no solo qué hice mal.

**Aceptación**:
1. **Dada** una respuesta incorrecta o parcial con orientación, **cuando** se arma el mensaje, **entonces** la pregunta empieza por la acción y después explica brevemente por qué.
2. **Dada** una evaluación con meta o criterio disponible, **cuando** se genera el mensaje, **entonces** dice en palabras sencillas qué se buscaba, sin inventarlo si no existe.
3. **Dado** un logro observado, **cuando** se genera el mensaje, **entonces** sigue empezando por ese logro, sin inventar elogios.

### Historia 3 - Lenguaje para el estudiante (Prioridad: P1)

Como estudiante, quiero explicaciones sin términos internos del sistema ni la respuesta revelada.

**Aceptación**:
1. **Dada** una calificación nueva, **cuando** se genera la explicación, **entonces** no menciona validación, clave oficial, verificador ni reparto.
2. **Dado** un cambio de puntos confirmado por el docente, **cuando** se actualiza la explicación del estudiante, **entonces** no se le añade la frase de reparto; la del docente la conserva.
3. **Dadas** unas claves no liberadas, **cuando** se genera la explicación o la orientación, **entonces** no dice cuál es la respuesta correcta.

### Casos límite

- La nota, el puntaje y la revisión docente no cambian.
- Los mensajes y explicaciones ya guardados no se reescriben, y los enlaces vigentes no se invalidan.
- Un enlace vigente sin foto la obtiene cuando el docente lo reactiva, lo reemplaza, lo copia o lo envía por WhatsApp o Compartir. Abrir una pantalla no se la activa, aunque esa pantalla recupere el enlace.
- Un enlace cerrado sigue ocultándolo todo, también si el cierre se descubre al pedir la foto.

## Requisitos

### Requisitos funcionales

- **FR-001**: Todo enlace nuevo, reactivado o reutilizado DEBE permitir ver la evidencia del estudiante si la entrega tiene archivo.
- **FR-002**: La pantalla de compartir NO DEBE ofrecer desactivar la foto, y DEBE indicar que el estudiante verá su propia entrega.
- **FR-003**: Volver a copiar un enlace NO DEBE fallar porque se creó sin foto.
- **FR-004**: En cada pregunta con orientación, el mensaje armado desde el desglose DEBE empezar por la acción y luego dar el motivo.
- **FR-005**: Las instrucciones de calificación y de reescritura DEBEN pedir primero la acción, con el error breve y al servicio de ella, y la meta en palabras sencillas si existe.
- **FR-006**: Las instrucciones DEBEN prohibir en el texto del estudiante términos internos del sistema, y revelar la respuesta si `orientar_sin_dar_respuesta` está activo.
- **FR-007**: El reparto de puntos NO DEBE añadir su frase a la explicación del estudiante.
- **FR-008**: Un mensaje con el aviso interno "Retroalimentación provisional" NO DEBE llegar al estudiante en enlaces nuevos.
- **FR-009**: El cambio NO DEBE alterar notas, puntajes ni mensajes guardados, ni invalidar enlaces vigentes.
- **FR-010**: La opción de ver la foto DEBE aparecer solo si la entrega tiene archivo, y una foto que no se puede abrir NO DEBE ocultar la nota ni el mensaje de un enlace vigente.
- **FR-011**: Abrir una pantalla docente NO DEBE activar la foto de un enlace vigente; solo una acción del docente sobre ese enlace.

## Criterios de éxito

- **SC-001**: Un enlace generado sin marcar nada muestra la foto de la entrega, en pruebas automáticas y en móvil.
- **SC-002**: En una muestra de entregas anónimas recalificadas sin guardar, ninguna explicación usa términos internos y cada pregunta con error empieza por la acción.
- **SC-003**: Los enlaces vigentes siguen abriendo igual después del despliegue.

# Especificación: Mostrar lo que anotó la IA, en la pregunta que nombra

**Rama**: `codex/213-notas-verificador-por-pregunta` | **Creada**: 2026-11-22 | **Estado**: Aprobada e implementada | **Issue**: [#447](https://github.com/Andres-back/Calificator/issues/447)

**Entrada**: el usuario pidió revisar CI y continuar con las mejoras. Es la mejora que sigue a la Spec 212: con esa spec, las notas del verificador ya no bloquean; ahora son la explicación de por qué se usó la valoración del modelo principal, y el docente no las veía.

## Hallazgo

- Las alertas del modelo principal y las notas del verificador llegaban al panel como texto libre. Como no eran un código conocido, el panel mostraba «Hay información que debes comprobar antes de confirmar la nota.», una vez por nota, sin su texto.
- La interfaz solo asociaba una nota a su pregunta si decía «pregunta 3». La IA casi siempre escribe «P3:» o «Q3». En producción, 373 de 428 notas del verificador del último mes nombran una pregunta.
- En la vista compacta del docente, los motivos de una pregunta en «atención» no se veían dentro de la pregunta (Spec 178). Tampoco el aviso de la Spec 212 («El verificador propuso…»).

## Escenarios de usuario y pruebas

### Historia 1 - El docente lee lo que anotó la IA (Prioridad: P1)

**Aceptación**:
1. **Dada** una nota del verificador o del modelo principal que nombra una pregunta («P3», «P. 3», «Q3», «pregunta 3»), **entonces** se muestra en esa pregunta con su texto y su autor.
2. **Dada** una nota sin pregunta, o con una pregunta que no está en el desglose, **entonces** se muestra como aviso general con su texto.
3. **Dada** una pregunta que solo pide atención, **entonces** sus notas se ven dentro de la pregunta, en «Notas de la IA».
4. **Dado** un texto técnico (código, HTTP, traza), **entonces** no se muestra; queda el aviso genérico.

### Historia 2 - Se sabe quién pidió revisión (Prioridad: P2)

**Aceptación**:
1. **Dado** que el modelo principal pidió revisión, **entonces** el aviso dice «El modelo principal pidió que revises esta calificación antes de confirmarla», no «la segunda revisión».
2. **Dado** que el verificador pidió revisión y dejó notas, **entonces** se muestran sus notas y no el aviso genérico.

## Requisitos

### Requisitos funcionales

- **FR-001**: Las notas DEBEN marcarse con su autor (`nota_principal:`, `nota_verificador:`) y mostrarse como «El modelo principal anotó: «…»» o «El verificador anotó: «…»».
- **FR-002**: `questionNumbersInAlert` DEBE reconocer «pregunta N», «P N», «P. N» y «Q N», igual que el backend.
- **FR-003**: Una nota que nombra una pregunta del desglose DEBE ir a esa pregunta y no repetirse como aviso general. Una pregunta segura con nota DEBE pasar a «atención». Las preguntas decididas por el docente no reciben notas nuevas.
- **FR-004**: `readableAiNote` DEBE descartar textos sin espacios, cortos o con señales de diagnóstico (HTTP, trace, exception, error_code, stack) y recortar a 280 caracteres.
- **FR-005**: En la vista compacta, las notas y el aviso del modelo principal DEBEN verse dentro de la pregunta, en «Notas de la IA».
- **FR-006**: La petición de revisión del modelo principal DEBE mostrarse con su propio mensaje (`principal_solicita_revision`), también en el historial.
- **FR-007**: El aviso de la Spec 212 DEBE usar singular con 1 punto.

## Criterios de éxito

- **SC-001**: Pruebas de calificaciones y componentes del frontend en verde, más las nuevas de la Spec 213.
- **SC-002**: La prueba simulada muestra las notas en el resumen y en la pregunta, sin desbordamiento, en 390 y 1366 px.

# Especificación: Reconocer fragmentos literales pertinentes en respuestas abiertas

**Rama**: `codex/073-fragmento-literal-respuesta-abierta`

**Creado**: 2026-09-25

**Estado**: Aprobado como hotfix

**Issue**: [#151](https://github.com/Andres-back/Calificator/issues/151)

## Escenario de usuario y pruebas

### Historia 1 - Respuesta correcta con conector natural (Prioridad: P1)

Como docente, quiero que una respuesta abierta reciba crédito cuando expresa literalmente la acción solicitada, aunque empiece con «para» y omita un complemento no pedido.

**Prueba independiente**: «para contarles a todos sobre su aventura» se valida frente a «Quería contarles a todos sobre su aventura en el aire»; «flotando en el cielo azul» no se valida como respuesta a «¿a qué se parecían las nubes?».

**Escenarios de aceptación**:

1. **Dado** un fragmento de al menos cuatro palabras contenido literalmente en la referencia, **cuando** solo está precedido por un conector permitido, **entonces** recibe puntaje objetivo.
2. **Dada** una pregunta comparativa de «¿a qué se parecía(n)?», **cuando** la respuesta contiene solo un modificador de la referencia, **entonces** no recibe puntaje objetivo.
3. **Dado** un caso ambiguo o no literal, **cuando** se valida, **entonces** permanece bajo evaluación de los modelos y revisión docente.

## Requisitos

- **FR-001**: El sistema DEBE retirar como máximo un conector inicial entre «para», «porque» o «que» antes de comparar.
- **FR-002**: El fragmento restante DEBE contener al menos cuatro palabras y aparecer completo en la referencia normalizada.
- **FR-003**: La regla NO DEBE aplicarse a preguntas que comiencen con «¿a qué se parecía?» o «¿a qué se parecían?».
- **FR-004**: La coincidencia DEBE integrarse a `objective_validation` y al puntaje mínimo existentes.
- **FR-005**: El hotfix NO DEBE confirmar, publicar ni modificar retroactivamente notas sin una acción explícita.

## Criterios de éxito

- **SC-001**: La respuesta productiva de la pregunta 5 recibe un punto verificable.
- **SC-002**: La respuesta incompleta de la pregunta 3 no recibe crédito por contener un modificador literal.
- **SC-003**: Las pruebas de calificación, gobernanza e inventario permanecen verdes.

## Supuestos

- La referencia oficial conserva literalmente el contenido correcto.
- Las coincidencias no inequívocas siguen requiriendo revisión docente.


# Especificación: Validar nombres literales en preguntas de quién

**Rama**: `codex/072-clave-literal-pregunta-quien`

**Creado**: 2026-09-25

**Estado**: Aprobado como hotfix

**Issue**: [#149](https://github.com/Andres-back/Calificator/issues/149)

## Escenario de usuario y pruebas

### Historia 1 - Identificación inequívoca de una persona (Prioridad: P1)

Como docente, quiero que una respuesta a “¿quién?” reciba crédito cuando comienza con el nombre propio correcto, aunque la referencia oficial esté redactada como una oración explicativa.

**Prueba independiente**: Con la referencia «El personaje principal es Nico, un niño…», la respuesta «Nico miró emocionado…» se valida como correcta; la misma regla no se aplica a una pregunta de «¿cómo se sentía?».

**Escenarios de aceptación**:

1. **Dado** un enunciado abierto que comienza con «¿quién?» y una referencia que contiene un nombre propio, **cuando** la respuesta comienza con ese nombre completo, **entonces** recibe el puntaje objetivo.
2. **Dado** un enunciado de «cómo», «qué», «cuándo» u otro tipo, **cuando** comparte un nombre con la referencia, **entonces** no se declara correcto por esa coincidencia.
3. **Dado** un nombre que solo aparece en medio de la respuesta, **cuando** se valida, **entonces** conserva la valoración de los modelos y la revisión humana.

### Casos límite

- La comparación ignora tildes y mayúsculas, pero exige palabras completas.
- Se omiten artículos y palabras introductorias de la referencia al extraer nombres propios.
- Una referencia sin nombre propio conserva el comportamiento conservador anterior.
- No se modifican notas confirmadas, ajustadas o publicadas.

## Requisitos

- **FR-001**: El sistema DEBE reconocer nombres propios literales contenidos en la referencia de una pregunta abierta de «quién».
- **FR-002**: La respuesta detectada DEBE comenzar con el nombre propio completo para recibir crédito objetivo.
- **FR-003**: La regla de nombres NO DEBE aplicarse a otros interrogativos.
- **FR-004**: La coincidencia DEBE quedar trazada en `objective_validation` e integrarse al puntaje mínimo existente.
- **FR-005**: El hotfix NO DEBE confirmar, publicar ni reescribir calificaciones históricas automáticamente.

## Criterios de éxito

- **SC-001**: El caso productivo «Nico miró emocionado…» se valida frente a la referencia explicativa que contiene «Nico».
- **SC-002**: Las respuestas semánticamente incorrectas a preguntas diferentes no reciben crédito por compartir un nombre.
- **SC-003**: Las pruebas de calificación y gobernanza permanecen verdes.

## Supuestos

- El nombre correcto aparece con mayúscula inicial en la referencia oficial.
- Los casos sin coincidencia inequívoca permanecen bajo revisión docente.


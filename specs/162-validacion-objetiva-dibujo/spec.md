# Especificación: La nota del dibujo no impide reconocer la opción marcada

**Rama**: `codex/162-validacion-objetiva-dibujo` | **Creada**: 2026-11-10 | **Estado**: Aprobada | **Issue**: [#344](https://github.com/Andres-back/Calificator/issues/344)

**Entrada**: una docente informó que algunas evaluaciones subidas por foto se calificaron mal, y pidió revisar y corregir el calificador.

## Evidencia

Consultas de solo lectura en producción, el 2026-11-10, sobre los últimos 60 días.

Desde el 2026-10-13 la lectura de la foto añade a cada respuesta una nota con lo observado en la hoja: `B) Planta` pasa a ser `B) Planta` seguido de `[Dibujo observado: La opción B está marcada con un círculo.]`. La comparación con la clave usa ese texto completo y falla. El calificador recibe "la validación la marcó incorrecta" junto a una respuesta que sí coincide, y deja la pregunta pendiente o sin puntos.

| Hallazgo | Medida |
| --- | --- |
| Calificaciones con la nota en la lectura | 155 |
| Respuestas correctas marcadas como "no coincide con la clave" | 831, en 146 calificaciones |
| De esas, las que el calificador igual dio por correctas | 692 |
| De esas, las que quedaron pendientes, sin evaluar o incorrectas | 131, en 45 calificaciones |
| Puntos sin reconocer por calificación afectada | de 0,21 a 4,0 |
| Docentes y evaluaciones afectadas | 9 y 16 |
| Calificaciones afectadas ya revisadas por su docente | 19 |
| Respuestas que la corrección pasa de correcta a otra cosa | 0 |

En la evaluación que originó el reporte, de 10 preguntas y nota máxima 5, siete calificaciones tienen entre 1 y 7 respuestas correctas sin puntaje. Una nota sugerida de 2,5 corresponde a una hoja con las 7 preguntas cerradas bien marcadas.

Un segundo defecto apareció al escribir las pruebas: en verdadero o falso, un texto como "Sin respuesta visible" se interpretaba como "Sí", es decir, Verdadero.

## Escenarios de usuario y pruebas

### Historia 1 - La opción bien marcada recibe su puntaje (Prioridad: P1)

Como docente, quiero que una opción marcada que coincide con la clave reciba su puntaje, para no tener que corregir a mano lo que el estudiante hizo bien.

**Aceptación**:
1. **Dada** una lectura con la nota del dibujo, **cuando** la opción leída coincide con la clave, **entonces** la pregunta queda correcta con su puntaje completo.
2. **Dada** una lectura con la nota del dibujo, **cuando** la opción leída no coincide con la clave, **entonces** sigue siendo incorrecta.
3. **Dada** una pregunta de verdadero o falso, **cuando** el estudiante escribe "V", "F" o marca la letra de la opción, **entonces** se compara con la clave.

### Historia 2 - Lo que no se entiende no cuenta como error (Prioridad: P1)

Como docente, quiero que una lectura dudosa llegue a mi revisión, sin que el sistema la dé por correcta ni por incorrecta.

**Aceptación**:
1. **Dada** una pregunta sin respuesta leída, con solo la nota del dibujo, **cuando** se compara con la clave, **entonces** no se registra ni acierto ni error y la valoran los calificadores.
2. **Dadas** dos marcas en verdadero o falso, **cuando** se compara con la clave, **entonces** no se registra acierto.
3. **Dado** un texto como "Sin marca" o "No se observa", **cuando** se compara con la clave, **entonces** no se interpreta como "Sí" ni como "No".

### Casos límite

- Las calificaciones ya guardadas no cambian. Corregirlas es un paso aparte, que el usuario decide.
- La lectura completa, con su nota, se sigue guardando y mostrando al docente.
- No cambia el camino nuevo de validación objetiva, que sigue apagado en producción y no usa ese texto.

## Requisitos

### Requisitos funcionales

- **FR-001**: La comparación con la clave DEBE usar solo la respuesta leída, sin la nota del dibujo, en todos los tipos de pregunta que se comparan.
- **FR-002**: Una lectura vacía, con dos marcas o que no se entiende NO DEBE registrarse como correcta ni como incorrecta.
- **FR-003**: En verdadero o falso, "sí" y "no" DEBEN reconocerse como palabras completas, y DEBEN aceptarse "V", "F", la opción con su letra y la letra sola cuando la pregunta tiene sus dos opciones.
- **FR-004**: El cambio NO DEBE modificar notas, desgloses ni entregas guardadas.

## Criterios de éxito

- **SC-001**: Al repetir la comparación sobre las 155 calificaciones reales, las 831 respuestas pasan a correctas y ninguna correcta deja de serlo.
- **SC-002**: Las pruebas existentes del calificador siguen pasando.

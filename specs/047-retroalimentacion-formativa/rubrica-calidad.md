# Rúbrica de calidad de retroalimentación — XCalificator

**Versión propuesta**: `feedback-quality-es-v1-draft`
**Estado**: Borrador pendiente de revisión del asesor y calibración; no validado.
**Unidad propuesta**: Paquete de retroalimentación de un trabajo: mensaje general y orientaciones por pregunta. Si se elige evaluar por respuesta, fijarlo antes de recolectar y mantenerlo en toda la muestra.

Evalúa el mensaje, no la nota del estudiante, la confianza de IA ni la satisfacción docente. Aplicar al feedback manual y asistido con la misma referencia de evidencia y criterios.

## Descriptores

| Dimensión | 1 — Deficiente | 2 — Limitada | 3 — Aceptable | 4 — Buena | 5 — Muy buena |
|---|---|---|---|---|---|
| Corrección | Contradice evidencia o criterios; contiene errores importantes. | Tiene errores que requieren corrección sustancial. | Mayormente correcta, con alguna imprecisión u omisión relevante. | Correcta y coherente; omisiones menores que no desorientan. | Correcta, fundamentada y reconoce incertidumbre cuando la evidencia no permite concluir. |
| Especificidad | Genérica, sin vínculo identificable con el trabajo. | Menciona dificultad sin ubicarla. | Identifica algún aspecto concreto, dejando otros relevantes sin precisar. | Vincula observaciones con respuestas, procedimientos o criterios. | Identifica aciertos y errores relevantes con referencias verificables, sin repeticiones innecesarias. |
| Claridad | Incomprensible o contradictoria. | Requiere aclaraciones frecuentes por ambigüedad o desorden. | Idea principal comprensible, con indicaciones ambiguas. | Comprensible, ordenada y concisa. | Explica razonamiento y acciones inequívocamente y facilita aplicarlas. |
| Utilidad | Sin orientación válida para avanzar. | Consejos vagos como «estudia más». | Acción pertinente, pero incompleta o poco concreta. | Acciones realizables ligadas a errores o aspectos por profundizar. | Prioriza acciones y cómo verificar la mejora; si todo es correcto, propone profundización pertinente sin inventar defectos. |
| Adecuación | Tono irrespetuoso o contenido incompatible con el grado. | Lenguaje o exigencias requieren adaptación sustancial. | Respetuosa y generalmente apropiada, con desajustes de nivel. | Lenguaje, tono y exigencia adecuados al grado y contexto. | Además favorece autonomía y cumple preferencias pedagógicas aprobadas, sin estigmatizar ni inventar rasgos del estudiante. |

## Aplicación

1. Revisar evidencia anonimizada, preguntas y criterios de referencia acordados.
2. Evaluar la versión definida por el protocolo: propuesta inicial o final revisada. No mezclarlas.
3. Elegir un nivel por dimensión y justificarlo con un ejemplo breve.
4. Si hay duda entre niveles, elegir el mejor ajuste al conjunto; si persiste, documentar duda y justificar el inferior.
5. `blinded=true` solo si realmente se ocultó el origen al puntuar; si se conocía o hay duda, usar `false` y documentarlo.
6. No utilizar confianza de IA como puntuación de calidad.
7. Feedback ausente/no evaluable: incidencia y dato faltante con motivo, no puntuación cero ni observación inventada.

## Ficha

- Código del revisor:
- Código del trabajo:
- Fecha:
- Unidad: trabajo / respuesta (fijada por protocolo):
- Versión evaluada: propuesta inicial / final revisada:
- Instrumento: `feedback-quality-es-v1-draft`
- ¿Se ocultó el origen?: sí / no / no se puede asegurar.

| Campo compatible | Puntaje 1–5 | Ejemplo o justificación |
|---|---|---|
| `correccion` | | |
| `especificidad` | | |
| `claridad` | | |
| `utilidad` | | |
| `adecuacion` | | |

El contrato vigente admite cinco enteros 1–5, `instrument_version` y `blinded`. Justificaciones y versión evaluada se conservan en esta ficha o registros del protocolo; no añadir claves al payload estricto sin cambio aprobado.

## Resumen e incidencias

Promedio descriptivo = suma de las cinco puntuaciones / 5. Presentar también dimensiones, número de observaciones, fallos y datos faltantes. El promedio no acredita validez ni oculta errores importantes.

- Error pedagógico importante: sí/no. Descripción:
- Atribución sin evidencia: sí/no. Descripción:
- Orientación contradictoria con criterios: sí/no. Descripción:
- Observaciones/desacuerdos entre revisores:

No mezclar unidades por trabajo y por pregunta como independientes equivalentes. Separar propuesta inicial de feedback revisado para identificar el aporte docente.

## Antes de recolectar datos definitivos

- Revisión del asesor y un docente del área.
- Probar ejemplos manuales y asistidos de distinta calidad, preguntas abiertas y evidencia ilegible.
- Dos revisores califican un subconjunto independientemente; documentar desacuerdos y aclarar anclajes.
- Definir unidad, versión evaluada y análisis de acuerdo con el asesor.
- Registrar aprobación y fijar versión definitiva, sin cambiar descriptores silenciosamente durante el estudio.

## Regla incorporada tras el primer piloto

Una retroalimentación no puede superar nivel 1 en **Corrección** si afirma que todas las respuestas son correctas mientras la evidencia, el desglose o un verificador marcan una respuesta incorrecta, distinta o pendiente. Tampoco puede compensarse ese error con buen tono, extensión o motivación. Debe registrarse como error pedagógico importante y excluirse de publicación hasta revisión docente.

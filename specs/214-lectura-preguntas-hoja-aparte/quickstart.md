# Validación: Preguntas en hoja aparte en el PDF de cuentos y lecturas

## Pruebas

```
python -m pytest backend/tests/unit/test_lectura_preguntas_hoja_aparte.py backend/tests/unit/test_herramientas_pdf_imprimibles.py backend/tests/unit/test_herramientas_pdf_total.py -q
  En Windows, sin WeasyPrint: 39 passed, 5 skipped
  En el contenedor de pruebas, con WeasyPrint y PyMuPDF: 44 passed
```

Antes del cambio, el archivo nuevo no se podía importar: faltaba `_answer_lines`. Las cinco pruebas que se saltan en Windows son las de PDF real; corren en CI y en el contenedor.

En local, el contenedor se usa así, sin base de datos ni IA:

```
docker run --rm -e PYTHONPATH=/app -v <worktree>/backend/app:/app/app:ro -v <worktree>/backend/tests:/app/tests:ro xcal-audit-worker ...
```

## PDF reales revisados a la vista

Contenido de prueba, sin datos de nadie. «T» es una hoja con texto de la lectura y «P» una hoja con preguntas.

| Caso | Hojas | Reparto |
| --- | --- | --- |
| Lectura corta, 4 preguntas | 2 | T, P |
| Lectura de varias hojas, 4 preguntas | 4 | T, T, T, P |
| Lectura corta, 14 preguntas | 5 | T, P, P, P, P |
| Cuento con ilustración, 4 preguntas | 2 | T, P |
| Cuento sin ilustración, 4 preguntas | 2 | T, P |
| Solucionario de la lectura corta | 2 | texto, respuestas |

- Ninguna hoja mezcla el texto con las preguntas, y ninguna pregunta quedó partida entre dos hojas.
- En la lectura corta, las cuatro preguntas recibieron 2, 4, 5 y 8 renglones: la de una palabra, dos; la de opinión, ocho.
- La hoja de preguntas del estudiante empieza con «Nombre:». El solucionario no la trae y muestra respuesta, evidencia y porqué en lugar de renglones.

## Hallazgo durante la validación

Al extraer el texto de un PDF, la marca de la cabecera y el pie de página caen al final de cada hoja. En una lectura de varias hojas quedan en medio de la oración que se parte entre dos hojas, y la prueba contaba una oración menos. No se perdía texto: la prueba ahora descuenta esas dos marcas antes de contar.

## Sin efecto en datos

- Ninguna migración ni escritura. El PDF se arma al descargarlo, así que un recurso guardado sale con el formato nuevo sin que su contenido cambie.
- Solo cambian `cuento` y `lectura_comprensiva`. Las pruebas de los demás recursos siguen pasando.

## Manual, después del despliegue

1. Abrir una lectura comprensiva guardada y descargar el PDF: el texto termina en una hoja y las preguntas empiezan en la siguiente, con «Nombre:» arriba.
2. Descargar el solucionario: mismas hojas, con las respuestas y sin renglones.
3. Descargar un cuento con ilustración: la ilustración, el relato y la moraleja en la primera hoja; las preguntas en la segunda.

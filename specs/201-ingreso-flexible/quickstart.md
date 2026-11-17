# Validación: Llenar campos sin digitar, desde una foto o un archivo

## Pruebas

```
python -m pytest tests/unit/test_captura_texto.py -q                      8 pasan
npx vitest run src/components/capture src/modules/evaluaciones            274 pasan (6 nuevas)
ruff, tsc --noEmit y eslint                                               sin errores
```

## Prueba real en local (modelo económico de producción)

| Archivo | Resultado |
| --- | --- |
| Foto JPG de un texto impreso, algo girada | 200 en 4,1 s; título y párrafo completos |
| Word con párrafo y tabla | 200; párrafo y filas «Palabra \| Significado» |
| Excel con lista | 200; una fila por línea |
| Texto con tildes | 200; igual al original |
| PDF escaneado de una hoja | 200 en 4,3 s; mismo texto que la foto |
| Ejecutable | 415 con la lista de formatos admitidos |
| Sin sesión | 401 |

## Pantalla (390 px)

Editar evaluación → «Lectura o texto de apoyo»: aparecen «Tomar foto» y «Subir archivo» y la nota «También puedes pegar el texto». Al subir la foto, el campo queda con la lectura y se muestra «Listo: se añadió la lectura desde la foto. Revísalo antes de guardar.» Sin desborde ni errores de consola.

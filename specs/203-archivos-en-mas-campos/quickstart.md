# Validación: Foto o archivo también en criterios de aprendizaje e instrucciones

## Pruebas

```
npx vitest run src/components/capture src/modules/herramientas src/modules/presentaciones src/modules/materias     266 pasan (4 nuevas)
tsc --noEmit, eslint y ruff de lo tocado                                                                          sin errores
```

## Qué cubren las pruebas nuevas

- La variante compacta muestra «Tomar foto» y «Subir archivo» y omite la nota de formatos.
- En las instrucciones de un recurso, el texto leído se añade debajo de lo escrito.
- Un texto leído de 7.000 caracteres queda en 6.000.

## Lectura de archivos

La subida de criterios usa el mismo lector de la Spec 201, ya probado en real con foto, Word, Excel, texto y PDF escaneado. La generación de sugerencias a partir de una foto no se probó de punta a punta en esta entrega.

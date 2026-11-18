# Validación: Foto o archivo también en criterios de aprendizaje e instrucciones

## Pruebas

```
npx vitest run src/components/capture src/modules/herramientas src/modules/presentaciones src/modules/materias     266 pasan (4 nuevas)
python -m pytest tests/unit/test_dba_subida_indexado.py tests/unit/test_captura_texto.py                          17 pasan (9 nuevas)
tsc --noEmit, eslint y ruff de lo tocado                                                                          sin errores
```

## Qué cubren las pruebas nuevas

- La variante compacta muestra «Tomar foto» y «Subir archivo» y omite la nota de formatos.
- En las instrucciones de un recurso, el texto leído se añade debajo de lo escrito.
- Un texto leído de 7.000 caracteres queda en 6.000.
- Sin servicio de búsqueda semántica el documento queda sin indexar y no se pierde la respuesta.
- La plantilla local de respaldo y la IA sin respuesta se informan como servicio no disponible.
- Evidencias en lista se unen en un texto; se devuelven como máximo cinco sugerencias.
- La tarea de sugerencias resuelve la ruta de las herramientas del docente.

## Recorrido real (entorno local, 390 px y 1280 px)

| Lugar | Resultado |
| --- | --- |
| Instrucciones de un recurso | botones visibles, texto de un `.txt` añadido al campo, sin desborde |
| Instrucciones de una presentación | botones visibles, sin desborde |
| Criterios de aprendizaje, foto de una página | 3 sugerencias con enunciado, evidencias y ejemplo |

Antes de los arreglos, la misma foto terminaba en error 500 (servicio de búsqueda semántica no disponible en local) y, resuelto eso, en «Sin sugerencias» porque el modelo por defecto del proveedor ya no está incluido en su plan y la respuesta venía de la plantilla local.

## Pendiente fuera de esta entrega

El modelo por defecto del proveedor y cuatro rutas de IA antiguas siguen apuntando a ese modelo no incluido. Es configuración del panel de administración, no código; se reporta al responsable.

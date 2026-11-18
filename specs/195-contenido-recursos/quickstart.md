# Validación: Recursos fieles al tema que pidió el docente

## Pruebas

```
python -m pytest tests/unit -q -k "herramient or material or puzzle or tool"    206 pasan (11 nuevas)
python -m ruff check app/modules/herramientas                                    sin errores
```

## Pruebas reales (modelo económico de producción, sin escribir en la base)

| Recurso | Tema | Pedido | Resultado |
| --- | --- | --- | --- |
| Pares | Animales vertebrados e invertebrados | 6 | 6 parejas; una categoría distinta por animal |
| Pares | Regiones naturales de Colombia | 6 | 6 parejas; una región por lugar |
| Pares | Figuras geométricas | 5 | 5 parejas; definiciones distintas |
| Pares | Figuras literarias | 6 | 6 parejas; definiciones distintas |
| Crucigrama | El sistema digestivo humano | 8 | 8 palabras, ninguna sin ubicar |
| Crucigrama | La independencia de Colombia | 6 | 6 palabras, ninguna sin ubicar |

Antes del cambio, la misma prueba de animales devolvió «Invertebrado» y «Sin columna vertebral» como respuestas distintas, y el crucigrama de 8 palabras salió con 10.

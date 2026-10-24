# Brief de veinte motivos transparentes

**Estado**: veinte PNG finales generados e integrados el 2026-10-24, tras la aprobación del plan.

## Estilo común

Ilustraciones escolares pequeñas, inclusivas y adecuadas para primaria/secundaria: contornos claros, pocos detalles y acentos de color moderados. Sin texto, letras, números, logos, marcas de agua, premios o referencias a rendimiento. Sujetos aislados con transparencia alfa real: ningún rectángulo blanco, degradado, sombra de fondo o tablero de transparencia dibujado. Legibles también en escala de grises; no dependen de un relleno de color para entenderse.

Uso: esquina de cabecera de una ficha para recortar. Debe seguir siendo reconocible a unos 20 mm; la ilustración no forma parte de la nota ni del mensaje. No usar datos, fotos ni nombres de estudiantes en prompts. No generar diseños completos de ficha ni texto académico dentro de imágenes.

## Catálogo

1. `libro`: libro abierto y pequeño separador.
2. `lapices`: dos lápices y una goma.
3. `idea`: bombilla con trazos breves de luz.
4. `cohete`: cohete escolar sencillo sin insignias.
5. `planeta`: planeta con anillo y pequeña estrella.
6. `microscopio`: microscopio de mesa sencillo.
7. `atomo`: modelo esquemático de átomo como símbolo decorativo, no diagrama científico para evaluar.
8. `calculadora`: calculadora sin texto ni números legibles.
9. `geometria`: regla y compás sin graduaciones numéricas.
10. `globo`: globo terrestre escolar, sin etiquetas ni afirmaciones cartográficas detalladas.
11. `brote`: planta pequeña con dos hojas.
12. `origami`: grulla de papel geométrica.
13. `montana`: dos montañas y un sol pequeño, contorno aislado.
14. `olas`: tres curvas de olas y un pez sencillo.
15. `brujula`: brújula con aguja sin letras.
16. `cometa`: cometa de papel con cola corta.
17. `musica`: dos notas musicales y una pequeña línea curva.
18. `piezas`: dos piezas de rompecabezas unidas.
19. `telescopio`: telescopio con trípode.
20. `arte`: pincel y paleta sin letras.

## Producción prevista

Imagegen incorporado, una llamada por asset, `transparent_background=true`; no usar la API ni claves de producción. Cada prompt utiliza el brief común y únicamente el sujeto correspondiente. No sustituir una ilustración por veinte cambios de color del mismo dibujo. Guardar cada resultado final dentro del proyecto y registrar prompts y procedencia; no dejar referencias a archivos fuera del workspace.

## Comprobación antes de integrar

- Veinte identidades distintas, filenames estables y manifiesto completo.
- Alfa no totalmente opaca, esquinas transparentes y ausencia visual de fondo blanco/cuadriculado.
- Sin texto inventado ni detalles que sugieran una nota, premio o castigo.
- Hoja de contacto revisada y muestra a tamaño real en fichas A4/Carta.
- Medir peso y dimensiones; carga diferida en galería y solo el motivo usado en cada ficha. Ningún asset remoto ni generación durante la impresión.
- La opción sin decoración conserva todo el contenido y no descarga estos archivos.

## Resultado de producción de assets

Se utilizó imagegen incorporado, veinte llamadas independientes con transparencia, sin claves de producción ni datos académicos. Los prompts y basenames de origen están registrados en `generated-prompts.json`. No hay llamadas de generación durante el uso de la aplicación.

Los originales se conservaron localmente en `output/imagegen/spec122-originals/`. Las copias web se redujeron mecánicamente con FFmpeg, manteniendo proporciones y canal alfa: dimensión mayor de 320 px y 1.243.439 bytes en conjunto (antes, 16.307.121). No se recreó ni alteró el contenido de los dibujos durante esa optimización.

La prueba `test_feedback_motifs.py` verifica veinte archivos distintos, RGBA, esquinas transparentes, alfa variable y presupuesto de tamaño. Se inspeccionó la galería completa sobre temas claro/oscuro y muestras físicas de 24 mm en las fichas A4/Carta, también renderizadas en grises. Sin rectángulos blancos, texto inventado, emblemas de recompensa ni superposición sobre las recomendaciones. Algunas ilustraciones tienen acentos claros semitransparentes propios del dibujo, no un fondo opaco.

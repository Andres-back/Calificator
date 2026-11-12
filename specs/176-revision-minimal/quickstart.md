# Validación: Vista por pregunta sin ruido y con la zona siempre a la vista

## Pruebas

```
npx vitest run src/modules/calificaciones
  43 archivos, 359 pruebas: pasan

npx vitest run            (frontend completo)
  209 archivos, 1572 pruebas: pasan

npx tsc --noEmit -p .  y  npx eslint src
  sin errores ni avisos
```

Antes de la corrección fallaban los tres casos de «176 si … pide la hoja con su versión y conserva la zona»: el visor mostraba «No pudimos comprobar». El backend no cambia.

## Diagnóstico del aviso en producción (solo lectura)

| Comprobación | Resultado |
| --- | --- |
| Registros del proxy a la hora de la captura | Peticiones de la hoja con `evidencia_version`: 200, 1,7 MB, mismo tamaño que la hoja sin versión. |
| Código publicado | La comprobación exige versión, hoja y `image/png` exactos. |
| Backend con Starlette 1.3.1 y uvicorn 0.34, como producción | La respuesta trae `x-evidence-version`, `x-evidence-page: 1` y `content-type: image/png`. |
| Dominio público | Una imagen PNG sale como `image/png`, sin transformación, y las cabeceras `X-` pasan. |

No se encontró qué rechaza la respuesta en el navegador del docente. El cambio deja de depender de ello.

## Comprobación en el navegador (2026-11-12)

Aplicación local con el backend de `main`, un docente de prueba y una nota de cinco preguntas con una hoja vertical. La ventana de vista previa no pudo capturar imágenes, así que los resultados son medidas leídas de la página.

| Pantalla | Resultado |
| --- | --- |
| Pregunta sin zona, 1440 × 900 px | La hoja abre a 214 %, con 752 px de ancho y pegada arriba, en un marco de 752 × 468 px. Antes abría a 100 %. |
| Barra del visor, 1440 px | Nombre de la hoja y controles en la misma fila; cinco botones de 44 × 44 px con nombre accesible; instrucciones fuera de la vista. |
| Cabecera de la nota | «2 por revisar». |
| Recorrido «Anterior · N de M · Siguiente», 1440 px | Sin fondo. |
| Teléfono, 360 px | Sin desplazamiento horizontal; marco de 306 × 256 px; la hoja abre a 159 %; instrucciones a la vista; «2 por revisar» visible. |

## Corrección tras la primera CI

La prueba E2E «131 ubicación verificada con zoom y texto ampliado» falló: con texto al 150 % y una ventana de 844 × 390 px, el marco del visor ampliado se montaba sobre el botón «Volver a la respuesta». El contenedor del visor ampliado podía encogerse por debajo de su contenido; ya no puede, y el diálogo se desplaza. Reproducida y corregida en local; las 124 pruebas E2E de calificaciones (`grade-evidence-review`, `explainable-grading`, `grade-review-mobile`, `grade-direct-review`, `grade-review-triage`) pasan en Chromium, tres de ellas al segundo intento en un equipo con el disco lleno.

## Lo que no se comprobó

- **Que el aviso desaparezca en producción.** Es el objetivo principal y solo se puede ver allí.
- El aviso «Conviene comprobar» en una línea con datos reales: la nota local no tiene preguntas con ese aviso; lo cubren las pruebas unitarias.
- El aspecto en una captura: la vista previa no dibujó.
- Las pruebas de extremo a extremo; corren en la CI.

## Después de desplegar

1. Recargar y abrir la misma nota de la captura: la pregunta 1 debe mostrar la hoja con el recuadro, sin el aviso.
2. Abrir una nota sin zonas: la hoja debe abrir al ancho del visor.
3. Entrar a cualquier nota de una evaluación con pendientes: la cabecera debe decir cuántas quedan.

# Plan: «Editar hojas» fácil para cualquier edad

**Spec**: [spec.md](spec.md) | **Issue**: [#456](https://github.com/Andres-back/Calificator/issues/456)

## Decisión

Solo frontend. Sin migraciones, sin IA y sin cambios en lo que se envía al servidor.

- `components/ui/Modal.tsx`: con `fullScreen`, la capa se dibuja con `createPortal` en `document.body`. Dentro de otro diálogo, el `backdrop-filter` de `.glass` crea un bloque contenedor para los elementos fijos y encerraba la capa en la caja de atrás. Al quedar al final del documento sigue siendo el diálogo de encima, que es lo que usan el foco y la tecla Escape. Hoy lo usan «Preparar hoja» y el nuevo visor de la hoja.
- `calificaciones/components/EvidenceEditDraft.tsx`: botones con icono y texto (dos columnas en celular, cuatro en computador), miniatura de 72 × 96 px que abre `SheetViewer` (visor a pantalla completa), «Deshacer» tras quitar y estados «Sin cambios», «Girada o recortada», «Foto nueva».
- `calificaciones/components/GradeReprocessing.tsx`: frase con lo que falta para guardar (`evidence-edit-save-hint`) y confirmación en dos líneas. El texto empieza igual («Confirmo guardar las hojas…»), así las pruebas y los lectores de pantalla siguen encontrándolo.

## Alternativas descartadas

- Dibujar todos los diálogos en el documento: arreglaría lo mismo, pero cambia el lugar de decenas de diálogos y sus pruebas. Solo los de pantalla completa lo necesitan.
- Un botón «Girar» en la lista: el giro de una hoja guardada viaja con la receta del editor; hacerlo fuera necesita cambiar el modelo del borrador y revisar el servidor.

## Riesgos

- Una prueba que busque el editor dentro de su contenedor deja de encontrarlo; `EvidenceScanEditor.test.tsx` pasa a buscarlo en el documento.

## Verificación

Pruebas unitarias, de extremo a extremo en celular y computador, y axe. Ver [quickstart.md](quickstart.md).

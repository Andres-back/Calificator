# Plan: Vista por pregunta sin ruido y con la zona siempre a la vista

**Spec**: [spec.md](spec.md) | **Issue**: [#372](https://github.com/Andres-back/Calificator/issues/372)

## Diagnóstico

- `VersionedEvidence` pide la hoja con `fetch`, y solo la muestra si la respuesta trae `X-Evidence-Version`, `X-Evidence-Page` y `Content-Type: image/png` exactos. Cualquier otra cosa, incluida una lectura que falla, termina en «No pudimos comprobar…».
- En producción la petición llega al servidor y responde 200 con el archivo completo, pero el docente ve ese aviso. No se pudo reproducir fuera de su navegador: el backend con las versiones de producción y el proxy público entregan las cabeceras correctas.
- El servidor ya garantiza la versión: con `evidencia_version` en la dirección responde 409 si no es la vigente.
- El visor abre siempre con la hoja completa; una hoja vertical en un marco ancho queda pequeña.
- En la vista por pregunta, el aviso de prioridad usa una caja con borde para los dos niveles.
- Al entrar a una nota, la columna de la lista, con sus contadores, se oculta.

## Decisión

Solo frontend.

**Zona.** La comprobación previa distingue dos resultados:

- *La evidencia cambió*: respuesta 409, o cabecera de versión u hoja presente y distinta. Se conserva el aviso y la lectura manual.
- *No concluyente*: la lectura falla, faltan cabeceras o el tipo no es una imagen. El visor pide la hoja con su dirección versionada y dibuja la zona. Si esa versión no fuera la vigente, el servidor no entrega la imagen y el visor ofrece reintentar.

**Apertura.** `fitEvidenceWidth` calcula la vista ajustada al ancho, desde arriba, con tope de 2,5 aumentos. La usa solo el visor de una respuesta, sin zona y sin ampliar. «Ver hoja completa» vuelve a 100 %.

**Ruido.**

- «Conviene comprobar» pasa a una línea de texto con icono; «Revisión prioritaria» conserva su caja.
- El nombre de la hoja y los controles comparten fila; girar, hoja completa y ampliar son iconos con su `aria-label`. Las instrucciones quedan solo para lectores de pantalla desde 1024 px.
- En el índice, cada pregunta muestra número y puntos; el estado pasa al título y sigue en la descripción accesible.
- La barra «Anterior · N de M · Siguiente» pierde su fondo en ordenador.

**Pendientes.** `ReviewContextNavigation` recibe `pendingCount` y muestra «N por revisar» cuando es mayor que cero. El dato es el contador que ya trae la lista de la evaluación.

Descartado:

- **Quitar la comprobación previa y pedir siempre la imagen directa**: la comprobación sigue siendo la única que distingue «la evidencia cambió» de «la imagen no cargó».
- **Cambiar qué preguntas reciben «Conviene comprobar»**: es una regla de revisión con sus propias specs; aquí solo cambia cuánto ocupa.
- **Ajustar al ancho también la vista «Evidencia»**: la Spec 174 la dejó a alto de pantalla a pedido del usuario.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `frontend/src/modules/calificaciones/components/GradeQuestionEvidence.tsx` | comprobación tolerante |
| `frontend/src/modules/calificaciones/components/GradeEvidenceViewer.tsx`, `evidenceViewport.ts` | apertura al ancho, barra en una fila |
| `frontend/src/modules/calificaciones/components/GradeBreakdown.tsx` | aviso en una línea, índice y recorrido |
| `frontend/src/modules/calificaciones/ReviewContextNavigation.tsx`, `CalificacionesWorkspace.tsx` | contador de pendientes |

## Riesgos

- **La causa del rechazo en producción no se identificó.** El cambio hace que ya no dependa de ella, pero solo se confirma en producción.
- **Zona sobre una hoja que no corresponde**: no puede ocurrir mientras el servidor valide la versión de la dirección, que es su comportamiento actual en las dos rutas de evidencia.
- **Pruebas de extremo a extremo** que miran el visor por pregunta: se confirman en la CI.

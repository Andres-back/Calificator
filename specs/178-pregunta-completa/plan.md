# Plan: La pregunta completa a la vista y el aviso se va al entrar

**Spec**: [spec.md](spec.md) | **Issue**: [#376](https://github.com/Andres-back/Calificator/issues/376)

## Diagnóstico

- `focusEvidenceRegion` amplía hasta que la zona, con un margen del 3 %, llena el marco, con tope de 8 aumentos. La zona que guarda el lector es la marca o la fila de la respuesta, no la pregunta entera.
- `GradeBreakdown` muestra el aviso de prioridad dentro de la pregunta para los niveles «Conviene comprobar» y «Revisión prioritaria», y pinta el índice según el nivel, sin memoria de lo ya abierto.
- `ReviewContextNavigation` muestra `pendingCount` desde la Spec 176.

## Decisión

Solo frontend.

**Enfoque.** `focusEvidenceRegion` acepta un tope de ampliación. El visor usa `ANSWER_FOCUS_MAX_ZOOM = 2,5` al abrir, al pulsar «Ver zona sugerida» y al pulsar la respuesta. El recuadro sigue marcando la zona exacta. Los controles manuales conservan su tope de 8.

A 250 % una hoja vertical ocupa aproximadamente el ancho del visor en ordenador: se ve la pregunta con sus opciones y parte de las vecinas.

**Aviso.**

- Dentro de la pregunta solo se muestra la caja de «Revisión prioritaria».
- El índice presenta como «sin avisos» una pregunta de nivel «Conviene comprobar» cuando está abierta o ya se abrió. Lo visto se guarda en `sessionStorage` por identificador de desglose.
- `data-review-priority` y el nombre accesible conservan el nivel real; se añade `data-review-seen`.

**Cabecera.** Se retira `pendingCount` de `ReviewContextNavigation` y de su uso.

**Foco.** El contenedor de la pregunta recibe el foco por programa para lectores de pantalla; se le quita el contorno, que dibujaba un marco negro alrededor de toda la pregunta.

Descartado:

- **Ampliar la zona guardada para abarcar la pregunta**: exige cambiar lo que pide el lector y recalificar; el tope de ampliación da el mismo resultado sin tocar datos.
- **Marcar la nota como revisada en el servidor al abrirla**: abrir no es decidir; «Requiere revisión» en la lista sigue dependiendo de confirmar o ajustar.
- **Quitar también «Revisión prioritaria» al entrar**: señala algo que impide confirmar la nota.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `frontend/src/modules/calificaciones/components/evidenceViewport.ts`, `GradeEvidenceViewer.tsx` | tope de enfoque |
| `frontend/src/modules/calificaciones/components/GradeBreakdown.tsx` | aviso, índice visto, foco |
| `frontend/src/modules/calificaciones/ReviewContextNavigation.tsx`, `CalificacionesWorkspace.tsx` | sin contador |

## Riesgos

- **Zonas muy pequeñas en hojas densas**: a 250 % la marca puede verse pequeña; el recuadro la señala y «Acercar» sigue disponible.
- **Lo visto es por navegador y sesión**: en otro dispositivo las marcas vuelven a aparecer.
- **Pruebas de extremo a extremo** que leen la prioridad del índice: conservan nombre y atributo; se confirman en la CI.

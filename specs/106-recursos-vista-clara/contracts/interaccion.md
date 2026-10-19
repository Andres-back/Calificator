# Contrato de interacción y operaciones preservadas

## Acciones por superficie

| Superficie | Acciones principales | Secundarias / restricciones |
| --- | --- | --- |
| Biblioteca / materia | Ver recurso; Asignar o Abrir actividad cuando corresponda | Más: editar, duplicar, eliminar, descarga según contexto/permisos. Nunca botones anidados dentro de enlaces. |
| Detalle | Editar; Asignar/Abrir actividad; Descargar | Más: compartir, duplicar, visibilidad, eliminar. Si una acción no está autorizada no ocupa un control activo. |
| Descargar | PDF para estudiantes; Solucionario docente autorizado | No elegir ni descargar al abrir; diferenciar imprimir sin incorporar administración/soluciones accidentales. |
| Editor | Guardar; Cancelar; Listo al escribir en móvil | Error no borra valores; discard confirmado; controles no se superponen a campo activo. |

## Operaciones existentes

- GET /herramientas con tipo/limit/offset, GET /herramientas/materias/{id}/recursos y GET /herramientas/{id}: mismos datos y autorización.
- GET /herramientas/{id}/evaluaciones: contrato existente de autoría; solo arreglo válido en respuesta exitosa para cuenta/recurso actual permite inferir autor. No usar su error para impedir lectura autorizada.
- GET /herramientas/{id}/pdf con soluciones=false/true y descargar opcional: mismos documentos, respuesta y comprobación autor-only de solucionario.
- PATCH /herramientas/{id}, POST duplicar/asignar-apoyo/convertir-evaluacion, PATCH visibilidad y DELETE: mismos cuerpos, confirmaciones y reglas. Convertir requiere resources.assign y evaluations.create. Ninguna operación se dispara al ver, filtrar, plegar o abrir menú.

| Acción | Condiciones mínimas de interfaz |
| --- | --- |
| Leer / PDF estudiante | resources.read y lectura aceptada por servidor |
| PDF solucionario | resources.read + autoría confirmada |
| Editar | resources.update + autoría confirmada |
| Duplicar | resources.create + autoría confirmada |
| Borrar | resources.delete + autoría confirmada + confirmación separada |
| Apoyo / visibilidad | resources.assign + autoría confirmada + estado compatible |
| Actividad | resources.assign + evaluations.create + autoría confirmada + estado compatible |

Estas condiciones no sustituyen servidor ni crean bypass de administrador. Apoyo con solución interactiva mantiene su comportamiento; no equivale a acceso al PDF solucionario. Exportar la evaluación vinculada mantiene su política propia y no se mezcla con PDF de recurso.

## Foco, espacio y errores

- Foco visible, navegación por teclado, cierre/restauración de menús y editor, controles 44×44 px y entradas móviles 16 px. Tolerancia de medición solo por redondeo subpíxel (0,001 px), no para controles realmente menores.
- Scroll local de documentos/juegos anchos identificado; no overflow de página. Sin panel administrativo fijo sobre lectura ni pie que tape teclado.
- Carga, 403/404 y fallo de red diferenciados. El borrador de edición y filtros no se descartan por un fallo recuperable; cuenta nueva no hereda contenido ni avisos con datos anteriores.
- Compartir enlace canónico interno sin action=edit/assign ni contenido; no publica ni concede acceso. Recurso publicado utiliza ruta de lectura estudiantil existente, preservando la autorización final.

Estos contratos se verifican con pruebas sintéticas del frontend y pruebas backend existentes; resultados y límites en quickstart.md. No autorizan modificaciones de backend ni sustituyen sus guardas.

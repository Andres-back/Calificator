# Contratos de biblioteca y consumidores

Contrato aditivo implementado y comprobado localmente. Las rutas se registran bajo el prefijo API existente; no sustituyen la biblioteca privada de imágenes ni rutas visuales de evaluaciones. La evidencia y el estado de entrega se mantienen en `../quickstart.md`.

## 1. Catálogo de selección

`GET /biblioteca-motivos/colecciones`

Profesor/administrador autenticado: versión del catálogo, IDs, etiquetas y cantidades. Sin consultas a datos de alumnos. Anónimo: 401; estudiante: 403. La autorización se aplica en servidor, además de ocultar la selección en su interfaz.

`GET /biblioteca-motivos?coleccion={id}&offset={n}&limit={n}`

Mismos roles. `limit` de 1 a 12, `offset` no negativo; colección desconocida o parámetros inválidos: error de validación, sin búsqueda en disco. Respuesta: `catalog_version`, `collection`, `total`, `offset`, `limit`, `items` con `id`, `label`, `description`, dimensiones y referencias de miniatura/archivo. Consultar una colección no descarga imágenes de otras.

`GET /biblioteca-motivos/archivos/{motif_id}/{variant}/{digest}`

Arte estático curado **público**, sin información académica, autorizado para mostrarse también en documentos o recursos publicados. `variant` solo `thumbnail | full`; digest coincidente con el catálogo; desconocidos: 404. Resolver por mapa interno, nunca concatenando rutas del usuario. MIME explícito, `nosniff`, cache inmutable por hash y sin redirección a direcciones externas. Este acceso no permite leer archivos privados de `imagenes` o `evaluaciones/recursos` ni explorar directorios. Probar tanto acceso público permitido al arte como denegación de rutas/IDs privados y traversal.

No hay endpoint de carga pública, generación, borrado o publicación de catálogo en esta entrega.

## 2. Selector compartido

Entradas: contexto de uso, colección sugerida opcional y selección actual. Salidas: selección confirmada o cancelación. No realiza guardado académico, publicación de notas ni generación de enlaces.

- Retroalimentación: «Sin decoración», «Variar diseños», colección y motivo fijo; máximo doce por página. Conservar IDs de los veinte generales y selección estable en continuaciones.
- Pregunta: «Elegir de la biblioteca», diseño y vista previa; usar el proceso existente de preparación/revisión del editor. No aceptar el motivo directamente como una pregunta guardada.
- Recurso: «Decoración de cabecera», selección o quitar; los cambios solo se aplican al guardar. No sustituir la ilustración principal ni las preguntas.
- Colección general disponible si falta área o hay error de asociación. No consultar nombres de estudiantes ni usar IA para sugerir.
- Carga, vacío, error y reintento con texto claro; cancelar devuelve la selección anterior. Foco restaurado, objetivos de 44 px, teclado y lector de pantalla. Doce miniaturas como máximo por página, originales solo al elegir/usarlos.

## 3. Inserción en evaluación

Usar ámbito y autorización actuales de `uploadVisual`: materia, evaluación, request key y archivo real. Descargar únicamente la referencia fija del catálogo, preparar `File` y transmitir por la ruta visual existente; no permitir al usuario aportar una URL para que el servidor la descargue.

El bloque conserva `recurso_id`, descripción, pregunta vinculada y estado de seguridad. Requiere vista previa cargada y confirmación docente antes de aceptarse. Se guarda con la revisión de contenido y concurrencia existentes. Cancelar no modifica versión; usuario ajeno/estudiante no puede editar; lectura y exportación conservan el acceso a la versión autorizada y soluciones privadas.

La procedencia indica biblioteca temática, no figura extraída del documento original. No se presenta un adorno como una clave o diagrama académico validado. Los generales de 320 px no se anuncian como imagen de gran formato.

## 4. Edición de recursos

Extender `PATCH /herramientas/{material_id}` con propiedad opcional tipada:

```json
{"decoracion": {"motif_id": "matematicas-001", "placement": "header"}}
```

También admite `{"decoracion": null}`. Propiedad omitida conserva estado. ID/posición inválidos: 422 antes de escribir. Mantener `resources.update`, propiedad exacta y materia aplicables; no añadir excepción para administrador si la ruta actual no la tiene. Desconocido/ajeno conserva su resultado autorizado actual.

Operación exclusivamente decorativa: leer y combinar solo `_presentacion`, de forma transaccional, sin reconstruir contenido académico. Si se editan además preguntas/texto de forma explícita, aplicar su validación normal y después la presentación tipada en la misma operación; error implica rollback completo. Ignorar o rechazar la modificación de `_presentacion` por `contenido_json` genérico, conservando el valor del servidor. No enviar el JSON completo cuando el usuario solo cambió decoración.

Respuesta conserva contrato del recurso con la selección guardada. Invalidar consultas y derivados del recurso que dependan de presentación. Un recurso publicado conserva el aviso de que guardar actualiza lo que ven sus alumnos. No sincronizar una evaluación vinculada ni cambiar notas/rúbricas por esta vía.

## 5. Render y exportación

La vista y los formatos existentes leen `_presentacion` y resuelven un ID curado. PDF/Word resuelven bytes locales empaquetados; nunca una ruta/URL recibida como decoración. Conservar alfa, proporción, cabecera de tamaño acotado y flujo del texto. La ausencia/fallo de imagen no elimina información ni bloquea impresión sin decoración.

No añadir Word a tipos que no lo ofrecen ni reconstruir una historia para decorarla. La imagen insertada en una pregunta sigue sus renders/versiones actuales, no esta cabecera de recurso. Las fichas conservan contenido completo, mínimo 12 pt, líneas de corte e identidad/motivo en continuaciones, tanto A4 como Carta.

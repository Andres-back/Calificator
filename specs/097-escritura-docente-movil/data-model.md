# Estado y conservación

Se reutilizan evaluación, preguntas/respuestas, criterios/rúbrica, modalidad, versión, materia y borradores v7. Sin entidades/tablas/campos académicos nuevos.

Estado visual local y transitorio: formulario abierto, ancho/alto/offset visibles, foco editable dentro del formulario y secciones desplegadas. No se envía ni persiste como configuración académica.

Transiciones:
- Cerrado → formulario normal, sin teclado textual automático móvil.
- Campo enfocado móvil → presentación compacta de escritura; datos siguen en el mismo estado/control.
- Listo/blur → presentación normal, sin submit ni generación.
- Teclado/orientación/zoom → ajustar presentación sin cambiar etapa, evaluación, valores o selecciones.
- Error → conservar trabajo y abrir/localizar corrección; pendiente mantiene locks actuales.

Las claves de borrador, TTL, payloads, expected_updated_at y publicación explícita no cambian. No se guarda estado del teclado ni se duplica texto en otra fuente de verdad.

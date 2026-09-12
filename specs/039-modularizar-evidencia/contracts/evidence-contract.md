# Contrato preservado de evidencia

No se añade, elimina ni modifica ningún endpoint. La extracción debe conservar:

## Documento completo

`GET /calificaciones/entregas/{entrega_id}/evidencia`

- Mantiene autorización por rol, propiedad y matrícula.
- Mantiene códigos de éxito, no encontrado y acceso denegado.
- Nunca devuelve la ubicación privada persistida.
- Conserva disposición y tipo de contenido actuales.

## Página visualizable

`GET /calificaciones/entregas/{entrega_id}/evidencia/paginas/{numero}`

- Acepta páginas entre 1 y 20 bajo la validación vigente.
- Renderiza PDF a PNG con la misma orientación, escala y caché por huella.
- Una imagen solo admite la página 1.
- Conserva mensajes seguros para contenido ilegible o página inexistente.

## Entregas que consumen evidencia

Los endpoints actuales de foto, lote, modo salón y entrega estudiantil conservan campos, límites, estados y respuestas. La modalidad mixta mantiene sus secciones en línea y física sin alterar su estructura.

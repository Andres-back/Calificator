# Decisiones de diseño

## Vista final

- Decisión: reutilizar el documento de `GET /evaluaciones/{id}/pdf` en un modal
  de solo lectura, con descarga y alternativa abrir en otra pestaña.
- Motivo: el servidor ya genera el formato imprimible, pero las tarjetas docentes
  solo ofrecen edición. Usar el mismo archivo evita una previsualización engañosa.
- Alternativas: enviar al editor mantiene el problema; tarjetas de preguntas son
  útiles pero no representan la maquetación final ni sus saltos de página.

## Word

- Decisión: usar python-docx 1.2.0, ya declarado en `backend/requirements.txt`.
  Convertir estructura guardada en párrafos/opciones editables, sin IA.
- Motivo: no existe exportación DOCX actual; la dependencia se usa para importar
  documentos de criterios. No es necesario instalar un proveedor externo.
- Alternativas: renombrar HTML a `.docx` no es un DOCX válido; imágenes por página
  eliminan la edición. Incorporar un conversor general nuevo amplía el riesgo.

## Materiales asignados

- Decisión: PDF conserva sus renderers específicos y Word usa contenido relevante
  completo de los tipos soportados. Estructuras no soportadas tendrán error explícito
  y PDF disponible; las pruebas documentarán qué se admite antes de la entrega.
- Motivo: `material_origen_id` puede indicar crucigrama, lectura, cuento u otros
  recursos con contexto que no está íntegro en `evaluacion.preguntas`. No debe
  exportarse solo la lista adaptada omitiendo el texto de lectura o la actividad.
- Alternativa descartada: reemplazar todo material por un examen genérico sin aviso.

## Autorización y no mutación

- Decisión: mantener `evaluations.read`, `ensure_can_read_evaluation` y exclusividad
  del solucionario por propietario/admin. Versión estudiante limpia por defecto;
  no confiar en ocultar botones para proteger respuestas.
- Motivo: autorización PDF ya existe; las dos exportaciones deben aplicar el mismo
  criterio y sanitizar datos privados de versiones para estudiantes.
- Render en threadpool y bytes en memoria: sin cambios de registros ni archivos
  persistentes. Mensajes de error, nombres de archivo y disposición seguros.

No hay dudas de alcance bloqueantes; las limitaciones gráficas Word son explícitas
en el plan. No se activan extensiones ni se modifican proveedores o modelos.

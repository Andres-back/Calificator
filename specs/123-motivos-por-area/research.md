# Investigación: biblioteca reutilizable por área

**Fecha**: 2026-10-24 | **Issue**: #259 | **Resultado**: decisiones resueltas durante el diseño; la implementación y sus pruebas posteriores están documentadas en `quickstart.md`.

## 1. Biblioteca compartida frente a archivos por pantalla

**Decisión**: catálogo curado independiente de imágenes privadas, con archivos empaquetados en backend, selector común y adaptador de compatibilidad para los veinte generales.

**Razón**: `feedbackMotifs.ts` ofrece veinte IDs y mezcla estable; `FeedbackPrintSheet.tsx` ya tiene galería diferida e impresión. Las exportaciones de recursos se ejecutan en backend. Una URL frontend no equivale a un archivo confiable del servidor. `app/modules/imagenes` contiene imágenes con propietario: quitar ese filtro expondría contenido privado y no es una vía válida para compartir motivos.

**Alternativas consideradas**: repetir tres catálogos (deriva y descargas innecesarias); alojar todo solamente en frontend (complica exportación local segura); publicar la biblioteca privada completa (rechazado por privacidad).

## 2. Temas y cantidad

**Decisión**: diez áreas de `MateriasListPage.tsx`, treinta composiciones nuevas por área, más los veinte generales. Alias explícitos y elección manual ante incertidumbre.

**Razón**: el campo de área admite texto libre. No sería correcto renombrar registros ni afirmar cobertura automática de cada nombre personalizado. Las nuevas imágenes son temáticas y decorativas, no diagramas evaluables o claves científicas verificadas.

**Alternativas consideradas**: deducir área desde respuestas o nombres (innecesario e invasivo); crear treinta por cada materia guardada (cantidad no acotada); recolorear diseños para llegar a treinta (no satisface variedad aprobada).

## 3. Imágenes en preguntas

**Decisión**: seleccionar archivo curado y reutilizar `visualApi.ts::uploadVisual`, la propuesta de `QuestionVisualEditor.tsx` y el guardado versionado existentes.

**Razón**: el editor requiere una vista previa cargada y confirmación docente antes de aceptar un `TeacherVisualBlock`. `visual_router.py` y `visual_service.py` comprueban ámbito, permisos, archivo y propiedad. El contenido de una pregunta requiere `recurso_id`, no una URL pública añadida a mano. `EvaluacionContenidoVersion` conserva las instantáneas anteriores.

**Alternativas consideradas**: pegar una URL en el enunciado (separa imagen y versión); guardar inmediatamente al elegir miniatura (elimina revisión); sobrescribir originales o recalificar por añadir decoración (fuera de alcance).

## 4. Decoración de recursos

**Decisión**: contrato de presentación separado y tipado, guardado en espacio reservado del JSON existente, sin migración. Cambios exclusivamente decorativos evitan las funciones de reconstrucción académica; el editor envía solo campos realmente modificados.

**Razón**: `ResourceEditorPanel.tsx` envía actualmente el contenido completo. `service.update_material` puede ejecutar `_rebuild_edited_puzzle` y `prepare_evaluation_criteria` cuando recibe `contenido_json`. Reusar esa operación sin distinguir intención podría cambiar preguntas o rúbricas al decorar. `MaterialContentEditor.tsx` necesita ocultar el espacio reservado y ofrecer un selector explícito.

**Alternativas consideradas**: sustituir `imagen` de cuentos (pierde ilustración principal); añadir campos libres al JSON académico (no protege integridad); crear una tabla genérica sin otro consumidor (complejidad sin necesidad). No se amplía el permiso de administrador ni se omite la propiedad exacta exigida por recursos.

## 5. Pantalla, PDF y Word

**Decisión**: cabecera acotada, imágenes resueltas únicamente por ID curado y conversión de formato en memoria cuando sea necesaria. Revisar los formatos existentes por tipo; no prometer formatos que no están implementados.

**Razón**: `ContenidoView.tsx`, `StoryContent.tsx` y `herramientas/pdf_render.py` ya renderizan imágenes, pero aceptar URLs arbitrarias en un exportador con acceso a red/archivos presenta un riesgo. El catálogo debe mapear IDs a archivos confiables y no ampliar esa superficie. Los recursos publicados muestran los cambios guardados inmediatamente y no sincronizan automáticamente evaluaciones vinculadas; conservar ambas reglas.

**Alternativas consideradas**: que el exportador descargue cualquier dirección (rechazado); pasar una ruta de disco del cliente (no válida); regenerar recursos con IA por cada impresión (coste, demora y cambios no solicitados).

## 6. Preparación de imágenes y rendimiento

**Decisión**: generar una sola vez con descripciones sin datos de alumnos, guardar manifiesto de procedencia y controlar avance por área. Revisar transparencia real, singularidad, pertinencia y tamaño; derivados pequeños para galería y archivos mayores para documentos.

**Razón**: los veinte generales actuales son de 320 px y apropiados para pequeñas cabeceras. Ampliarlos artificialmente no crea detalle útil para preguntas. La galería no debe descargar trescientas imágenes de documento cuando solo muestra doce miniaturas.

**Alternativas consideradas**: generar al imprimir (rechazado); recortar una hoja de contacto para contar treinta diseños (calidad y repetición); publicar placeholders como diseños terminados (no satisface alcance). No se afirma un coste gratuito ni se usan claves de producción.

## 7. Validación y límites de entrega

**Decisión**: datos sintéticos y base aislada para persistencia/permisos; revisión visual de los tres consumidores; pruebas de ausencia de mutaciones académicas y de llamadas a IA por selección o impresión. Mantener PR propio dependiente de Spec122.

**Razón**: ampliar imágenes no autoriza modificar notas, modelos o producción. La compatibilidad se comprueba con los veinte IDs anteriores, los permisos actuales y los flujos de enlace/publicación ya entregados.

No quedan decisiones técnicas pendientes de aclaración para redactar tareas después de la aprobación humana del plan.

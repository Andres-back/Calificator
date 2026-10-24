# Plan: biblioteca reutilizable de motivos por área

**Rama**: `codex/123-motivos-por-area` | **Fecha**: 2026-10-24 | **Spec**: [spec.md](./spec.md) | **Issue**: #259

**Estado**: aprobado por el usuario mediante «sí» tras la presentación del plan el 2026-10-24. Requisitos revisados con autorización, implementación y trescientos motivos completados localmente; validación y entrega documentadas en `quickstart.md`. Sin cambios en producción.

## Resumen

Crear una biblioteca común de trescientos motivos transparentes, treinta por cada una de las diez áreas de la especificación, conservando los veinte generales de Spec122. Un mismo selector progresivo servirá para decorar fichas de retroalimentación, insertar una imagen revisada en preguntas y decorar la cabecera de recursos imprimibles.

La biblioteca no genera imágenes al usarla. Las imágenes se crean una vez, se revisan, se optimizan y se distribuyen con la aplicación. Decorar no cambia contenido académico; insertar en una pregunta requiere la revisión y el guardado versionado existentes. No se modifica producción durante el desarrollo.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11 en contenedor; TypeScript 5.6, React 18 y Vite, conforme a los manifiestos existentes.
**Dependencias**: FastAPI, Pydantic, SQLAlchemy, Pillow 13, WeasyPrint y python-docx existentes; React Query, componentes de formularios/modales y editor visual existentes. Sin librería gráfica nueva.
**Persistencia**: catálogo curado y assets empaquetados, sin tabla ni migración nueva. La elección de cabecera se conserva en un espacio reservado del JSON del recurso; la pregunta usa los recursos y versiones existentes. La selección de impresión sigue siendo de presentación.
**Pruebas**: pytest unitario e integración con base aislada; Vitest; Playwright Chromium/WebKit; revisión visual de PDF y Word en los formatos ya disponibles; CI y gobernanza.
**Plataforma objetivo**: web/PWA en Android, iPhone y computador; 360/390/768/1440 px, temas claro/oscuro; A4 y Carta.
**Rendimiento y escala**: 320 motivos, máximo doce miniaturas por página. Nuevas miniaturas de hasta 60 KiB y originales optimizados de hasta 300 KiB como presupuestos de aceptación; no cargar todos los originales. En una página: hasta 720 KiB de miniaturas, aparte del documento. Las imágenes fuente nuevas tendrán al menos 1024 px antes de optimización. Los veinte generales mantienen sus archivos y tamaño actuales; no se presentan como ilustraciones ampliables de alta resolución.

## Verificación de la constitución

Verificación previa y posterior al diseño: no se identifica excepción necesaria.

- Separación de roles: catálogo de selección para profesor/administrador; imágenes curadas públicas sin datos privados. Editar preguntas o recursos conserva permisos, propiedad y pertenencia. Las imágenes privadas no pasan a ser públicas por pertenecer al mismo módulo.
- Integridad y trazabilidad: una imagen de pregunta se incorpora mediante recurso autorizado y versión revisada. No se reescriben evidencias, notas ni instantáneas anteriores. Una edición exclusivamente decorativa no ejecuta reconstrucción de preguntas, criterios o rúbricas.
- Asincronía e idempotencia: selector paginado con carga, error y reintento visibles; preparación y guardado usan los contratos existentes. Impresión espera imágenes cargadas o usa fallback textual. La preparación del catálogo es reanudable, fuera de solicitudes de usuarios.
- Datos y secretos: generación con descripciones temáticas, sin alumnos, documentos reales ni clave de producción. El servidor resuelve únicamente identificadores del catálogo; no admite rutas ni URLs de entrada para decoración.
- Accesibilidad: controles de al menos 44 × 44 px, teclado, foco, nombres de diseño legibles y ausencia de desbordamiento. Imágenes puramente decorativas no producen lectura redundante al lector de pantalla.
- Portabilidad de IA: no se alteran modelos, proveedores ni configuración. La herramienta incorporada crea assets estáticos; ningún consumidor depende de su API en ejecución.
- Gobernanza y pruebas: issue259 y rama separada; alcance y plan aprobados. Checklist, Tasks y Analyze precederán a implementación. PR propio y CI verde, sin fusionar ni desplegar sin autorización.

## Estructura del proyecto

Rutas previstas (los nuevos nombres se concretarán en las tareas):

```text
backend/app/assets/motif_library/             # catálogo, miniaturas y archivos optimizados
backend/app/modules/motif_library/            # lectura curada y resolución por identificador
backend/app/api.py                           # router central incluido por main
backend/app/modules/herramientas/             # contrato de decoración, guardado y exportación
backend/tests/unit/                           # catálogo, archivos, render y compatibilidad
backend/tests/integration/                    # permisos, conservación y versionado
frontend/src/modules/motif_library/           # cliente, tipos y selector compartido
frontend/src/modules/feedback_sharing/        # adaptación compatible con los veinte generales
frontend/src/modules/evaluaciones/components/QuestionVisualEditor.tsx
frontend/src/modules/herramientas/            # cabecera, edición y vista de recursos
frontend/public/assets/feedback-motifs/       # veinte archivos existentes sin modificar
frontend/e2e/                                # flujos móviles/escritorio con datos sintéticos
specs/123-motivos-por-area/                   # diseño, tareas, pruebas y procedencia
```

## Decisiones y complejidad

1. **Un catálogo, tres consumidores**. Metadata y archivos nuevos canónicos en backend para que PDF/Word resuelvan localmente lo mismo que el selector, sin descargar URLs arbitrarias. Los veinte generales conservan sus rutas frontend e identificadores; una copia de empaquetado para exportación debe verificarse por hash, no convertirse en un catálogo distinto. La biblioteca privada de imágenes generadas por usuarios conserva su filtro de propietario.
2. **Galería por área**. El selector pide hasta doce motivos y miniaturas de la colección actual. Generales y «Sin decoración» siempre disponibles; asociación por alias explícitos, no inferencia de IA. No cambiar el área de la materia. Mezcla estable por destinatario dentro de una colección, independiente de desempeño o datos personales semánticos.
3. **Evaluaciones**. Elegir desde la biblioteca prepara el archivo como recurso mediante `uploadVisual`, produce vista previa y exige la confirmación existente. No insertar un `src` público en lugar de `recurso_id`. Guardar sigue el control de versión/concurrencia y conserva las notas anteriores.
4. **Recursos**. Añadir una propiedad tipada `decoracion` al contrato de edición y almacenarla en `_presentacion`, sin exponerla como campos académicos genéricos. Omitida conserva; `null` quita. Separar cambios decorativos de `contenido_json`: el guardado decorativo no llama `_rebuild_edited_puzzle` ni `prepare_evaluation_criteria`. Las ediciones académicas explícitas siguen el flujo normal y no pueden sobrescribir esta presentación mediante un JSON libre. Mostrar el aviso existente cuando el recurso esté publicado.
5. **Exportaciones**. Decoración de cabecera de tamaño acotado, sin sustituir ilustración principal. Resolver bytes locales por ID; preservar alfa/proporciones. Si Word requiere PNG, convertir formato en memoria con Pillow, sin regenerar la imagen. La previsualización y exportación deben usar el estado guardado vigente; invalidar derivados obsoletos de ese recurso, no regenerar su contenido académico ni sincronizar evaluaciones vinculadas. Se mantienen los formatos existentes por tipo.
6. **Creación controlada**. Preparar treinta descripciones distintas por área, registrar procedencia y generar un motivo por salida mediante la herramienta incorporada. Trabajar en lotes pequeños, con manifiesto reanudable y revisión visual de cada resultado; no contar composiciones duplicadas, recoloreadas o fondos blancos como entregadas. La aprobación del plan no autoriza claves de producción, gasto externo indeterminado o reintentos ilimitados. Registrar fallos antes de decidir sustituciones.
7. **Entrega y límites**. Esta rama parte del código publicado del PR258 y no lo modifica remotamente. Reconciliar con su base final antes del PR propio, preservando cambios ajenos. Ni esta planificación ni elegir una decoración constituye autorización de publicación de notas, creación de enlaces o despliegue.

Detalles: [investigación](./research.md), [datos](./data-model.md), [contratos](./contracts/library-and-consumers.md) y [validación](./quickstart.md).

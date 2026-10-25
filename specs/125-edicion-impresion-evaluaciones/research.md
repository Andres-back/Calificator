# Investigación de edición y composición

**Base**: `origin/main` en `a2f6ffc01866e132efb1cecbeca8b253a8b2568a`. Investigación de solo lectura y prueba del mismo componente con cuenta demo; no se abrió la materia real indicada ni se usaron evidencias de estudiantes.

## Evidencia observada

- En producción demo, «Visualizar» de Logaritmos a1440×1000 muestra un diálogo1416×976 y una hoja de1348×1744px; el botón «Reducir» está deshabilitado al ancho inicial. A390×844 la hoja mide330×427px. No se detectó overflow global en estas dos mediciones. Confirma escala inicial demasiado grande en escritorio, no un PDF incompleto.
- Capturas locales: `E:/tesis/output/playwright/spec125-preview-before-1440.png`, `spec125-preview-before-390.png`, `spec125-editor-before-1440.png` y `spec125-editor-before-390.png`. Son estado anterior, no prueba de una mejora implementada.
- Se abrió «Editar preguntas» sin cambiar campos ni guardar. El asistente presenta una pregunta inicial desplegada y toda la lista de quince cabeceras; la navegación y los paneles anidados siguen consumiendo espacio. En la captura390×844, encabezado, aviso y paneles consumen casi toda la altura: el campo del enunciado ni siquiera aparece antes de desplazarse. Reducir texto redundante y concentrar la edición resuelve más que ensanchar el modal.
- La captura del usuario corresponde a «Material de la pregunta» mostrando una hoja completa. No se determinó si fue subida, recortada o generada: no atribuirla a la IA sin prueba.

## Decisiones basadas en el código

1. `EvaluationPdfViewer.tsx` calcula ancho disponible y mantiene zoom mínimo1. Decisión: agregar modo página completa usando ancho y altura útiles; conservar escala al ancho móvil, ancla, cancelación y ventana de render. Rechazado: renderizar todas las hojas a resolución máxima.
2. `GenerationWizard.tsx` ya tiene ancho de escritorio amplio, pero acumula tarjetas, formularios y acciones. Decisión: navegación enfocada y componentes reutilizados. Rechazado: solo quitar márgenes o duplicar formularios móvil/escritorio.
3. `export_service.py` fuerza composición compacta, Word fija Arial11pt y usa espacios por pregunta; `pdf_render.py` fija11px y dos líneas en el examen. `print_layout.py` ya tiene una regla conservadora para opciones en dos columnas. Decisión: resolvedor común para configuración explícita y fallback legacy sin cambios.
4. `visual_service._snapshot` enumera campos; no preservará automáticamente una nueva preferencia. `prepare_content_edit` exige manifiesto y puede crear la primera versión académica. Decisión: incluir explícitamente la configuración en snapshots futuros y una vía limitada de presentación que no cree la primera versión legacy, no invente visuales y no repinee entregas. Las versiones existentes se copian de forma inmutable.
5. `grading_visual_context.py` distingue entregas legacy sin versión. Crear una primera versión por cambiar letra puede impedir recalificarlas. Regresión obligatoria: guardar presentación y recalificar legacy en entorno aislado, sin llamadas reales.
6. `QuestionVisualEditor.tsx` ya ofrece biblioteca, archivo, recorte y propuesta con IA. La revisión de imagen tiene un límite de45dvh sin ampliación propia. Decisión: reutilizar esos caminos y dar lectura ampliada; no crear otro catálogo.
7. `visual_generation.py` pide «material de una pregunta» pero no prohíbe hojas completas ni exige una figura aislada. El enrutador de imágenes ya captura la ruta institucional. Decisión: propósito y estilo explícitos, sin modelo fijo, alpha comprobado y alternativa cuando no haya capacidad. No asumir que cualquier API soporte transparencia.

La investigación de persistencia y exportación fue contrastada con un agente de investigación de solo lectura requerido por Plan. La decisión final añade una vía de presentación limitada para evitar el riesgo legacy identificado; no se delegó lectura de instrucciones de skills.

## Coordinación y límites

### Transparencia: documentación oficial consultada

La referencia oficial de [Images Generate de OpenAI](https://developers.openai.com/api/reference/python/resources/images/methods/generate) admite `background: transparent` con salida PNG/WebP, y declara el soporte de GPT Image2 en preview. Se mantendrá el modelo configurado y calidad low; no se migrará al modelo sugerido por un ejemplo de documentación. La implementación debe verificar alpha real y ofrecer biblioteca/archivo ante capacidad ausente o salida opaca; no hacer reintentos pagados. Consulta el2026-10-24, sin probar credenciales ni generar imágenes.

- Spec125 es propietaria de composición, visor y edición posterior. Spec124 / #261 conserva digitalización íntegra y fidelidad del original; deberá consumir el contrato de presentación, no redefinirlo.
- No llamadas pagadas, cambios de modelos, datos académicos, exportaciones nuevas guardadas en producción ni migración aplicada durante esta investigación.
- No se ha medido aún el ajuste automático, los derivados, accesibilidad completa, ambos motores o Word/PDF nuevos. Son comprobaciones pendientes de implementación, no resultados alcanzados.

# Investigación de diseño126

Inspección local de solo lectura el2026-10-24. Sin llamadas a IA, acceso al enlace real ni cambios académicos. Los hallazgos fueron contrastados con una investigación delegada de backend autorizada por la fase de investigación de Spec Kit Plan.

## 1. Duplicación docente y fuente del mensaje

**Hallazgo**: `GradeFeedback` edita `adjFeedback` mediante la maquinaria de ajuste de calificación. `ShareFeedbackDialog` muestra la proyección de entrega y `FeedbackDeliveryReview` autoriza un mensaje contra una huella. Ambos accesos ya comparten infraestructura de enlaces; no existen dos productos de publicación independientes. La selección del roster no se pasa al diálogo de grupo.

**Decisión**: componer una vista común usando la proyección/revisión entregable, separar el ajuste académico de la edición del mensaje y pasar selección explícita. Mensaje original permanece en historial; publicación y entrega conservan sus reglas actuales.

**Razón**: misma revisión visible sin perder auditoría ni confirmar una nota al editar texto.

**Alternativas**: eliminar el grupo pierde impresión/lote; mantener editores separados con etiquetas nuevas no resuelve divergencia; copiar mensajes entre formularios mezcla autoridades y versiones.

## 2. Historial ya persistido, lector no identificado

**Hallazgo**: `PublicFeedbackChat` conserva diez intercambios en estado React. `FeedbackChatRequest` ya guarda message/response/status con acceso, publicación y generación. No hay historial ni identidad de navegador. Poll e idempotencia solo comprueban el ámbito de acceso actual.

**Decisión**: scope opaco servidor más UUID local, digest por petición e historial paginado. Aplicar el mismo aislamiento a GET individual y POST idempotente, no solo al listado. Mantener legadoNULL sin enumerarlo ni reasignarlo.

**Razón**: una familia puede reenviar un enlace; el secreto del enlace no debe convertir conversaciones de lectores distintos en un chat colectivo.

**Alternativas**: guardar textos localmente expone contenido; enumerar todo por token cruza lectores; tabla nueva no aporta una necesidad identificada. Un hash del token como clave local se evita devolviendo un scope no autenticante sin material de credencial.

## 3. Cuota, incertidumbre y revocación

**Hallazgo**: cuota única por estudiante/evaluación en600s, cinco admisiones incluidas fallidas; guardas de fuente/permiso vigentes; worker no repite inferencia incierta. Retención elimina textos terminales tras30d de cierre efectivo, no treinta días universales desde la pregunta. Reactivación puede sustituir publicación y renovación cambia generación.

**Decisión**: no modificar cuota, worker ni retención. Recuperar estado mediante lecturas; aislar todas las consultas y revalidar al terminar; scope cambia con publicación/generación. No añadir conversaciones previas al prompt en este alcance.

**Alternativas**: nueva cuota por navegador o reenviar pendientes permite eludir límites/duplicar gasto; cargar historial indiscriminado al prompt amplía coste y contexto sin necesidad para restaurar la UI.

## 4. Formato disponible y límites públicos

**Hallazgo**: existen react-markdown/GFM/math, KaTeX, Lucide y motivos. El chat usa un párrafo de texto plano y muestra los asteriscos. `RichContent` genérico permite imágenes Markdown; reutilizarlo sin política específica podría solicitar imágenes externas desde una vista sensible.

**Decisión**: perfil público restringido, sin HTML crudo, imágenes externas ni navegación propuesta por el contenido; formato semántico seguro e iconos locales. Normalizar solo marcado inequívoco y conservar textos no estructurables.

**Alternativas**: reemplazar todos los asteriscos destruye contenido; insertar HTML libre es innecesario; imagen nueva por respuesta introduce gasto y latencia sin mejorar necesariamente la explicación.

## Resultado

Sin incógnitas técnicas bloqueantes; alcance y plan aprobados el2026-10-24. El guardado del texto sin cambiar nota utiliza un contrato docente específico, con permiso grading.grade, huella, idempotencia y conservación del mensaje anterior en la línea de tiempo existente; aprobar entrega conserva su contrato aparte. No se afirma calidad académica validada ni se altera la comparación de modelos pendiente de la tesis.

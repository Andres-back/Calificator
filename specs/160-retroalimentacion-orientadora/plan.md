# Plan: Retroalimentación orientada al siguiente paso y foto siempre adjunta

**Spec**: [spec.md](spec.md) | **Issue**: [#340](https://github.com/Andres-back/Calificator/issues/340)

## Diagnóstico

- **Foto**: `FeedbackSharePanel.tsx` tiene la casilla "Permitir ver las fotos de su propia entrega", desmarcada por defecto. `FeedbackAccessList.tsx` reactiva con `evidencia: false`. `create_access` responde 409 si el enlace que se reutiliza tiene otra opción de evidencia.
- **Orden**: `build_formative_feedback` arma "Pregunta N: {explicación} Siguiente paso: {orientación}". Las instrucciones de `agents.py` y `feedback_refinement.py` piden identificar el error y terminar con la acción.
- **Lenguaje**: `score_notes.py` añade "Con el reparto confirmado" también a `explicacion_estudiante`. Los términos "validación" y "clave oficial" y las respuestas reveladas vienen del modelo: esas frases no están en el código.
- **Aviso interno**: `delivery_message` lo quita en la entrega por lote, pero `build_projection` usa `grade.feedback` tal cual.
- **Restricción clave**: `guard_access` compara `publication.content_fingerprint` con la proyección recalculada. Limpiar el texto al proyectar cambiaría esa huella y dejaría sin servicio enlaces vigentes. Por eso el lenguaje se corrige al generar, no al mostrar.

## Decisión

Dos PR pequeños.

**PR 1, foto siempre adjunta**
- `new_publication` guarda siempre `evidence_enabled=True`. El campo `evidencia` de la API se sigue aceptando y se ignora, para no romper pestañas abiertas durante el despliegue.
- Al reutilizar un enlace, se activa la foto de su publicación en vez de responder 409. `evidence_enabled` no forma parte de la huella.
- Se quita la casilla y se cambia el texto de la confirmación.
- La copia del docente pide activar la foto con `adjuntar_evidencia`. La recuperación automática al abrir el panel usa la misma ruta sin ese campo, y no cambia nada. Reemplazar el enlace también activa la foto.
- `evidencia_disponible` exige que la entrega tenga archivo. Un 404 de la foto ya no cierra la página: vuelve a consultar el enlace y solo se cierra si de verdad está cerrado. Antes esto casi no ocurría porque la foto venía apagada.

**PR 2, mensaje orientador**
- `build_formative_feedback`: "Pregunta N: {orientación} Por qué: {explicación}".
- Reglas nuevas en `agents.py` y `feedback_refinement.py` (FR-005, FR-006).
- `score_notes.py` deja de añadir la frase a la explicación del estudiante.
- El aviso interno no pasa a enlaces nuevos, sin cambiar la huella de los vigentes; se confirma con una prueba de enlace vigente (FR-008, FR-009).
- Validación con pocas entregas anónimas y un modelo dentro del techo de costo, sin guardar nada, avisando el costo antes.

Descartado:

- **Limpiar textos antiguos al mostrarlos o reescribirlos en la base**: invalida enlaces vigentes o toca datos de producción sin que el docente lo pida.
- **Activar la foto en masa en los enlaces vigentes**: cambia en producción lo que ya se entregó, sin una acción del docente.
- **Encender la reescritura automática (`FEEDBACK_REFINEMENT_ENABLED`)**: añade costo y tiempo, y es una decisión aparte.

## Alcance técnico

| PR | Archivo | Cambio |
| --- | --- | --- |
| 1 | `backend/app/modules/feedback_sharing/service.py`, `link_service.py`, `schemas.py`, `router.py` | foto siempre activa, reutilización sin 409, copia con gesto |
| 1 | `backend/app/modules/feedback_sharing/public_router.py` | foto ofrecida solo si hay archivo |
| 1 | `frontend/src/modules/feedback_sharing/FeedbackSharePanel.tsx`, `FeedbackAccessList.tsx`, `FeedbackLinkActions.tsx`, `FeedbackStudentLink.tsx`, `api.ts` | sin casilla, texto nuevo, gesto que activa la foto |
| 1 | `frontend/src/modules/feedback_sharing/PublicFeedbackEvidence.tsx`, `PublicFeedbackPage.tsx` | la foto que falla no oculta la nota |
| 2 | `backend/app/modules/calificaciones/breakdown_policy.py` | la acción primero |
| 2 | `backend/app/modules/calificaciones/agents.py`, `feedback_refinement.py` | reglas de redacción |
| 2 | `backend/app/modules/evaluaciones/score_notes.py` | sin frase de reparto al estudiante |
| 2 | `backend/app/modules/feedback_sharing/projection.py` | aviso interno fuera de enlaces nuevos |

## Riesgos

- El modelo puede seguir usando algún término interno: las reglas lo reducen, pero no lo garantizan. El docente sigue revisando antes de compartir.
- Los textos ya guardados conservan su redacción, así que el cambio se nota en las calificaciones nuevas.
- Los estudiantes con enlace nuevo verán sus fotos: solo las de su propia entrega, por el mismo enlace privado.

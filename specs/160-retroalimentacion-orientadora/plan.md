# Plan: Retroalimentación orientada al siguiente paso y foto siempre adjunta

**Spec**: [spec.md](spec.md) | **Issue**: [#340](https://github.com/Andres-back/Calificator/issues/340)

## Diagnóstico

- **Foto**: `FeedbackSharePanel.tsx` tiene la casilla "Permitir ver las fotos de su propia entrega", desmarcada por defecto. `FeedbackAccessList.tsx` reactiva con `evidencia: false`. `create_access` responde 409 si el enlace que se reutiliza tiene otra opción de evidencia.
- **Orden**: `build_formative_feedback` arma "Pregunta N: {explicación} Siguiente paso: {orientación}". Las instrucciones de `agents.py` y `feedback_refinement.py` piden identificar el error y terminar con la acción.
- **Lenguaje**: `score_notes.py` añade "Con el reparto confirmado" también a `explicacion_estudiante`. Los términos "validación" y "clave oficial" y las respuestas reveladas vienen del modelo: esas frases no están en el código.
- **Aviso interno**: `delivery_message` lo quita en la entrega por lote, pero `build_projection` usa `grade.feedback` tal cual.
- **Restricción clave**: `guard_access` compara `publication.content_fingerprint` con la proyección recalculada. Limpiar el texto al proyectar cambiaría esa huella y dejaría sin servicio enlaces vigentes. Por eso el lenguaje se corrige al generar, no al mostrar.

## Decisión

Tres PR pequeños. El mensaje orientador se dividió en dos el 2026-11-23: el PR 2 cambia solo código y el PR 3, las instrucciones al modelo, que necesitan una validación con IA.

**PR 1, foto siempre adjunta**
- `new_publication` guarda siempre `evidence_enabled=True`. El campo `evidencia` de la API se sigue aceptando y se ignora, para no romper pestañas abiertas durante el despliegue.
- Al reutilizar un enlace, se activa la foto de su publicación en vez de responder 409. `evidence_enabled` no forma parte de la huella.
- Se quita la casilla y se cambia el texto de la confirmación.
- La copia del docente pide activar la foto con `adjuntar_evidencia`. La recuperación automática al abrir el panel usa la misma ruta sin ese campo, y no cambia nada. Reemplazar el enlace también activa la foto.
- `evidencia_disponible` exige que la entrega tenga archivo. Un 404 de la foto ya no cierra la página: vuelve a consultar el enlace y solo se cierra si de verdad está cerrado. Antes esto casi no ocurría porque la foto venía apagada.

**PR 2, mensaje orientador sin IA**
- `build_formative_feedback`: "Pregunta N: {orientación} Por qué: {explicación}".
- `score_notes.py` deja de añadir la frase a la explicación del estudiante.
- El aviso interno ya no llega a enlaces nuevos: `ensure_feedback_coherence` rechaza el mensaje que empieza por él y `delivery_message` lo quita del texto ofrecido. No se cambia la proyección, así que la huella de los enlaces vigentes es la misma; se fija con una prueba (FR-008, FR-009).

**PR 3, reglas de redacción**
- Reglas nuevas en `agents.py` y `feedback_refinement.py` (FR-005, FR-006).
- Validación con pocas entregas anónimas y un modelo dentro del techo de costo, sin guardar nada, avisando el costo antes.
- Las alertas del calificador se muestran al docente en cada pregunta (Spec 213). Por eso la regla dice qué es una alerta: algo que el docente debe comprobar o decidir, no el aviso de que una respuesta es incorrecta.

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
| 2 | `backend/app/modules/evaluaciones/score_notes.py` | sin frase de reparto al estudiante |
| 2 | `backend/tests/unit/test_feedback_action_first.py`, `frontend/src/modules/feedback_sharing/feedbackSections.test.ts` | pruebas; la proyección no cambia |
| 3 | `backend/app/modules/calificaciones/agents.py`, `feedback_refinement.py` | reglas de redacción |

## Riesgos

- El modelo puede seguir usando algún término interno: las reglas lo reducen, pero no lo garantizan. El docente sigue revisando antes de compartir.
- Los textos ya guardados conservan su redacción, así que el cambio se nota en las calificaciones nuevas.
- Los estudiantes con enlace nuevo verán sus fotos: solo las de su propia entrega, por el mismo enlace privado.

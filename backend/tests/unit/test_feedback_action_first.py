"""Spec 160, PR 2: el mensaje orienta primero y no lleva textos internos al estudiante."""
from types import SimpleNamespace as NS

import pytest
from fastapi import HTTPException

from app.modules.calificaciones.breakdown_policy import build_formative_feedback
from app.modules.evaluaciones.score_notes import repartition_explanations
from app.modules.feedback_sharing.batch_policy import delivery_message
from app.modules.feedback_sharing.quality_policy import ensure_feedback_coherence

ENVELOPE = ('Retroalimentación provisional: requiere revisión docente porque la evidencia, '
            'las valoraciones, la suma o el mensaje no coinciden por completo. Borrador basado en el desglose: ')


def component(numero, estado="parcial", explicacion="", orientacion=""):
    return {"numero": numero, "estado": estado, "explicacion_estudiante": explicacion,
            "evidencia_json": {"orientacion_mejora": orientacion} if orientacion else {}}


def test_fr004_la_pregunta_empieza_por_la_accion_y_despues_dice_por_que():
    texto = build_formative_feedback([
        component("1", "correcta", "Identificaste al personaje."),
        component("2", explicacion="Falta explicar el motivo.", orientacion="Relee el párrafo inicial y escribe una razón."),
    ])
    assert texto == ("Lograste 1 de 2 respuestas con puntaje completo. "
                     "Pregunta 2: Relee el párrafo inicial y escribe una razón. Por qué: Falta explicar el motivo.")
    assert "Siguiente paso:" not in texto


@pytest.mark.parametrize(("explicacion", "orientacion", "esperado"), [
    ("Falta explicar el motivo.", "", "Pregunta 3: Falta explicar el motivo."),
    ("", "Compara las dos opciones con la lectura.", "Pregunta 3: Compara las dos opciones con la lectura."),
    ("", "", "Pregunta 3: Esta respuesta necesita revisión."),
])
def test_fr004_sin_orientacion_o_sin_motivo_no_inventa_ninguno(explicacion, orientacion, esperado):
    texto = build_formative_feedback([component("3", "incorrecta", explicacion, orientacion)])
    assert texto.endswith(esperado)
    assert "Por qué:" not in texto


def test_fr004_espacios_y_limite_se_conservan():
    largo = "Relee   el\ttexto. " * 200
    texto = build_formative_feedback([component("4", explicacion="Motivo  breve.", orientacion=largo)])
    assert "  " not in texto and len(texto) <= 2000
    assert texto.startswith("Lograste 0 de 1 respuestas con puntaje completo. Pregunta 4: Relee el texto.")


def test_fr007_el_reparto_queda_en_la_explicacion_docente_y_no_en_la_del_estudiante():
    docente, estudiante = repartition_explanations("Valoración basada en la respuesta.", "Explicaste una razón del texto.", "0.5", "1")
    assert docente == "Con el reparto confirmado, esta respuesta obtiene 0.5 de 1 puntos. Valoración basada en la respuesta."
    assert estudiante == "Explicaste una razón del texto."


def test_fr007_sin_explicacion_del_estudiante_usa_la_original_sin_frase_de_reparto():
    assert repartition_explanations("Valoración basada en la respuesta.", None, "1", "1")[1] == "Valoración basada en la respuesta."
    assert repartition_explanations(None, None, "1", "1") == (
        "Con el reparto confirmado, esta respuesta obtiene 1 de 1 puntos. Se conserva la valoración anterior.",
        "Se conserva la valoración anterior.")


def test_fr008_el_aviso_interno_no_llega_a_un_enlace_nuevo():
    mensaje = "Pregunta 2: Relee el párrafo inicial. Por qué: Falta explicar el motivo."
    # Un enlace directo con el aviso se rechaza y pide editar el mensaje.
    with pytest.raises(HTTPException) as error:
        ensure_feedback_coherence(NS(feedback=ENVELOPE + mensaje), [{"estado": "parcial"}])
    assert error.value.status_code == 409
    # Lo que se ofrece para aprobar llega sin el aviso, con el mensaje orientador intacto.
    assert delivery_message(ENVELOPE + mensaje) == mensaje
    ensure_feedback_coherence(NS(feedback=delivery_message(ENVELOPE + mensaje)), [{"estado": "parcial"}])

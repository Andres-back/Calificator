"""Teacher-authorized summaries never certify or disclose a pending breakdown."""
from copy import deepcopy
from decimal import Decimal
from types import SimpleNamespace as NS
from uuid import uuid4

from fastapi import HTTPException
import pytest

from app.modules.feedback_sharing.projection import (
    build_projection, build_review_projection, review_source_fingerprint,
)
from app.modules.feedback_sharing.chat_service import build_prompt


def case():
    grade = NS(id=uuid4(), estudiante_id=uuid4(), evaluacion_id=uuid4(), materia_id=uuid4(),
        estado='publicada', revisado_por_docente=True, nota_confirmada=Decimal('3'),
        feedback='Retroalimentación provisional: revisa la evidencia.', entrega_id=None,
        updated_at=None)
    evaluation = NS(id=grade.evaluacion_id, materia_id=grade.materia_id, nombre='Lectura',
        nota_maxima=Decimal('5'), recepcion_habilitada=True, blueprint=None,
        preguntas=[{'secret':'UNRELEASED_KEY'}], criterios=[], metas_profesor=[])
    breakdown = NS(id=uuid4(), version=1, cobertura_estado='incompleta', requiere_revision=True,
        nota_final=Decimal('3'), bloqueos_json=['verificador_ia:timeout'], componentes=[])
    review = NS(id=uuid4(), scope='summary',
        feedback_text='Aciertos: identificaste al personaje. Qué mejorar: explica su emoción. Siguiente paso: relee el segundo párrafo y escribe una razón.',
        source_fingerprint=review_source_fingerprint(grade,evaluation,'Ana','Lenguaje',breakdown))
    return grade,evaluation,breakdown,review


def test_explicit_summary_keeps_official_decision_and_does_not_mutate_original():
    grade,evaluation,breakdown,review=case()
    before=deepcopy((vars(grade),vars(breakdown)))
    with pytest.raises(HTTPException):
        build_projection(grade,evaluation,'Ana','Lenguaje',breakdown)
    projection=build_review_projection(grade,evaluation,'Ana','Lenguaje',breakdown,review)
    assert projection.payload['nota']=='3'
    assert projection.payload['retroalimentacion']==review.feedback_text
    assert projection.payload['respuestas']==[]
    assert projection.payload['alcance']=='summary'
    assert projection.payload['claves_liberadas'] is False
    assert 'detalle por pregunta' in projection.payload['explicacion']
    assert 'UNRELEASED_KEY' not in build_prompt(projection.payload,'¿Cómo puedo mejorar?')
    assert (vars(grade),vars(breakdown))==before


@pytest.mark.parametrize('field,value', [('nota_confirmada',Decimal('0')),('nota_confirmada',Decimal('5'))])
def test_zero_and_maximum_can_have_a_reviewed_summary(field,value):
    grade,evaluation,breakdown,review=case()
    setattr(grade,field,value)
    review.source_fingerprint=review_source_fingerprint(grade,evaluation,'Ana','Lenguaje',breakdown)
    assert build_review_projection(grade,evaluation,'Ana','Lenguaje',breakdown,review).payload['nota']==str(value)


@pytest.mark.parametrize('field,value', [('estado','sugerida'),('revisado_por_docente',False),('nota_confirmada',None)])
def test_summary_does_not_authorize_an_unconfirmed_grade(field,value):
    grade,evaluation,breakdown,review=case()
    setattr(grade,field,value)
    review.source_fingerprint=review_source_fingerprint(grade,evaluation,'Ana','Lenguaje',breakdown)
    with pytest.raises(HTTPException):
        build_review_projection(grade,evaluation,'Ana','Lenguaje',breakdown,review)


@pytest.mark.parametrize('message', ['', 'Muy bien, sigue así.', 'Retroalimentación provisional: consulta al docente.', 'RETROALIMENTACION PROVISIONAL: consulta al docente.', 'Trabajo perfecto, todo está correcto.'])
def test_explicit_review_still_requires_a_real_coherent_message(message):
    grade,evaluation,breakdown,review=case()
    review.feedback_text=message
    with pytest.raises(HTTPException):
        build_review_projection(grade,evaluation,'Ana','Lenguaje',breakdown,review)


@pytest.mark.parametrize('part', ['grade','feedback','breakdown','questions','evidence','student_name'])
def test_any_source_change_invalidates_approval(part):
    grade,evaluation,breakdown,review=case()
    evidence=None
    name='Ana'
    if part=='grade':grade.nota_confirmada=Decimal('4')
    if part=='feedback':grade.feedback='Otro mensaje fuente.'
    if part=='breakdown':breakdown.version=2
    if part=='questions':evaluation.preguntas=[]
    if part=='evidence':evidence={'archivo':'replacement.png'}
    if part=='student_name':name='Otra identidad'
    with pytest.raises(HTTPException) as exc:
        build_review_projection(grade,evaluation,name,'Lenguaje',breakdown,review,evidence_identity=evidence)
    assert exc.value.status_code==409


def test_detail_cannot_bypass_a_pending_breakdown():
    grade,evaluation,breakdown,review=case()
    review.scope='detail'
    with pytest.raises(HTTPException):
        build_review_projection(grade,evaluation,'Ana','Lenguaje',breakdown,review)

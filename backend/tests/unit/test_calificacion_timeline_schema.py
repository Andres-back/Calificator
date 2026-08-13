from decimal import Decimal

from app.modules.calificaciones.schemas import CalificacionTimelineEvent


def test_timeline_scores_are_serialized_as_json_numbers() -> None:
    event = CalificacionTimelineEvent(
        tipo="ajustada",
        nota_anterior=Decimal("4.5"),
        nota_nueva=Decimal("4.8"),
    )

    payload = event.model_dump(mode="json")

    assert payload["nota_anterior"] == 4.5
    assert payload["nota_nueva"] == 4.8
    assert isinstance(payload["nota_anterior"], float)
    assert isinstance(payload["nota_nueva"], float)
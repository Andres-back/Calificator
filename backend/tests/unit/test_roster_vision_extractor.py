from app.modules.importacion_estudiantes.service import normalize_name
from app.modules.importacion_estudiantes.vision_service import normalize_candidates


def test_roster_candidates_keep_names_and_flag_low_confidence() -> None:
    result = normalize_candidates({"estudiantes": [
        {"nombre": "  María   José Pérez  ", "confianza": 0.96, "requiere_revision": False},
        {"nombre": "Andr?", "confianza": 0.42, "requiere_revision": False, "advertencias": ["letra dudosa"]},
        {"nombre": "---", "confianza": 1},
    ]})
    assert result[0]["nombre"] == "María José Pérez"
    assert result[0]["requiere_revision"] is False
    assert result[1]["requiere_revision"] is True
    assert result[1]["advertencias"] == ["letra dudosa"]
    assert len(result) == 2


def test_name_normalization_is_only_for_warning_not_identity_merge() -> None:
    assert normalize_name("Ángela  Muñoz") == "angela munoz"

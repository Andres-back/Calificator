from app.services.ai_config_service import DEFAULT_FEATURES, _feature_candidates


def test_grading_tasks_resolve_to_teacher_facing_features() -> None:
    assert _feature_candidates("grading_photo")[:2] == (
        "grading_photo",
        "calificacion_foto",
    )
    assert _feature_candidates("grading_text")[:2] == (
        "grading_text",
        "calificacion_texto",
    )


def test_grading_and_vision_defaults_prefer_opencode() -> None:
    routes = {item["feature"]: item for item in DEFAULT_FEATURES}
    for feature in ("calificacion_texto", "calificacion_foto", "vision_ocr"):
        assert routes[feature]["primary_provider"] == "open_code"
        assert routes[feature]["fallback_provider"] is None
    assert (
        routes["calificacion_foto"]["primary_model"]
        == "deepseek-v4-flash-vision-exp"
    )
    assert (
        routes["calificacion_texto"]["primary_model"]
        == "deepseek-v4-flash-vision-exp"
    )

def test_presentation_defaults_prefer_opencode_with_groq_fallback() -> None:
    routes = {item["feature"]: item for item in DEFAULT_FEATURES}
    assert routes["presentaciones"]["primary_provider"] == "open_code"
    assert routes["presentaciones"]["fallback_provider"] == "groq"

from app.services.ai_capability_registry import STAGES, editable_runtime_features, stage_for


def test_every_editable_stage_has_a_real_consumer_and_runtime_feature():
    editable = [stage for stage in STAGES if stage.editable]
    assert editable
    assert all(stage.consumer and stage.runtime_feature for stage in editable)
    assert len({(stage.function_id, stage.stage_id) for stage in STAGES}) == len(STAGES)


def test_grading_exposes_real_stages_and_keeps_deterministic_steps_read_only():
    assert stage_for("calificacion", "extraction").runtime_feature == "calificacion.extraccion"
    assert stage_for("calificacion", "grading_primary").runtime_feature == "calificacion.valoracion"
    assert stage_for("calificacion", "grading_secondary").runtime_feature == "calificacion.verificacion"
    assert stage_for("calificacion", "targeted_recheck").runtime_feature == "calificacion.revision_adicional"
    assert stage_for("calificacion", "consolidation").editable is False


def test_editable_route_registry_contains_no_deterministic_stage():
    features = editable_runtime_features()
    assert "calificacion.extraccion" in features
    assert None not in features
    assert all("export" not in feature for feature in features)

from __future__ import annotations

from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

from app.modules.criterios_aprendizaje.compatibility import canonical_hash, criterion_snapshot
from app.modules.criterios_aprendizaje.models import (
    LearningCriterion,
    LearningCriterionSet,
    LearningCriterionVersion,
)


def test_models_keep_approved_version_restrictive_and_weights_decimal() -> None:
    set_foreign_keys = {
        foreign_key.target_fullname: foreign_key.ondelete
        for foreign_key in LearningCriterionSet.__table__.foreign_keys
    }
    version_foreign_keys = {
        foreign_key.target_fullname: foreign_key.ondelete
        for foreign_key in LearningCriterionVersion.__table__.foreign_keys
    }

    assert set_foreign_keys["learning_criterion_versions.id"] == "RESTRICT"
    assert version_foreign_keys["learning_criterion_sets.id"] == "RESTRICT"
    assert str(LearningCriterion.__table__.c.peso_porcentaje.type) == "NUMERIC(5, 2)"


def test_snapshot_is_ordered_stable_and_preserves_decimal_values() -> None:
    criterion = SimpleNamespace(
        id=uuid4(),
        version_id=uuid4(),
        stable_key="procedimiento",
        orden=1,
        nombre="Procedimiento",
        descripcion="Desarrolla el procedimiento completo.",
        evidencia_esperada="Presenta operaciones y resultado.",
        peso_porcentaje=Decimal("40.00"),
        puntaje_maximo=Decimal("2.00"),
        niveles_json=[],
        source_refs_json=[{"pagina": 2}],
        official_standard_refs_json=[],
    )
    snapshot = criterion_snapshot(criterion)

    assert snapshot["peso_porcentaje"] == 40.0
    assert snapshot["source_refs"] == [{"pagina": 2}]
    assert canonical_hash(snapshot) == canonical_hash(dict(reversed(list(snapshot.items()))))

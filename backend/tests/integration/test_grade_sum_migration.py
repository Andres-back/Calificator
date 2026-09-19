from pathlib import Path


MIGRATION = (
    Path(__file__).resolve().parents[2]
    / "alembic"
    / "versions"
    / "202609190001_authoritative_breakdown_score.py"
)


def test_backfill_is_limited_to_complete_pending_automatic_suggestions():
    source = MIGRATION.read_text(encoding="utf-8")

    assert 'down_revision: Union[str, None] = "202609170001"' in source
    assert "d.activo IS TRUE" in source
    assert "d.origen = 'automatico'" in source
    assert "d.cobertura_estado = 'completa'" in source
    assert "d.requiere_revision IS FALSE" in source
    assert "c.nota_confirmada IS NULL" in source
    assert "c.revisado_por_docente IS FALSE" in source
    assert "c.estado = 'sugerida'" in source
    assert "c.nota_sugerida IS DISTINCT FROM d.nota_final" in source


def test_backfill_preserves_model_score_and_has_scoped_downgrade():
    source = MIGRATION.read_text(encoding="utf-8")

    assert "'nota_modelo_global', c.nota_sugerida" in source
    assert "'nota_calculada', d.nota_final" in source
    assert "'reconciliacion_migracion', '202609190001'" in source
    assert "nota_modelo_global')::numeric" in source
    assert source.count("c.nota_confirmada IS NULL") == 2
    assert source.count("c.revisado_por_docente IS FALSE") == 2

"""Opt-in synthetic profiling, never app credentials or a production database."""
import json
import os
import statistics
import time

import pytest

from app.core.config import settings
from app.modules.evaluaciones.document_visual_extractor import extract_visual_document
from app.modules.evaluaciones.schemas import EvaluacionUpdate
from app.modules.evaluaciones.service import get_evaluation_or_404, update_evaluation
from tests.fixtures.evaluation_visuals import all_visual_documents
from tests.integration.test_evaluation_visual_persistence import (
    TEST_URL, legacy_evaluation,
)
from tests.integration import test_evaluation_visual_persistence as persistence

database = persistence.database
visual_scope = persistence.visual_scope

pytestmark = pytest.mark.skipif(not TEST_URL or not os.getenv('SPEC101_PROFILE'), reason='Perfil aislado explícito SPEC101_PROFILE')


@pytest.mark.asyncio
async def test_six_complete_document_profile():
    records = []
    for sample in all_visual_documents():
        started = time.perf_counter()
        result = await extract_visual_document(sample.content, sample.mime)
        assert result.coverage.paginas_detectadas == result.coverage.paginas_conservadas
        assert all(page.asset_key in result.assets for page in result.pages)
        records.append({'sample': sample.name, 'input_bytes': len(sample.content),
            'extraction_render_ms': round((time.perf_counter() - started) * 1000, 2),
            'pages': len(result.pages), 'elements': len(result.elements), 'assets': len(result.assets),
            'asset_bytes': sum(len(asset.content) for asset in result.assets.values()), 'provider_calls': 0,
            'coverage': result.coverage.estado})
    print('SPEC101_DOCUMENT_PROFILE=' + json.dumps(records))


@pytest.mark.asyncio
async def test_legacy_text_open_save_p95_rollout_comparison(visual_scope, monkeypatch):
    sessions, owner, subject, _ = visual_scope
    samples = {False: {'open': [], 'save': []}, True: {'open': [], 'save': []}}
    async with sessions() as db:
        evaluation_id, _, _ = await legacy_evaluation(db, owner, subject)
        for iteration in range(170):
            # Alternate order to avoid attributing warmup/IO noise to rollout.
            for enabled in ((False, True) if iteration % 2 else (True, False)):
                for flag in ('EVALUATION_VISUAL_IMPORT_ENABLED', 'EVALUATION_VISUAL_EDITOR_ENABLED', 'EVALUATION_VISUAL_GENERATION_ENABLED'):
                    monkeypatch.setattr(settings, flag, enabled)
                started = time.perf_counter()
                evaluation = await get_evaluation_or_404(db, evaluation_id)
                opened = (time.perf_counter() - started) * 1000
                started = time.perf_counter()
                await update_evaluation(db, evaluation, EvaluacionUpdate(nombre=f'Texto sintético {iteration} {enabled}'))
                saved = (time.perf_counter() - started) * 1000
                if iteration >= 20:
                    samples[enabled]['open'].append(opened); samples[enabled]['save'].append(saved)
        assert evaluation.contenido_version_id is None
    report = {str(enabled): {stage: round(statistics.quantiles(values, n=100)[94], 3)
                            for stage, values in stages.items()} for enabled, stages in samples.items()}
    print('SPEC101_TEXT_P95_MS=' + json.dumps(report))

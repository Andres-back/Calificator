import base64
from hashlib import sha256
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.modules.calificaciones.agents import AgentContext, OpenCodeClient, _prepare_multimodal_images, partition_grading_context
from app.modules.calificaciones.evidence_manifest import canonical_pages_fingerprint
from app.modules.calificaciones.evidence_preparation import CanonicalEvidencePage, CanonicalEvidencePages
from app.services.vision_extractor import ExtractedAnswer, VisionExtractor, VisionPageResult, _pages


def canonical():
    version = uuid4()
    images = tuple(CanonicalEvidencePage(index, data, "image/jpeg", 800, 1100, sha256(data).hexdigest())
                   for index, data in enumerate((b"\xff\xd8\xffsynthetic-first", b"\xff\xd8\xffsynthetic-second"), 1))
    return CanonicalEvidencePages(version, uuid4(), canonical_pages_fingerprint(version, [page.sha256 for page in images]), images)


def test_both_model_input_resolvers_use_exact_canonical_bytes_without_pdf_or_filters(monkeypatch):
    images = canonical()
    def forbidden(*_args, **_kwargs):
        raise AssertionError("A canonical page must not be decoded, rotated or encoded again")
    monkeypatch.setattr("app.services.vision_extractor.prepare_orientation_variants", forbidden)
    monkeypatch.setattr("app.modules.calificaciones.agents.prepare_orientation_variants", forbidden)
    assert _prepare_multimodal_images(b"not-a-pdf", "application/pdf", canonical_pages=images) == images.images()
    assert _pages(b"not-a-pdf", "application/pdf", canonical_pages=images) == [(p.number, p.content, p.mime, False) for p in images.pages]


@pytest.mark.asyncio
async def test_extraction_keeps_canonical_fingerprint_and_page_order_without_extra_calls(monkeypatch):
    images = canonical()
    seen = []
    async def one(_self, item, _total, _blueprint, _purpose):
        seen.append(item)
        return VisionPageResult(page=item[0], status="extracted", model="synthetic-only", size_bytes=len(item[1]),
                                answers=[ExtractedAnswer(page=item[0], question_number=item[0], answer=f"Answer {item[0]}")])
    monkeypatch.setattr(VisionExtractor, "_one", one)
    result = await VisionExtractor(api_key="synthetic-only-not-a-credential").extract(
        b"first-page-marker", "image/jpeg", canonical_pages=images)
    assert len(seen) == 2
    assert [item[1] for item in seen] == [page.content for page in images.pages]
    assert result.source_fingerprint == images.fingerprint
    assert result.pages_processed == 2


@pytest.mark.asyncio
async def test_grader_chat_attaches_the_same_two_images_not_the_placeholder(monkeypatch):
    images = canonical()
    chat = AsyncMock(return_value={"choices": []})
    await OpenCodeClient.chat_multimodal(SimpleNamespace(chat=chat), model="synthetic", text="Synthetic question",
                                        image_bytes=b"first-page-marker", canonical_pages=images)
    blocks = chat.await_args.kwargs["messages"][0]["content"]
    actual = [base64.b64decode(block["image_url"]["url"].split(",", 1)[1]) for block in blocks if block.get("type") == "image_url"]
    assert actual == [page.content for page in images.pages]


def test_question_partition_never_drops_canonical_evidence(monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "PHOTO_GRADING_CONTEXT_BUDGET_CHARS", 1000)
    images = canonical()
    questions = [{"numero": n, "enunciado": "Synthetic " * 200, "puntaje": 1} for n in [1, 2]]
    ctx = AgentContext(evaluacion_nombre="Synthetic", nota_maxima=2, blueprint={"preguntas": questions},
                       student_response_text="P1: One\nP2: Two", image_bytes=b"marker", canonical_pages=images)
    parts = partition_grading_context(ctx, [{"numero": 1, "respuesta": "One"}, {"numero": 2, "respuesta": "Two"}])
    assert len(parts) == 2
    assert all(part.canonical_pages is images for part in parts)

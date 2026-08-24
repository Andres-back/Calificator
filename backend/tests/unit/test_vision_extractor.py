from __future__ import annotations

import asyncio
import json
from io import BytesIO

import httpx
import pytest
from PIL import Image, ImageFilter

from app.services import vision_extractor as module
from app.services.vision_extractor import (
    ExtractedAnswer,
    VisionExtractionError,
    VisionExtractor,
    VisionPageResult,
    _merge,
    _normalize,
    _pages,
    _parse_json,
)


def _image(fmt: str = "JPEG", *, rotated: bool = False) -> bytes:
    image = Image.new("RGB", (900, 600), "white")
    if rotated:
        exif = image.getexif()
        exif[274] = 6
    else:
        exif = None
    buffer = BytesIO()
    if exif is None:
        image.save(buffer, format=fmt)
    else:
        image.save(buffer, format=fmt, exif=exif)
    return buffer.getvalue()


def _pdf(page_count: int = 2) -> bytes:
    import fitz

    document = fitz.open()
    for number in range(1, page_count + 1):
        page = document.new_page(width=600, height=800)
        page.insert_text((72, 72), f"Pagina {number}: respuesta {number}")
    content = document.tobytes()
    document.close()
    return content


@pytest.mark.parametrize(("content", "mime", "pages"), [
    (_image("JPEG"), "image/jpeg", 1),
    (_image("PNG"), "image/png", 1),
    (_image("JPEG", rotated=True), "image/jpeg", 1),
    (_pdf(2), "application/pdf", 2),
])
def test_preparation_accepts_supported_evidence(content: bytes, mime: str, pages: int) -> None:
    prepared = _pages(content, mime)
    assert len(prepared) == pages
    assert all(item[1] for item in prepared)


def test_preparation_keeps_blurred_evidence_for_reviewable_extraction() -> None:
    image = Image.new("RGB", (900, 600), "white").filter(ImageFilter.GaussianBlur(radius=4))
    buffer = BytesIO()
    image.save(buffer, format="JPEG")
    prepared = _pages(buffer.getvalue(), "image/jpeg")
    assert len(prepared) == 1
    assert prepared[0][1]

def test_preparation_rejects_corrupt_evidence() -> None:
    with pytest.raises(VisionExtractionError) as exc:
        _pages(b"not-an-image", "image/jpeg")
    assert exc.value.code == "vision_invalid_file"


def test_illegible_answer_can_never_become_wrong_answer() -> None:
    answer = ExtractedAnswer(
        question_number=1,
        answer="inventada",
        confidence=0.2,
        page=1,
        legible=False,
        blank=True,
    )
    assert answer.answer is None
    assert answer.blank is False
    assert answer.needs_review is True


def test_blank_answer_remains_distinct_from_illegible() -> None:
    answer = ExtractedAnswer(
        question_number=3,
        answer="contenido que debe descartarse",
        confidence=0.99,
        page=1,
        legible=True,
        blank=True,
    )
    assert answer.answer is None
    assert answer.blank is True
    assert answer.needs_review is False


def test_json_parser_accepts_strict_object() -> None:
    parsed, repaired = _parse_json('{"answers": [], "warnings": []}')
    assert parsed["answers"] == []
    assert repaired is False


def test_normalization_preserves_objective_and_open_answers_without_grading() -> None:
    result = _normalize({
        "document_quality": 0.8,
        "page_text": "1. B  2. explicación propia",
        "answers": [
            {"question_number": 1, "answer": "B", "confidence": 0.9, "legible": True},
            {"question_number": 2, "answer": "explicación propia", "confidence": 0.8, "legible": True},
        ],
    }, page=1, size=100)
    assert [answer.answer for answer in result.answers] == ["B", "explicación propia"]
    assert not hasattr(result, "score")

def test_json_parser_repairs_only_safe_wrappers_and_trailing_comma() -> None:
    parsed, repaired = _parse_json('```json\n{"answers": [],}\n```')
    assert parsed == {"answers": []}
    assert repaired is True


def test_json_parser_rejects_non_json() -> None:
    with pytest.raises(VisionExtractionError):
        _parse_json("respuesta libre sin objeto")


def test_multipage_merge_keeps_source_and_uncertainty() -> None:
    pages = [
        VisionPageResult(
            page=1,
            status="extracted",
            answers=[ExtractedAnswer(question_number=2, answer="inicio", confidence=0.9, page=1)],
        ),
        VisionPageResult(
            page=2,
            status="requires_review",
            answers=[ExtractedAnswer(question_number=2, answer=None, confidence=0.3, page=2, legible=False)],
        ),
    ]
    merged = _merge(pages)
    assert merged[0].source_pages == [1, 2]
    assert merged[0].answer is None
    assert merged[0].needs_review is True


class _Response:
    def __init__(self, status: int, payload: dict | None = None) -> None:
        self.status_code = status
        self._payload = payload or {}

    def json(self) -> dict:
        return self._payload

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            request = httpx.Request("POST", "https://opencode.ai/zen/go/v1/chat/completions")
            response = httpx.Response(self.status_code, request=request)
            raise httpx.HTTPStatusError("provider error", request=request, response=response)


class _Client:
    def __init__(self, responses: list[_Response | Exception], calls: list[dict], **_: object) -> None:
        self.responses = responses
        self.calls = calls

    async def __aenter__(self) -> "_Client":
        return self

    async def __aexit__(self, *_: object) -> None:
        return None

    async def post(self, _url: str, **kwargs: object) -> _Response:
        self.calls.append(kwargs["json"])
        response = self.responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response


def _success(answer: str = "27") -> _Response:
    content = {
        "student_detected": True,
        "document_quality": 0.9,
        "page_text": f"1. {answer}",
        "answers": [{
            "question_number": 1,
            "answer": answer,
            "confidence": 0.95,
            "legible": True,
            "blank": False,
            "needs_review": False,
        }],
        "warnings": [],
    }
    return _Response(200, {
        "choices": [{"message": {"content": json.dumps(content)}}],
        "usage": {"prompt_tokens": 10, "completion_tokens": 10},
    })


def _configured_extractor(monkeypatch: pytest.MonkeyPatch, responses: list[_Response | Exception], calls: list[dict]) -> VisionExtractor:
    extractor = VisionExtractor(primary_model="deepseek-v4-flash-vision-exp")

    async def keys() -> list[str]:
        return ["test-key"]

    async def event(*_args: object, **_kwargs: object) -> None:
        return None

    monkeypatch.setattr(extractor, "_keys", keys)
    monkeypatch.setattr(extractor, "_event", event)
    monkeypatch.setattr(module.httpx, "AsyncClient", lambda **kwargs: _Client(responses, calls, **kwargs))
    return extractor


def test_429_is_retried_once_then_succeeds(monkeypatch: pytest.MonkeyPatch) -> None:
    responses = [_Response(429), _success()]
    calls: list[dict] = []
    extractor = _configured_extractor(monkeypatch, responses, calls)
    monkeypatch.setattr(module.settings, "VISION_MAX_RETRIES", 1)
    monkeypatch.setattr(module.settings, "VISION_FALLBACK_ENABLED", False)
    result = asyncio.run(extractor.extract(_image(), "image/jpeg"))
    assert result.answers[0].answer == "27"
    assert len(calls) == 2


def test_timeout_is_retried_once_and_stays_temporary(monkeypatch: pytest.MonkeyPatch) -> None:
    request = httpx.Request("POST", "https://opencode.ai/zen/go/v1/chat/completions")
    responses = [
        httpx.ReadTimeout("slow", request=request),
        httpx.ReadTimeout("slow", request=request),
    ]
    calls: list[dict] = []
    extractor = _configured_extractor(monkeypatch, responses, calls)
    monkeypatch.setattr(module.settings, "VISION_MAX_RETRIES", 1)
    monkeypatch.setattr(module.settings, "VISION_FALLBACK_ENABLED", False)
    with pytest.raises(VisionExtractionError) as exc:
        asyncio.run(extractor.extract(_image(), "image/jpeg"))
    assert exc.value.code == "vision_failed_temporary"
    assert exc.value.temporary is True
    assert len(calls) == 2

def test_500_is_not_retried(monkeypatch: pytest.MonkeyPatch) -> None:
    responses = [_Response(500)]
    calls: list[dict] = []
    extractor = _configured_extractor(monkeypatch, responses, calls)
    monkeypatch.setattr(module.settings, "VISION_MAX_RETRIES", 1)
    monkeypatch.setattr(module.settings, "VISION_FALLBACK_ENABLED", False)
    with pytest.raises(VisionExtractionError) as exc:
        asyncio.run(extractor.extract(_image(), "image/jpeg"))
    assert exc.value.code == "vision_failed_permanent"
    assert len(calls) == 1


def test_explicit_fallback_is_visible(monkeypatch: pytest.MonkeyPatch) -> None:
    responses = [_Response(500), _success("18")]
    calls: list[dict] = []
    extractor = _configured_extractor(monkeypatch, responses, calls)
    monkeypatch.setattr(module.settings, "VISION_MAX_RETRIES", 0)
    monkeypatch.setattr(module.settings, "VISION_FALLBACK_ENABLED", True)
    monkeypatch.setattr(module.settings, "VISION_FALLBACK_MODELS", "qwen3.7-plus")
    result = asyncio.run(extractor.extract(_image(), "image/jpeg"))
    assert result.fallback_used is True
    assert result.fallback_model == "qwen3.7-plus"
    assert calls[0]["model"] == "deepseek-v4-flash-vision-exp"
    assert calls[1]["model"] == "qwen3.7-plus"


def test_sideways_photo_retries_orientation_without_creating_pages(monkeypatch: pytest.MonkeyPatch) -> None:
    empty = _Response(200, {
        "choices": [{"message": {"content": json.dumps({
            "student_detected": False,
            "document_quality": 0.4,
            "page_text": "",
            "answers": [],
            "warnings": [],
        })}}],
        "usage": {"prompt_tokens": 5, "completion_tokens": 5},
    })
    responses = [empty, _success("73,69")]
    calls: list[dict] = []
    extractor = _configured_extractor(monkeypatch, responses, calls)
    monkeypatch.setattr(module.settings, "VISION_MAX_RETRIES", 0)
    monkeypatch.setattr(module.settings, "VISION_FALLBACK_ENABLED", False)

    result = asyncio.run(extractor.extract(_image(), "image/jpeg"))

    assert result.pages_processed == 1
    assert result.rotation_applied == 90
    assert result.answers[0].answer == "73,69"
    assert len(calls) == 2

def test_partial_pdf_failure_requires_teacher_review(monkeypatch: pytest.MonkeyPatch) -> None:
    extractor = VisionExtractor(primary_model="deepseek-v4-flash-vision-exp")

    async def one(item, _total, _blueprint, _purpose):
        page = item[0]
        if page == 2:
            return VisionPageResult(page=2, status="failed_temporary", error_code="vision_timeout")
        return VisionPageResult(
            page=1,
            status="extracted",
            document_quality=0.8,
            page_text="1. respuesta",
            answers=[ExtractedAnswer(question_number=1, answer="respuesta", confidence=0.9, page=1)],
        )

    monkeypatch.setattr(extractor, "_one", one)
    result = asyncio.run(extractor.extract(_pdf(2), "application/pdf"))
    assert result.pages_processed == 2
    assert result.requires_review is True
    assert result.failure_reason == "vision_timeout"

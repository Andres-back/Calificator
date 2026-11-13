"""Spec 156, Historia 1: a reading replaced by a marker is read again once."""
from __future__ import annotations

import asyncio
from io import BytesIO

import pytest
from fastapi import HTTPException
from PIL import Image

from app.modules.evaluaciones import reading_completeness as rc

STORY = "Había una vez una liebre muy rápida y orgullosa.\nUn día la liebre le propuso una carrera."


@pytest.mark.parametrize("text", [
    "La liebre y la tortuga (lectura) + Moraleja: La constancia ayuda.",
    "El clima en América (texto completo)",
    "Lee el texto.\n[texto de la lectura]\n1. ¿Dónde nace el río?",
    "Lee el cuento.\n...\n1. ¿Quién ganó?",
    "Lee el cuento.\n…\n1. ¿Quién ganó?",
    "Lectura omitida por extensión.\n1. ¿Quién ganó?",
    "El cuento no transcrito aparece arriba.",
    "La liebre y la tortuga (fábula con moraleja: La constancia y el esfuerzo nos ayudan).",
])
def test_markers_are_detected(text):
    assert rc.has_incomplete_reading(text)


@pytest.mark.parametrize("text", [
    "Lee el texto y responde.\n" + STORY + "\n1. ¿Quién ganó? a) La liebre b) La tortuga",
    "1. Escribe tu opinión (mínimo tres líneas).",
    "[RESPUESTA DEL ESTUDIANTE: la tortuga]",
    "2. Completa: la tortuga llegó ... a la meta.",
    "",
])
def test_complete_text_is_not_flagged(text):
    assert not rc.has_incomplete_reading(text)


SUMMARY_ONLY = ("=== PÁGINA 1 ===\nLa liebre y la tortuga. Moraleja: la constancia ayuda. Comprensión referencial: "
                "1. ¿Quiénes son los personajes de la historia? A. Un león B. Una liebre 2. ¿Qué le propuso la liebre?")
LONG_STORY = " ".join(["La tortuga caminaba despacio por el bosque mientras la liebre dormía bajo un árbol."] * 4)


def test_a_cited_reading_that_is_absent_is_detected_without_markers():
    assert rc.pages_to_reread(rc.split_pages(SUMMARY_ONLY)) == [1]


def test_a_cited_reading_on_another_page_is_not_flagged():
    text = ("=== PÁGINA 1 ===\nLee el cuento.\n" + LONG_STORY + "\n1. ¿Quién ganó?\n"
            "=== PÁGINA 2 ===\n5. Según el texto, ¿qué aprendió la liebre?")
    assert rc.pages_to_reread(rc.split_pages(text)) == []


def test_a_question_range_in_the_instructions_is_not_mistaken_for_question_one():
    # Real case: the climate page says "responde las preguntas 1 a 10." before its reading.
    text = ("=== PÁGINA 1 ===\nLee el siguiente texto y responde las preguntas 1 a 10.\n\nEl clima en América\n"
            + LONG_STORY + "\n1. Según el texto, ¿qué es el clima?\nA) El relieve B) Las condiciones")
    assert rc.pages_to_reread(rc.split_pages(text)) == []


def test_a_summary_on_one_line_with_all_questions_is_still_flagged():
    text = ("=== PÁGINA 1 ===\nLa liebre y la tortuga + Moraleja: la constancia ayuda. Comprensión referencial: "
            "1. ¿Quiénes son los personajes de la historia? A. Un león y una tortuga. B. Una liebre y una tortuga. "
            "C. Un zorro y una liebre. 2. ¿Qué le propuso la liebre a la tortuga? A. Una caminata. B. Una carrera.")
    assert rc.pages_to_reread(rc.split_pages(text)) == [1]


def test_a_test_without_reading_is_not_flagged():
    assert rc.pages_to_reread(rc.split_pages("1. ¿Cuánto es 6 × 4?\n2. Escribe tu opinión sobre el agua.")) == []


def test_pages_are_split_and_joined_without_changes():
    text = "=== PÁGINA 1 ===\nuno\n=== PÁGINA 2 ===\ndos (lectura)"
    pages = rc.split_pages(text)
    assert [number for number, _ in pages] == [1, 2]
    assert rc.join_pages(pages) == text
    assert rc.split_pages("sin marcas") == [(1, "sin marcas")]
    assert rc.join_pages([(1, "sin marcas")]) == "sin marcas"


def run(text, read_page, pages_available=(1,)):
    async def load(number):
        return (b"img", "image/jpeg") if number in pages_available else None
    return asyncio.run(rc.complete_readings(text, ["aviso previo"], load_page=load, read_page=read_page))


def test_complete_text_makes_no_extra_call():
    calls = []
    async def read_page(*args):
        calls.append(args)
        return STORY, []
    assert run("1. ¿Quién ganó?\n" + STORY, read_page) == ("1. ¿Quién ganó?\n" + STORY, ["aviso previo"])
    assert calls == []


def test_only_the_incomplete_page_is_read_again_once():
    calls = []
    async def read_page(content, mime, number):
        calls.append(number)
        return "=== PÁGINA 2 ===\nLa liebre y la tortuga\n" + STORY, ["aviso de la relectura"]
    text = "=== PÁGINA 1 ===\nPortada completa\n=== PÁGINA 2 ===\nLa liebre y la tortuga (lectura)\n1. ¿Quién ganó?"
    result, warnings = run(text, read_page, pages_available=(1, 2))
    assert calls == [2]
    assert result.startswith("=== PÁGINA 1 ===\nPortada completa\n=== PÁGINA 2 ===\nLa liebre y la tortuga\nHabía una vez")
    assert "(lectura)" not in result
    assert warnings == ["aviso previo", "Se volvió a leer la hoja 2 para transcribir su lectura completa."]


def test_a_second_incomplete_reading_keeps_the_original_and_names_the_page():
    async def read_page(content, mime, number):
        return "La liebre y la tortuga (lectura)", []
    text = "La liebre y la tortuga (lectura)\n1. ¿Quién ganó?"
    result, warnings = run(text, read_page)
    assert result == text
    assert warnings[-1] == "La lectura de la hoja 1 quedó incompleta. Revísala o pégala en el borrador antes de publicar."


def test_a_failed_reread_keeps_the_original_and_warns():
    async def read_page(content, mime, number):
        raise HTTPException(503, "sin proveedor")
    text = "Texto (lectura)\n1. ¿Quién ganó?"
    result, warnings = run(text, read_page)
    assert result == text
    assert "hoja 1 quedó incompleta" in warnings[-1]


def test_a_page_that_cannot_be_loaded_is_only_warned():
    async def read_page(*args):
        raise AssertionError("no debe leer")
    result, warnings = run("=== PÁGINA 3 ===\nTexto (lectura)", read_page, pages_available=())
    assert "hoja 3 quedó incompleta" in warnings[-1]


def test_reread_prompt_asks_for_literal_text():
    assert "literal" in rc.LITERAL_READING_PROMPT.lower()
    assert "(lectura)" in rc.LITERAL_READING_PROMPT
    # Spec 179: el prompt habla el contrato que interpreta el lector (page_text y answers).
    assert "answers como lista vacía" in rc.LITERAL_READING_PROMPT


def test_pdf_pages_render_one_at_a_time():
    images = [Image.new("RGB", (200, 280), color) for color in ("white", "gray")]
    buffer = BytesIO()
    images[0].save(buffer, format="PDF", save_all=True, append_images=images[1:])
    content = buffer.getvalue()
    second = rc.render_pdf_page(content, 2)
    assert second is not None and second[1] == "image/png"
    with Image.open(BytesIO(second[0])) as page:
        assert max(page.size) > 0
    assert rc.render_pdf_page(content, 3) is None


def test_photo_digitalization_reads_the_incomplete_photo_again_with_the_literal_prompt(monkeypatch):
    from app.modules.evaluaciones import digitalize_service as ds
    calls = []

    async def fake_extract(content, mime, name, user_id=None, ai_config=None, *, prompt_override=None):
        calls.append(prompt_override)
        if prompt_override is None:
            return "=== PÁGINA 1 ===\nLa liebre y la tortuga (lectura)\n1. ¿Quién ganó?", ["calidad"]
        return "=== PÁGINA 1 ===\nLa liebre y la tortuga\n" + STORY + "\n1. ¿Quién ganó?", []

    monkeypatch.setattr(ds, "_extract_image_text", fake_extract)
    text, warnings = asyncio.run(ds.extract_evaluation_text(b"photo", "image/jpeg", "hoja.jpg"))
    assert len(calls) == 2 and calls[1].endswith(rc.LITERAL_READING_PROMPT)
    assert "Había una vez" in text and "(lectura)" not in text
    assert warnings == ["calidad", "Se volvió a leer la hoja 1 para transcribir su lectura completa."]


def test_photo_with_complete_reading_is_read_once(monkeypatch):
    from app.modules.evaluaciones import digitalize_service as ds
    calls = []

    async def fake_extract(content, mime, name, user_id=None, ai_config=None, *, prompt_override=None):
        calls.append(prompt_override)
        return STORY + "\n1. ¿Quién ganó?", []

    monkeypatch.setattr(ds, "_extract_image_text", fake_extract)
    assert asyncio.run(ds.extract_evaluation_text(b"photo", "image/jpeg", "hoja.jpg"))[0].startswith("Había una vez")
    assert calls == [None]


def test_multi_photo_pdf_rereads_only_the_incomplete_page(monkeypatch):
    from app.modules.evaluaciones import digitalize_service as ds
    images = [Image.new("RGB", (200, 280), "white") for _ in range(2)]
    buffer = BytesIO()
    images[0].save(buffer, format="PDF", save_all=True, append_images=images[1:])
    reread = []

    async def fake_pdf(content, name, user_id=None, ai_config=None, on_page_done=None):
        return "=== PÁGINA 1 ===\nPortada\n=== PÁGINA 2 ===\nCuento (lectura)\n2. ¿Quién ganó?", []

    async def fake_extract(content, mime, name, user_id=None, ai_config=None, *, prompt_override=None):
        reread.append((mime, name))
        return "Cuento\n" + STORY + "\n2. ¿Quién ganó?", []

    monkeypatch.setattr(ds, "extraer_texto_pdf", lambda _content: "")
    monkeypatch.setattr(ds, "_extract_scanned_pdf", fake_pdf)
    monkeypatch.setattr(ds, "_extract_image_text", fake_extract)
    text, _warnings = asyncio.run(ds.extract_evaluation_text(buffer.getvalue(), "application/pdf", "hojas.pdf"))
    assert reread == [("image/png", "Hoja 2")]
    assert text.startswith("=== PÁGINA 1 ===\nPortada\n=== PÁGINA 2 ===\nCuento\nHabía una vez")


# --- Spec 156, PR 2: missing pages and page numbering ---------------------------------

def test_reread_of_a_later_pdf_page_keeps_its_own_page_number():
    async def read_page(content, mime, number):
        # A single page read on its own always comes back as page 1.
        return "=== PÁGINA 1 ===\nCuento\n" + STORY + "\n2. ¿Quién ganó?", []
    text = "=== PÁGINA 1 ===\nPortada completa\n=== PÁGINA 2 ===\nCuento (lectura)\n2. ¿Quién ganó?"
    result, _warnings = run(text, read_page, pages_available=(1, 2))
    assert result.count("=== PÁGINA 2 ===") == 1
    assert result.count("=== PÁGINA 1 ===") == 1
    assert result.index("=== PÁGINA 1 ===") < result.index("Portada") < result.index("=== PÁGINA 2 ===") < result.index("Había una vez")


def test_missing_pages_compare_headers_with_the_page_count():
    text = "=== PÁGINA 1 ===\nuno\n=== PÁGINA 3 ===\ntres"
    assert rc.missing_pages(text, 3) == [2]
    assert rc.missing_pages(text, 1) == []
    assert rc.missing_pages("sin encabezados", 2) == []


GENERIC = ["Una caja tapa el encabezado.", "La lectura de esta página tardó demasiado; puede reintentarse.",
           "Página no extraída automáticamente.", "Faltan páginas; revisión docente obligatoria."]


def fill(text, read_page, total=3):
    async def load(number):
        return (b"img", "image/png")
    return asyncio.run(rc.fill_missing_pages(text, list(GENERIC), total=total, load_page=load, read_page=read_page))


def test_a_missing_page_is_read_alone_and_inserted_in_order():
    calls = []
    async def read_page(content, mime, number):
        calls.append(number)
        return "=== PÁGINA 1 ===\n11. ¿Qué es un río?", ["aviso de la hoja"]
    result, warnings = fill("=== PÁGINA 1 ===\nuno\n=== PÁGINA 3 ===\ntres", read_page)
    assert calls == [2]
    assert result == "=== PÁGINA 1 ===\nuno\n=== PÁGINA 2 ===\n11. ¿Qué es un río?\n=== PÁGINA 3 ===\ntres"
    assert warnings == ["Una caja tapa el encabezado.", "aviso de la hoja", "Se volvió a leer la hoja 2, que no se había podido leer."]


def test_a_page_that_still_fails_is_named_and_generic_warnings_disappear():
    async def read_page(content, mime, number):
        raise HTTPException(503, "sin proveedor")
    result, warnings = fill("=== PÁGINA 1 ===\nuno", read_page, total=2)
    assert result == "=== PÁGINA 1 ===\nuno"
    assert warnings == ["Una caja tapa el encabezado.",
                        "No pudimos leer la hoja 2. Revisa que la foto sea nítida y vuelve a digitalizar esa hoja para añadir sus preguntas."]


def test_complete_documents_keep_their_warnings_and_make_no_calls():
    async def read_page(*args):
        raise AssertionError("no debe leer")
    text = "=== PÁGINA 1 ===\nuno\n=== PÁGINA 2 ===\ndos"
    assert fill(text, read_page, total=2) == (text, GENERIC)


def two_page_pdf():
    images = [Image.new("RGB", (200, 280), "white") for _ in range(2)]
    buffer = BytesIO()
    images[0].save(buffer, format="PDF", save_all=True, append_images=images[1:])
    return buffer.getvalue()


def test_a_lost_pdf_page_is_read_alone_and_the_progress_callback_is_passed(monkeypatch):
    from app.modules.evaluaciones import digitalize_service as ds
    seen = {}

    async def fake_pdf(content, name, user_id=None, ai_config=None, on_page_done=None):
        seen["callback"] = on_page_done
        return "=== PÁGINA 1 ===\nLee el texto.\n" + LONG_STORY + "\n1. ¿Quién ganó?", [
            "La lectura de esta página tardó demasiado; puede reintentarse.", "Faltan páginas; revisión docente obligatoria."]

    async def fake_extract(content, mime, name, user_id=None, ai_config=None, *, prompt_override=None):
        seen.setdefault("lost", []).append((name, prompt_override))
        return "=== PÁGINA 1 ===\n11. ¿Qué es un río?", []

    async def progress(done, total):
        return None

    monkeypatch.setattr(ds, "extraer_texto_pdf", lambda _content: "")
    monkeypatch.setattr(ds, "_extract_scanned_pdf", fake_pdf)
    monkeypatch.setattr(ds, "_extract_image_text", fake_extract)
    text, warnings = asyncio.run(ds.extract_evaluation_text(two_page_pdf(), "application/pdf", "hojas.pdf", on_page_done=progress))
    assert seen["callback"] is progress
    assert seen["lost"] == [("Hoja 2", None)]
    assert text.endswith("=== PÁGINA 2 ===\n11. ¿Qué es un río?")
    assert warnings == ["Se volvió a leer la hoja 2, que no se había podido leer."]


def test_a_single_photo_reports_one_of_one(monkeypatch):
    from app.modules.evaluaciones import digitalize_service as ds
    done = []

    async def fake_extract(content, mime, name, user_id=None, ai_config=None, *, prompt_override=None):
        return STORY + "\n1. ¿Quién ganó?", []

    async def progress(read, total):
        done.append((read, total))

    monkeypatch.setattr(ds, "_extract_image_text", fake_extract)
    asyncio.run(ds.extract_evaluation_text(b"photo", "image/jpeg", "hoja.jpg", on_page_done=progress))
    assert done == [(1, 1)]


def test_the_vision_reader_announces_each_finished_page(monkeypatch):
    from app.services import vision_extractor as vx
    from app.services.vision_extractor import VisionExtractor, VisionPageResult
    announced = []

    async def on_page_done(done, total):
        announced.append((done, total))
        if done == 1:
            raise RuntimeError("una notificación fallida no cambia la lectura")

    async def fake_one(self, item, total, blueprint, purpose):
        return VisionPageResult(page=item[0], status="extracted", warnings=[])

    monkeypatch.setattr(VisionExtractor, "_one", fake_one)
    monkeypatch.setattr(vx, "_merge", lambda success: [])
    extractor = VisionExtractor(tracking={"_on_page_done": on_page_done}, primary_model="m", api_key="k", provider="open_code")
    result = asyncio.run(extractor.extract(two_page_pdf(), "application/pdf", purpose="evaluation_document"))
    assert sorted(announced) == [(1, 2), (2, 2)]
    assert result.pages_processed == 2


def test_the_worker_publishes_pages_read_on_its_own_session(monkeypatch):
    from uuid import uuid4
    from app.workers import tasks_digitalization as worker
    updates, commits = [], []

    class FakeSession:
        async def __aenter__(self):
            return self
        async def __aexit__(self, *exc):
            return False
        async def commit(self):
            commits.append(1)

    async def fake_update(db, job_id, *, progreso, resultado_json):
        updates.append((progreso, resultado_json))
        return True

    monkeypatch.setattr(worker, "AsyncSessionLocal", FakeSession)
    monkeypatch.setattr(worker.jobs_service, "update_job_progress", fake_update)
    result = {"claim_token": "token-1", "stage": "reading"}
    notify = worker._reading_progress(uuid4(), result)
    asyncio.run(notify(1, 3))
    asyncio.run(notify(3, 3))
    assert updates == [
        (25, {"stage": "reading", "lectura_hojas": {"leidas": 1, "total": 3}, "claim_token": "token-1"}),
        (45, {"stage": "reading", "lectura_hojas": {"leidas": 3, "total": 3}, "claim_token": "token-1"}),
    ]
    assert commits == [1, 1] and result["lectura_hojas"] == {"leidas": 3, "total": 3}

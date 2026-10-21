from uuid import uuid4

import pytest
from app.core.config import settings


@pytest.mark.asyncio
async def test_preview_create_public_read_without_session_and_retry(fb_client):
    client, actor, case = fb_client
    evaluation, grade = case[-2:]
    prefix = f"/api/evaluaciones/{evaluation.id}/devoluciones"
    preview = await client.post(prefix + "/previsualizar", json={"calificacion_ids": [str(grade.id)]})
    item = preview.json()["resultados"][0]
    assert item["elegible"] is True
    payload = {"request_id": str(uuid4()), "selecciones": [{"calificacion_id": str(grade.id), "fingerprint": item["fingerprint"]}]}
    created = await client.post(prefix + "/accesos", json=payload)
    assert created.status_code == 200 and "no-store" in created.headers["cache-control"]
    first = created.json()["resultados"][0]
    token = first["url"].split("#")[1]
    duplicate = await client.post(prefix + "/accesos", json=payload)
    assert duplicate.json()["resultados"][0]["id"] == first["id"]
    assert duplicate.json()["resultados"][0]["url"] is None
    actor["user"] = None
    result = await client.get("/api/public/devolucion", headers={"Authorization": f"Bearer {token}"})
    assert result.status_code == 200
    assert result.json()["resultado"]["nota"] == "3.00"
    assert result.json()["cupo"]["restantes"] == 5
    assert "no-store" in result.headers["cache-control"]
    assert "password" not in result.text and "credential_digest" not in result.text
    assert (await client.get("/api/public/devolucion")).status_code == 404


@pytest.mark.asyncio
async def test_student_or_anonymous_cannot_preview_print_or_list(fb_client):
    client, actor, case = fb_client
    prefix = f"/api/evaluaciones/{case[-2].id}/devoluciones"
    actor["user"] = case[1]
    assert (await client.post(prefix + "/previsualizar", json={"calificacion_ids": [str(case[-1].id)]})).status_code == 403
    assert (await client.get(prefix + "/accesos")).status_code == 403
    actor["user"] = None
    assert (await client.get(prefix + "/accesos")).status_code == 401


@pytest.mark.asyncio
async def test_public_scope_cannot_be_selected_in_query_or_body(fb_client):
    client, _, case = fb_client
    response = await client.get(f"/api/public/devolucion?estudiante_id={case[1].id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_disabled_flag_hides_surface_without_altering_grades(fb_client, monkeypatch):
    client, _, case = fb_client
    monkeypatch.setattr(settings, "FEEDBACK_SHARING_ENABLED", False)
    assert (await client.get("/api/devoluciones/disponibilidad")).json() == {"enabled": False}
    assert (await client.post(f"/api/evaluaciones/{case[-2].id}/devoluciones/previsualizar", json={"calificacion_ids": [str(case[-1].id)]})).status_code == 404


@pytest.mark.asyncio
async def test_partial_batch_explicitly_excludes_missing_result_without_undoing_good_one(fb_client):
    client, _, case = fb_client
    prefix = f"/api/evaluaciones/{case[-2].id}/devoluciones"
    missing = str(uuid4())
    preview = (await client.post(prefix + "/previsualizar", json={"calificacion_ids": [str(case[-1].id), missing]})).json()["resultados"]
    assert preview[0]["elegible"] and not preview[1]["elegible"]
    selections = [{"calificacion_id": str(case[-1].id), "fingerprint": preview[0]["fingerprint"]}, {"calificacion_id": missing, "fingerprint": "0" * 64}]
    created = (await client.post(prefix + "/accesos", json={"request_id": str(uuid4()), "selecciones": selections})).json()["resultados"]
    assert created[0]["url"] and created[1]["error"]
    listed = await client.get(prefix + "/accesos")
    assert listed.status_code == 200 and len(listed.json()["resultados"]) == 1
    assert "url" not in listed.text

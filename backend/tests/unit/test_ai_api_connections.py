import pytest
import httpx
import asyncio
from unittest.mock import AsyncMock

from app.services.ai_api_connections import (
    APIConnectionError,
    model_check_fingerprint,
    validate_api_base_url,
)


@pytest.mark.parametrize(
    "url",
    [
        "http://api.example/v1",
        "https://user:password@api.example/v1",
        "https://localhost/v1",
        "https://127.0.0.1/v1",
        "https://169.254.169.254/latest",
        "https://[::1]/v1",
        "https://10.0.0.1/v1",
        "https://api.example/v1?key=secret",
        "https://api.example/v1#secret",
    ],
)
def test_rejects_unsafe_external_connections(url):
    with pytest.raises(APIConnectionError):
        validate_api_base_url(url, addresses=["8.8.8.8"])


def test_dns_must_not_include_any_private_address():
    with pytest.raises(APIConnectionError):
        validate_api_base_url(
            "https://api.example/v1", addresses=["8.8.8.8", "192.168.1.2"]
        )


def test_connection_preserves_public_gateway_path():
    assert (
        validate_api_base_url("https://api.example/gateway/v1/", addresses=["8.8.8.8"])
        == "https://api.example/gateway/v1"
    )


def test_probe_is_bound_to_destination_model_profile_capabilities_and_credential_revision():
    arguments = {
        "provider_id": "api_test",
        "base_url": "https://api.example/v1",
        "model_id": "new-model",
        "profile": {"protocol": "responses"},
        "capabilities": ["vision", "text"],
        "credential_revision": "revision1",
    }
    fingerprint = model_check_fingerprint(**arguments)
    assert fingerprint == model_check_fingerprint(
        **{**arguments, "capabilities": ["text", "vision"]}
    )
    for field, changed in [
        ("base_url", "https://other.example/v1"),
        ("model_id", "newer-model"),
        ("profile", {"protocol": "messages"}),
        ("capabilities", ["text"]),
        ("credential_revision", "revision2"),
    ]:
        assert fingerprint != model_check_fingerprint(**{**arguments, field: changed})


def test_rebinding_is_rejected_before_tcp_connection(monkeypatch):
    from app.services.ai_api_connections import _PublicNetworkBackend

    delegate = AsyncMock()
    monkeypatch.setattr(
        "socket.getaddrinfo", lambda *args: [(2, 1, 6, "", ("127.0.0.1", 443))]
    )
    with pytest.raises(APIConnectionError):
        asyncio.run(_PublicNetworkBackend(delegate).connect_tcp("api.example", 443))
    delegate.connect_tcp.assert_not_called()


def test_call_uses_the_configured_origin_protocol_and_keeps_images(monkeypatch):
    import app.services.ai_api_connections as connections

    monkeypatch.setattr(connections, "validate_api_base_url", lambda url, **_: url)
    seen = []

    def handle(request):
        import json

        seen.append(
            (str(request.url), dict(request.headers), json.loads(request.content))
        )
        return httpx.Response(
            200,
            json={
                "status": "completed",
                "model": "unknown-model",
                "output": [
                    {
                        "type": "message",
                        "content": [{"type": "output_text", "text": '{"ok":true}'}],
                    }
                ],
            },
        )

    selection = {
        "provider": "api_independent",
        "model": "unknown-model",
        "connection": {"base_url": "https://independent.example/v7"},
        "runtime_profile": {"protocol": "responses"},
    }
    result = asyncio.run(
        connections.call_configured_api(
            selection,
            "synthetic-own-key",
            [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Inspect"},
                        {
                            "type": "image_url",
                            "image_url": {"url": "data:image/png;base64,YWJj"},
                        },
                    ],
                }
            ],
            max_tokens=1234,
            json_mode=True,
            transport=httpx.MockTransport(handle),
        )
    )
    assert seen[0][0] == "https://independent.example/v7/responses"
    assert seen[0][1]["authorization"] == "Bearer synthetic-own-key"
    assert seen[0][2]["input"][0]["content"][1]["image_url"].endswith("YWJj")
    assert result["model"] == "unknown-model"


@pytest.mark.parametrize("status", [301, 302, 307, 308])
def test_redirect_never_receives_a_second_request(monkeypatch, status):
    import app.services.ai_api_connections as connections

    monkeypatch.setattr(connections, "validate_api_base_url", lambda url, **_: url)
    calls = []

    def handle(request):
        calls.append(str(request.url))
        return httpx.Response(
            status, headers={"Location": "https://another.example/stolen"}
        )

    with pytest.raises((APIConnectionError, httpx.HTTPStatusError)):
        asyncio.run(
            connections.call_configured_api(
                {
                    "model": "new-model",
                    "connection": {"base_url": "https://api.example/v1"},
                    "runtime_profile": {"protocol": "chat_completions"},
                },
                "synthetic",
                [{"role": "user", "content": "text"}],
                max_tokens=100,
                json_mode=False,
                transport=httpx.MockTransport(handle),
            )
        )
    assert calls == ["https://api.example/v1/chat/completions"]


def test_grading_client_never_sends_a_direct_api_key_to_a_legacy_model():
    from app.modules.calificaciones.agents import OpenCodeClient

    async def scenario():
        client = OpenCodeClient(
            tracking={
                "_ai_config": {
                    "primary": {
                        "provider": "api_direct",
                        "model": "configured-model",
                        "runtime_profile": {"protocol": "responses"},
                        "connection": {
                            "base_url": "https://direct.example/v1",
                            "credential_revision": "revision1",
                        },
                    }
                }
            }
        )
        client.api_key = "synthetic-direct-key"
        client._client.post = AsyncMock()
        with pytest.raises(ValueError, match="ruta capturada"):
            await client.chat(
                "different-legacy-model", [{"role": "user", "content": "x"}]
            )
        client._client.post.assert_not_called()
        await client.close()

    asyncio.run(scenario())


def test_complete_catalog_pagination_without_retiring_on_partial_data(monkeypatch):
    import app.services.ai_api_connections as connections
    import app.services.ai_credentials_service as credentials
    from app.services.ai_model_discovery import (
        AIModelDiscoveryError,
        discover_compatible_models,
    )

    monkeypatch.setattr(connections, "validate_api_base_url", lambda url, **_: url)
    monkeypatch.setattr(
        credentials, "resolve_api_credential", AsyncMock(return_value="synthetic")
    )
    requests = []

    def handle(request):
        requests.append(request.url.params.get("after"))
        if len(requests) == 1:
            return httpx.Response(
                200,
                json={"data": [{"id": "first"}], "has_more": True, "last_id": "first"},
            )
        return httpx.Response(
            200, json={"data": [{"id": "second"}], "has_more": False, "total": 2}
        )

    provider = {
        "id": "api_test",
        "base_url": "https://api.example/v1",
        "credential_revision": "synthetic",
    }
    result = asyncio.run(
        discover_compatible_models(
            None, provider, transport=httpx.MockTransport(handle)
        )
    )
    assert [r["model_id"] for r in result] == ["first", "second"]
    assert all(r["capabilities"] == [] for r in result)
    assert requests == [None, "first"]
    with pytest.raises(AIModelDiscoveryError, match="parcial"):
        asyncio.run(
            discover_compatible_models(
                None,
                provider,
                transport=httpx.MockTransport(
                    lambda _: httpx.Response(
                        200, json={"data": [{"id": "first"}], "total": 5}
                    )
                ),
            )
        )


def test_grader_preserves_image_and_independent_fallback_key_and_history(monkeypatch):
    from app.modules.calificaciones import agents
    from app.modules.calificaciones.agents import (
        AgentContext,
        OpenCodeClient,
        grader_agent,
    )

    calls = []

    async def synthetic_call(selection, secret, messages, **kwargs):
        calls.append((selection, secret, messages))
        assert messages[0]["content"][1]["image_url"]["url"].endswith("c3ludGhldGlj")
        if selection["provider"] == "api_primary":
            raise httpx.ConnectError("synthetic unavailable")
        return {
            "choices": [{"message": {"content": '{"nota_sugerida":3,"confianza":0.9}'}}]
        }

    monkeypatch.setattr(agents, "call_configured_api", synthetic_call)
    monkeypatch.setattr(agents, "log_ai_usage", AsyncMock())

    async def scenario():
        def selection(provider, revision, protocol):
            return {
                "provider": provider,
                "model": "same-model-id",
                "capabilities": ["text", "vision"],
                "runtime_profile": {"protocol": protocol},
                "connection": {
                    "id": provider,
                    "base_url": f"https://{provider}.example/v1",
                    "credential_revision": revision,
                },
            }

        client = OpenCodeClient(
            tracking={
                "_ai_config": {
                    "primary": selection("api_primary", "r1", "responses"),
                    "fallback": selection("api_backup", "r2", "messages"),
                }
            }
        )
        client._configured_secrets = {
            "r1": "first-synthetic-key",
            "r2": "second-synthetic-key",
        }
        try:
            result = await grader_agent(
                AgentContext(
                    evaluacion_nombre="synthetic",
                    nota_maxima=5,
                    blueprint={"preguntas": []},
                    image_bytes=b"synthetic",
                    image_mime="image/png",
                ),
                model="same-model-id",
                multimodal=True,
                client=client,
                max_attempts=1,
            )
            assert result.error is None and result.nota_sugerida == 3
            assert result.proveedor == "api_backup" and result.modelo == "same-model-id"
            assert [secret for _, secret, _ in calls] == [
                "first-synthetic-key",
                "second-synthetic-key",
            ]
            assert client._fallback_used
        finally:
            await client.close()

    asyncio.run(scenario())


def test_admin_observed_structure_shows_the_actual_granular_route():
    from app.services.ai_capability_registry import STAGES
    from app.modules.admin_ai_config.control_center_service import _observed_stage

    stage = next(s for s in STAGES if s.runtime_feature == "digitalizacion.estructura")
    observed = _observed_stage(
        stage,
        [
            {
                "feature": "digitalizacion.estructura",
                "stage": "structure",
                "provider": "api_direct",
                "model": "future-model",
                "config_version": 8,
                "status": "success",
                "observed_at": "2026-10-22T23:00:00Z",
            }
        ],
    )
    assert observed["provider"] == "api_direct"
    assert observed["model"] == "future-model" and observed["config_version"] == 8

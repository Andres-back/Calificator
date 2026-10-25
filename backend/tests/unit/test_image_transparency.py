"""Provider-adapter contract only: no network, credentials or image charges."""
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.services import image_router


@pytest.mark.asyncio
async def test_125_transparent_image_uses_png_low_and_no_sdk_retries(monkeypatch):
    generate = AsyncMock(return_value=SimpleNamespace(data=[SimpleNamespace(b64_json='synthetic')]))
    options = {}
    def with_options(**kwargs):
        options.update(kwargs)
        return SimpleNamespace(images=SimpleNamespace(generate=generate))
    client = SimpleNamespace(with_options=with_options)
    monkeypatch.setattr(image_router, '_openai_client', lambda key: client)
    monkeypatch.setattr(image_router, 'get_effective_ai_credentials', AsyncMock(return_value=SimpleNamespace(openai_key='synthetic-not-a-key')))
    await image_router._call_openai_custom('isolated figure', '1024x1024', model='gpt-image-2', quality='low', background='transparent', single_attempt=True)
    assert generate.await_count == 1
    assert generate.await_args.kwargs['extra_body'] == {'background': 'transparent', 'output_format': 'png'}
    assert generate.await_args.kwargs['quality'] == 'low'
    assert options == {'max_retries': 0}


@pytest.mark.asyncio
async def test_125_transparency_never_falls_back_to_an_opaque_provider(monkeypatch):
    cloudflare = AsyncMock()
    monkeypatch.setattr(image_router, '_call_cloudflare', cloudflare)
    with pytest.raises(ValueError, match='transparente'):
        await image_router.generate_image('figure', provider='cloudflare', admin_config={'background': 'transparent'}, single_attempt=True)
    cloudflare.assert_not_called()


@pytest.mark.asyncio
async def test_125_one_attempt_does_not_use_configured_fallback_after_failure(monkeypatch):
    primary = AsyncMock(side_effect=RuntimeError('synthetic failed call'))
    fallback = AsyncMock()
    monkeypatch.setattr(image_router, '_call_openai_custom', primary)
    monkeypatch.setattr(image_router, '_call_cloudflare', fallback)
    with pytest.raises(RuntimeError):
        await image_router.generate_image('figure', image_type='educativa_profesional', single_attempt=True)
    assert primary.await_count == 1
    fallback.assert_not_called()

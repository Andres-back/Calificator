import asyncio
from contextlib import asynccontextmanager
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.services import ai_config_service, ai_credentials_service, llm_router
from app.services.llm_router import LLMRouter


@pytest.fixture
def fake_configuration(monkeypatch):
    route = {'feature': 'xali', 'primary_provider': 'open_code', 'primary_model': 'chosen-by-admin', 'fallback_provider': None}

    class Session:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return False

    class Config:
        def __init__(self, **_kwargs):
            pass

        async def init(self):
            pass

        async def get_feature_config(self, _task, **_kwargs):
            return dict(route)

        async def get_text_providers(self):
            return [{'id': name, 'active': True, 'model': 'default'} for name in ('open_code', 'openai', 'groq', 'template')]

    async def credentials(_db):
        return SimpleNamespace(open_code_key='synthetic', openai_key='', groq_key='', ollama_key='')

    monkeypatch.setattr('app.db.session.AsyncSessionLocal', Session)
    monkeypatch.setattr(ai_config_service, 'AIConfigService', Config)
    monkeypatch.setattr(ai_credentials_service, 'get_effective_ai_credentials', credentials)
    monkeypatch.setattr(llm_router, 'get_effective_ai_credentials', credentials)
    @asynccontextmanager
    async def capacity():
        yield

    monkeypatch.setattr(llm_router, 'provider_capacity', capacity)
    for method in ('_call_open_code', '_call_openai', '_call_groq', '_call_ollama'):
        monkeypatch.setattr(LLMRouter, method, AsyncMock(side_effect=RuntimeError('synthetic provider failure; no network')))
    return route, Config


@pytest.mark.parametrize('task', ['xali_chat', 'xali_evaluacion_post_entrega', 'xali_recurso_post_entrega', 'cuento', 'crucigrama', 'herramienta.taller', 'retroalimentacion', 'evaluacion_generar_dba_rag', 'generacion_preguntas'])
def test_managed_text_uses_only_frontend_configured_routes(fake_configuration, task):
    router = LLMRouter()
    providers = asyncio.run(router._load_providers(task))
    assert [name for name, _ in providers] == ['open_code']
    assert router._provider_configs['open_code']['model'] == 'chosen-by-admin'


def test_an_explicit_alternative_chosen_by_admin_is_still_supported(fake_configuration):
    route, _ = fake_configuration
    route.update(primary_provider='groq', primary_model='admin-other-model', fallback_provider='open_code', fallback_model='admin-backup')
    router = LLMRouter()
    providers = asyncio.run(router._load_providers('xali_chat'))
    assert [name for name, _ in providers] == ['groq', 'open_code']
    assert router._provider_configs['groq']['model'] == 'admin-other-model'


def test_unrelated_consumers_keep_the_existing_cascade(fake_configuration):
    providers = asyncio.run(LLMRouter()._load_providers('unrelated-legacy-task'))
    assert [name for name, _ in providers] == ['open_code', 'openai', 'groq', 'template']


def test_automatic_policy_does_not_leak_to_an_unrelated_task(fake_configuration):
    router = LLMRouter()
    assert len(asyncio.run(router._load_providers('cuento'))) == 1
    assert len(asyncio.run(router._load_providers('unrelated-legacy-task'))) == 4


def test_configuration_failure_is_closed_before_external_calls(fake_configuration, monkeypatch):
    _, config = fake_configuration
    monkeypatch.setattr(config, 'init', AsyncMock(side_effect=RuntimeError('synthetic database failure')))
    with pytest.raises(RuntimeError, match='configuraci'):
        asyncio.run(LLMRouter()._load_providers('cuento'))


@pytest.mark.parametrize('error', [RuntimeError('provider failed'), TimeoutError(), llm_router.LLMOutputTruncatedError('truncated')])
def test_failure_does_not_become_a_successful_template(monkeypatch, error):
    router = LLMRouter()
    router.use_explicit_routing(max_attempts=1, compact_reasoning=True)
    provider = AsyncMock(side_effect=error)
    monkeypatch.setattr(router, '_load_providers', AsyncMock(return_value=[('open_code', provider)]))
    template = AsyncMock(return_value='must not be delivered')
    monkeypatch.setattr(router, '_template_call', template)

    @asynccontextmanager
    async def capacity():
        yield

    monkeypatch.setattr(llm_router, 'provider_capacity', capacity)
    with pytest.raises(RuntimeError, match='configurados'):
        asyncio.run(router.generate_text('xali_evaluacion_post_entrega', 'synthetic prompt'))
    assert provider.await_count == 1
    template.assert_not_awaited()


def test_no_explicit_provider_does_not_use_a_template(fake_configuration):
    route, _ = fake_configuration
    route['primary_provider'] = 'missing-provider'
    with pytest.raises(RuntimeError, match='configurados'):
        asyncio.run(LLMRouter().generate_text('xali_chat', 'synthetic'))


@pytest.mark.parametrize('task', ['calificacion.extraccion', 'calificacion.valoracion', 'calificacion.verificacion', 'digitalizacion.estructura', 'evaluacion_digitalizar', 'generacion_imagenes', 'rag', 'presentacion'])
def test_protected_stages_do_not_opt_into_the_text_policy(task):
    assert not ai_config_service.uses_managed_text_routing(task)


@pytest.mark.parametrize('persisted', [None, []])
def test_strict_route_does_not_use_cached_or_default_routes(monkeypatch, persisted):
    service = ai_config_service.AIConfigService()
    monkeypatch.setattr(service, '_get_cache', AsyncMock(return_value={'features': [{'feature': 'xali', 'primary_provider': 'cached-provider'}]}))
    monkeypatch.setattr(service, '_load_features_from_db', AsyncMock(return_value=persisted))
    with pytest.raises(RuntimeError, match='guardada'):
        asyncio.run(service.get_feature_config('xali_chat', require_persisted=True))


def test_strict_route_uses_current_persisted_model_over_cache(monkeypatch):
    service = ai_config_service.AIConfigService()
    monkeypatch.setattr(service, '_get_cache', AsyncMock(return_value={'features': [{'feature': 'xali', 'primary_provider': 'cached-provider'}]}))
    monkeypatch.setattr(service, '_load_features_from_db', AsyncMock(return_value=[{'feature': 'xali', 'primary_provider': 'open_code', 'primary_model': 'admin-selected'}]))
    monkeypatch.setattr(service, '_set_cache', AsyncMock())
    result = asyncio.run(service.get_feature_config('xali_recurso_post_entrega', require_persisted=True))
    assert result['primary_provider'] == 'open_code' and result['primary_model'] == 'admin-selected'


def test_evaluation_generation_resolves_the_administration_selector(monkeypatch):
    service = ai_config_service.AIConfigService()
    monkeypatch.setattr(service, '_load_features_from_db', AsyncMock(return_value=[{
        'feature': 'generacion_preguntas', 'primary_provider': 'open_code',
        'primary_model': 'any-admin-model', 'fallback_provider': None,
    }]))
    monkeypatch.setattr(service, '_set_cache', AsyncMock())
    result = asyncio.run(service.get_feature_config('evaluacion_generar_dba_rag', require_persisted=True))
    assert result['primary_model'] == 'any-admin-model'


def test_generation_failure_never_tries_an_unselected_provider(fake_configuration):
    route, _ = fake_configuration
    route.update(primary_provider='groq', fallback_provider='template')
    with pytest.raises(RuntimeError, match='configurados'):
        asyncio.run(LLMRouter().generate_json('evaluacion_generar_dba_rag', 'synthetic'))
    LLMRouter._call_groq.assert_awaited_once()
    LLMRouter._call_openai.assert_not_awaited()
    LLMRouter._call_open_code.assert_not_awaited()


def test_content_correction_keeps_its_captured_route(fake_configuration, monkeypatch):
    router = LLMRouter()
    router.use_explicit_routing(pin_configuration=True)
    provider = AsyncMock(return_value='{"valid": true}')
    load = AsyncMock(return_value=[('api_synthetic', provider)])
    monkeypatch.setattr(router, '_load_providers', load)

    async def scenario():
        assert await router.generate_json('evaluacion_generar_dba_rag', 'first') == {'valid': True}
        assert await router.generate_json('evaluacion_generar_dba_rag', 'correction') == {'valid': True}
        with pytest.raises(RuntimeError, match='cambiar de función'):
            await router.generate_json('unrelated-task', 'must not run')

    asyncio.run(scenario())
    load.assert_awaited_once()
    assert provider.await_count == 2

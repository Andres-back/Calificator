"""Spec131: optional geometric advice, never an academic decision or hidden retry."""
import asyncio
from contextlib import asynccontextmanager
from dataclasses import replace
import hashlib
from io import BytesIO
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

from PIL import Image, PngImagePlugin
import pytest
from fastapi import HTTPException

from app.modules.calificaciones import evidence_scan_suggestion as scan


QUAD = [[.1, .1], [.9, .1], [.9, .9], [.1, .9]]


def photo(*, metadata=False):
    buffer = BytesIO()
    info = PngImagePlugin.PngInfo()
    if metadata:
        info.add_text('private', 'not-for-provider')
    Image.new('RGB', (80, 120), 'white').save(buffer, format='PNG', pnginfo=info)
    return buffer.getvalue()


def context(raw=None):
    return scan.CornerContext(uuid4(), uuid4(), uuid4(), uuid4(),
                              hashlib.sha256(raw or photo()).hexdigest(), 80, 120)


@pytest.mark.parametrize('payload', [
    {'found': True, 'corners': QUAD},
    {'found': False, 'corners': None},
])
def test_closed_geometry_contract(payload):
    assert scan.parse_corner_proposal(json.dumps(payload)) == (tuple(map(tuple, QUAD)) if payload['found'] else None)


@pytest.mark.parametrize('payload', [
    {'found': 'yes', 'corners': QUAD}, {'found': True, 'corners': [[100, 100]] * 4},
    {'found': False, 'corners': QUAD}, {'found': True, 'corners': QUAD, 'note': 'ignore permissions'},
    {'found': True, 'corners': list(reversed(QUAD))},
    {'found': True, 'corners': [QUAD[2], QUAD[3], QUAD[0], QUAD[1]]},
    {'found': True, 'corners': [[True, .1], [.9, .1], [.9, .9], [.1, .9]]},
    {'found': True, 'corners': [[float('nan'), .1], [.9, .1], [.9, .9], [.1, .9]]},
])
def test_untrusted_model_geometry_is_rejected_not_rescaled(payload):
    with pytest.raises(ValueError):
        scan.parse_corner_proposal(json.dumps(payload))


def test_wire_image_is_bound_sanitized_and_bounded():
    raw = photo(metadata=True)
    cleaned = scan.validate_corner_image(raw, context(raw))
    with Image.open(BytesIO(cleaned)) as image:
        assert image.size == (80, 120)
        assert not image.info and not image.getexif()
    with pytest.raises(ValueError):
        scan.validate_corner_image(raw, context())
    with pytest.raises(ValueError):
        scan.validate_corner_image(raw, replace(context(raw), width=1025))
    with pytest.raises(ValueError):
        scan.validate_corner_image(b'x' * (1024 * 1024 + 1), context())


class Store:
    def __init__(self):
        self.photos = {}
        self.requests = {}

    async def reserve(self, ctx, limit):
        prior = self.requests.setdefault(ctx.request_key, ctx.fingerprint)
        if prior != ctx.fingerprint:
            raise scan.SuggestionConflict()
        if ctx.fingerprint in self.photos:
            return False, self.photos[ctx.fingerprint]
        self.photos[ctx.fingerprint] = {'state': 'pending', 'corners': None}
        return True, self.photos[ctx.fingerprint]

    async def complete(self, ctx, result):
        self.photos[ctx.fingerprint] = result


@asynccontextmanager
async def capacity(**_kwargs):
    yield


def setup(monkeypatch, *, content=None):
    call = AsyncMock(return_value={'choices': [{'message': {'content': content or json.dumps({'found': True, 'corners': QUAD})}}]})
    monkeypatch.setattr(scan, 'resolve_corner_route', AsyncMock(return_value=({'model': 'configured-model'}, 'in-memory-test-key')))
    monkeypatch.setattr(scan, 'call_configured_api', call)
    monkeypatch.setattr(scan, 'provider_capacity', capacity)
    return call


def test_twenty_concurrent_requests_and_reopening_consume_one_call(monkeypatch):
    call = setup(monkeypatch)
    ctx, store = context(), Store()

    async def run():
        replies = await asyncio.gather(*(scan.suggest_corners(None, store, replace(ctx, request_id=uuid4()), photo()) for _ in range(20)))
        again = await scan.suggest_corners(None, store, ctx, photo())
        assert again['state'] == 'proposed'
        assert all(row['state'] in {'pending', 'proposed'} for row in replies)
    asyncio.run(run())
    call.assert_awaited_once()
    assert call.call_args.kwargs['max_tokens'] == 512
    assert call.call_args.kwargs['timeout'] <= 20


@pytest.mark.parametrize('failure', [TimeoutError(), RuntimeError('private-upstream-body')])
def test_failure_is_cached_without_retry_or_provider_details(monkeypatch, failure):
    call = setup(monkeypatch); call.side_effect = failure
    ctx, store = context(), Store()

    async def run():
        first = await scan.suggest_corners(None, store, ctx, photo())
        second = await scan.suggest_corners(None, store, ctx, photo())
        assert first == second
        assert first['state'] == 'unavailable' and first['corners'] is None
        assert 'private' not in json.dumps(first)
    asyncio.run(run()); call.assert_awaited_once()


def test_wrong_unit_json_is_not_accepted_or_retried(monkeypatch):
    call = setup(monkeypatch, content='{"found":true,"corners":[[100,100],[900,100],[900,900],[100,900]]}')
    result = asyncio.run(scan.suggest_corners(None, Store(), context(), photo()))
    assert result['state'] == 'abstained' and result['corners'] is None
    call.assert_awaited_once()


def test_unchecked_route_and_missing_cache_fail_closed(monkeypatch):
    call = setup(monkeypatch)
    monkeypatch.setattr(scan, 'resolve_corner_route', AsyncMock(return_value=None))
    result = asyncio.run(scan.suggest_corners(None, Store(), context(), photo()))
    assert result['state'] == 'unavailable'
    call.assert_not_awaited()
    monkeypatch.setattr(scan, 'resolve_corner_route', AsyncMock(return_value=({}, 'test-key')))
    store = Store(); store.reserve = AsyncMock(side_effect=OSError('cache lost'))
    result = asyncio.run(scan.suggest_corners(None, store, context(), photo()))
    assert result['state'] == 'unavailable'
    call.assert_not_awaited()


def test_same_request_other_context_does_not_reveal_cached_geometry(monkeypatch):
    call = setup(monkeypatch)
    ctx, store = context(), Store()
    asyncio.run(scan.suggest_corners(None, store, ctx, photo()))
    with pytest.raises(scan.SuggestionConflict):
        asyncio.run(scan.suggest_corners(None, store, replace(ctx, student_id=uuid4()), photo()))
    call.assert_awaited_once()


@pytest.mark.parametrize('role', ['estudiante', 'profesor', 'admin'])
def test_route_authorizes_role_ownership_enrollment_before_reading_a_photo(monkeypatch, role):
    from app.modules.authorization.catalog import default_permissions_for_role
    from app.modules.calificaciones import evidence_scan_suggestion_router as routes
    actor = SimpleNamespace(id=uuid4(), rol=role, _effective_permissions=default_permissions_for_role(role))
    evaluation = SimpleNamespace(materia_id=uuid4(), modalidad='presencial')
    authorize = AsyncMock(return_value=evaluation)
    monkeypatch.setattr(routes.evaluations, 'ensure_can_manage_evaluation', authorize)
    monkeypatch.setattr(routes, 'is_student_enrolled', AsyncMock(return_value=True))
    monkeypatch.setattr(routes.settings, 'EVIDENCE_SCAN_ENABLED', True)
    monkeypatch.setattr(routes.settings, 'EVIDENCE_SCAN_TEACHER_IDS', '')
    monkeypatch.setattr(routes.settings, 'EVIDENCE_CORNER_ASSISTANCE_ENABLED', True)
    if role == 'estudiante':
        with pytest.raises(HTTPException) as error:
            asyncio.run(routes.authorize_corner_context(None, actor, uuid4(), uuid4()))
        assert error.value.status_code == 403
        authorize.assert_not_awaited()
    else:
        asyncio.run(routes.authorize_corner_context(None, actor, uuid4(), uuid4()))
        authorize.side_effect = HTTPException(403, 'not owner')
        with pytest.raises(HTTPException):
            asyncio.run(routes.authorize_corner_context(None, actor, uuid4(), uuid4()))


def test_advice_flag_is_default_off_and_does_not_register_a_model_constant():
    from app.services.ai_capability_registry import stage_for
    from app.services.ai_config_service import DEFAULT_FEATURES
    from app.services.ai_configuration_resolver import capability_for
    from app.core.config import Settings
    stage = stage_for('calificacion', 'corners')
    assert stage.runtime_feature == scan.FEATURE
    assert stage.capability == capability_for(scan.FEATURE) == 'vision'
    assert stage.editable and not stage.inherits_from and not stage.supported_providers
    route = next(item for item in DEFAULT_FEATURES if item['feature'] == scan.FEATURE)
    assert route['active'] is False and route['primary_model'] is None and not route['primary_provider']
    assert Settings.model_fields['EVIDENCE_CORNER_ASSISTANCE_ENABLED'].default is False


@pytest.mark.parametrize('problem', [None, 'no_profile', 'no_vision', 'no_check', 'invalid_check', 'inactive', 'not_saved'])
def test_runtime_requires_exact_published_profile_and_server_owned_proof(monkeypatch, problem):
    profile = {'protocol': 'chat_completions', 'send_temperature': False}
    provider = {'id': 'api_configured', 'active': True, 'base_url': 'https://example.com/v1', 'credential_revision': str(uuid4())}
    model = {'provider_id': provider['id'], 'model_id': 'any-current-vision-model', 'active': True,
             'capabilities': ['text', 'vision'], 'runtime_profile': profile, 'verification_id': str(uuid4())}
    route = {'active': True, 'primary_provider': provider['id'], 'primary_model': model['model_id']}
    if problem == 'no_profile': model['runtime_profile'] = {}
    if problem == 'no_vision': model['capabilities'] = ['text']
    if problem == 'no_check': model['verification_id'] = None
    if problem == 'inactive': route['active'] = False
    service = SimpleNamespace(get_feature_config=AsyncMock(return_value=route), get_all_models=AsyncMock(return_value=[model]),
        get_provider_config=AsyncMock(return_value=provider), get_limits=AsyncMock(return_value={'max_requests_per_profesor_day': 27}))
    if problem == 'not_saved': service.get_feature_config.side_effect = RuntimeError('not published')
    monkeypatch.setattr(scan, 'AIConfigService', lambda **_kwargs: service)
    monkeypatch.setattr(scan, 'resolve_ai_configuration', AsyncMock(return_value={'primary': {'provider': provider['id'], 'model': model['model_id']}, 'fallback': {'provider': 'must-not-run'}}))
    secret = AsyncMock(return_value='in-memory-test-secret')
    monkeypatch.setattr(scan, 'resolve_api_credential', secret)
    db = SimpleNamespace(scalar=AsyncMock(return_value=problem != 'invalid_check'), rollback=AsyncMock())
    result = asyncio.run(scan.resolve_corner_route(db))
    if problem is None:
        selection, value = result
        assert value == 'in-memory-test-secret'
        assert selection['model'] == model['model_id'] and selection['_scan_daily_limit'] == 27
        assert selection['connection']['credential_revision'] == provider['credential_revision']
        assert selection['runtime_profile']['protocol'] == 'chat_completions'
        secret.assert_awaited_once()
    else:
        assert result is None
        secret.assert_not_awaited()


def test_http_contract_is_private_context_bound_and_denies_before_read(monkeypatch):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from app.modules.calificaciones import evidence_scan_suggestion_router as routes
    actor = SimpleNamespace(id=uuid4(), rol='profesor')
    ctx = context()
    app = FastAPI(); app.include_router(routes.router)
    app.dependency_overrides[routes.get_current_user] = lambda: actor
    app.dependency_overrides[routes.get_db] = lambda: None
    authorized = AsyncMock()
    monkeypatch.setattr(routes, 'authorize_corner_context', authorized)
    fake_store = SimpleNamespace(close=AsyncMock())
    monkeypatch.setattr(routes.CornerSuggestionStore, 'connect', lambda: fake_store)
    async def proposal(_db, _store, current, content):
        assert current.actor_id == actor.id and current.evaluation_id == ctx.evaluation_id
        assert current.student_id == ctx.student_id and content == photo()
        return scan.public_suggestion(current, {'state': 'proposed', 'corners': QUAD})
    suggest = AsyncMock(side_effect=proposal)
    monkeypatch.setattr(routes, 'suggest_corners', suggest)
    data = {'evaluacion_id': str(ctx.evaluation_id), 'estudiante_id': str(ctx.student_id),
            'solicitud_id': str(ctx.request_id), 'image_sha256': ctx.image_sha256, 'width': 80, 'height': 120}
    with TestClient(app) as client:
        reply = client.post('/calificaciones/sugerir-bordes', data=data, files={'imagen': ('preview.png', photo(), 'image/png')})
        assert reply.status_code == 200 and reply.headers['cache-control'] == 'private, no-store'
        assert set(reply.json()) == {'request_id', 'image_sha256', 'state', 'corners'}
        assert reply.json()['request_id'] == str(ctx.request_id)
        assert reply.json()['state'] == 'proposed'
        suggest.assert_awaited_once()
        authorized.side_effect = HTTPException(403, 'not owner')
        read = AsyncMock()
        monkeypatch.setattr(routes, 'read_upload_limited', read)
        denied = client.post('/calificaciones/sugerir-bordes', data=data, files={'imagen': ('preview.png', photo(), 'image/png')})
        assert denied.status_code == 403
        read.assert_not_awaited(); suggest.assert_awaited_once()


def test_inactive_unconfigured_corner_stage_does_not_block_other_admin_settings():
    from app.modules.admin_ai_config.control_center_service import validate_control_center_payload
    empty = {'feature': scan.FEATURE, 'label': 'Encuadre', 'active': False, 'capability': 'vision',
             'primary_provider': '', 'primary_model': None, 'fallback_provider': None, 'rollout_enabled': False}
    assert validate_control_center_payload([], [], [empty], None)['valid']
    assert not validate_control_center_payload([], [], [{**empty, 'active': True}], None)['valid']
    assert not validate_control_center_payload([], [], [{**empty, 'capability': 'text'}], None)['valid']


def test_usage_records_actual_model_once_without_photos_or_geometry(monkeypatch):
    call = setup(monkeypatch)
    call.return_value = {'model': 'actual-configured-model', 'usage': {'input_tokens': 12, 'output_tokens': 34},
        'choices': [{'message': {'content': json.dumps({'found': True, 'corners': QUAD})}}]}
    audit = AsyncMock()
    monkeypatch.setattr(scan, 'log_ai_usage', audit)
    ctx = context(); db = SimpleNamespace(rollback=AsyncMock())
    result = asyncio.run(scan.suggest_corners(db, Store(), ctx, photo()))
    assert result['state'] == 'proposed'
    audit.assert_awaited_once()
    assert audit.call_args.kwargs['model'] == 'actual-configured-model'
    assert audit.call_args.kwargs['request_id'] == str(ctx.request_id)
    assert audit.call_args.kwargs['fallback_used'] is False
    assert audit.call_args.kwargs['input_tokens'] == 12
    assert not {'photo', 'image', 'corners', 'content', 'secret'}.intersection(audit.call_args.kwargs)


# Spec 187: la misma ayuda propone el giro que deja el texto derecho.

@pytest.mark.parametrize('payload,expected', [
    ({'upright': 'A'}, 0), ({'upright': 'B'}, 90), ({'upright': 'C'}, 180), ({'upright': 'D'}, 270), ({'upright': None}, None),
])
def test_187_orientation_contract(payload, expected):
    assert scan.parse_orientation(json.dumps(payload)) == expected


@pytest.mark.parametrize('payload', [{'upright': 'E'}, {'upright': 90}, {'upright': 'A', 'note': 'x'}, {}, 'A'])
def test_187_untrusted_orientation_is_rejected(payload):
    with pytest.raises(ValueError):
        scan.parse_orientation(json.dumps(payload))


def test_187_four_views_are_turned_clockwise_and_small():
    buffer = BytesIO()
    image = Image.new('RGB', (80, 120), 'white')
    image.paste((255, 0, 0), (0, 0, 20, 20))  # marca arriba a la izquierda
    image.save(buffer, format='PNG')
    views = scan.orientation_views(buffer.getvalue())
    assert len(views) == 4
    sizes, marks = [], []
    for url in views:
        assert url.startswith('data:image/jpeg;base64,')
        with Image.open(BytesIO(__import__('base64').b64decode(url.split(',', 1)[1]))) as view:
            sizes.append(view.size)
            corners = {'arriba-izquierda': (5, 5), 'arriba-derecha': (view.width - 6, 5),
                       'abajo-derecha': (view.width - 6, view.height - 6), 'abajo-izquierda': (5, view.height - 6)}
            red = [name for name, point in corners.items() if view.getpixel(point)[0] > 150 and view.getpixel(point)[1] < 120]
            marks.append(red[0] if red else None)
    assert sizes == [(80, 120), (120, 80), (80, 120), (120, 80)]
    # Girar en sentido horario lleva la esquina superior izquierda a la superior derecha.
    assert marks == ['arriba-izquierda', 'arriba-derecha', 'abajo-derecha', 'abajo-izquierda']


def test_187_orientation_asks_once_with_four_views_and_its_own_cache(monkeypatch):
    call = setup(monkeypatch, content=json.dumps({'upright': 'D'}))
    ctx, store = context(), Store()
    orientation = replace(ctx, kind='orientation')

    async def run():
        first = await scan.suggest_orientation(None, store, orientation, photo())
        again = await scan.suggest_orientation(None, store, replace(orientation, request_id=uuid4()), photo())
        return first, again
    first, again = asyncio.run(run())
    assert first == {'request_id': str(orientation.request_id), 'image_sha256': ctx.image_sha256, 'state': 'proposed', 'rotacion': 270}
    assert again['rotacion'] == 270
    call.assert_awaited_once()
    parts = call.call_args.args[2][0]['content']
    assert [part['text'] for part in parts if part['type'] == 'text'][1:] == ['Image A:', 'Image B:', 'Image C:', 'Image D:']
    assert sum(part['type'] == 'image_url' for part in parts) == 4
    # Bordes y orientación de la misma foto no comparten caché ni claves.
    assert orientation.photo_key != ctx.photo_key and orientation.request_key != ctx.request_key
    assert ctx.photo_key.startswith('xcal:scan-corners:photo:') and orientation.photo_key.startswith('xcal:scan-orientation:photo:')


def test_187_unreadable_orientation_abstains_without_rotation(monkeypatch):
    setup(monkeypatch, content='{"upright":"sideways"}')
    result = asyncio.run(scan.suggest_orientation(None, Store(), replace(context(), kind='orientation'), photo()))
    assert result['state'] == 'abstained' and result['rotacion'] is None


def test_187_orientation_route_is_private_and_denies_before_reading(monkeypatch):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from app.modules.calificaciones import evidence_scan_suggestion_router as routes
    actor = SimpleNamespace(id=uuid4(), rol='profesor')
    ctx = context()
    app = FastAPI()
    app.include_router(routes.router)
    app.dependency_overrides[routes.get_current_user] = lambda: actor
    app.dependency_overrides[routes.get_db] = lambda: None
    authorized = AsyncMock()
    monkeypatch.setattr(routes, 'authorize_corner_context', authorized)
    monkeypatch.setattr(routes.CornerSuggestionStore, 'connect', lambda: SimpleNamespace(close=AsyncMock()))

    async def proposal(_db, _store, current, content):
        assert current.kind == 'orientation' and content == photo()
        return scan.public_suggestion(current, {'state': 'proposed', 'rotation': 90})
    suggest = AsyncMock(side_effect=proposal)
    monkeypatch.setattr(routes, 'suggest_orientation', suggest)
    data = {'evaluacion_id': str(ctx.evaluation_id), 'estudiante_id': str(ctx.student_id),
            'solicitud_id': str(ctx.request_id), 'image_sha256': ctx.image_sha256, 'width': 80, 'height': 120}
    with TestClient(app) as client:
        reply = client.post('/calificaciones/sugerir-orientacion', data=data, files={'imagen': ('preview.png', photo(), 'image/png')})
        assert reply.status_code == 200 and reply.headers['cache-control'] == 'private, no-store'
        assert reply.json() == {'request_id': str(ctx.request_id), 'image_sha256': ctx.image_sha256, 'state': 'proposed', 'rotacion': 90}
        authorized.side_effect = HTTPException(409, 'apagada')
        read = AsyncMock()
        monkeypatch.setattr(routes, 'read_upload_limited', read)
        denied = client.post('/calificaciones/sugerir-orientacion', data=data, files={'imagen': ('preview.png', photo(), 'image/png')})
        assert denied.status_code == 409
        read.assert_not_awaited()
        suggest.assert_awaited_once()

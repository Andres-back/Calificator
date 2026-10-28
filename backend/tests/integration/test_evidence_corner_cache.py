"""Only an explicit isolated Redis may be used. No images/provider/academic DB."""
import asyncio
from dataclasses import replace
import hashlib
import os
from urllib.parse import urlparse
from uuid import uuid4

import pytest
from redis.asyncio import Redis

from app.modules.calificaciones.evidence_scan_suggestion import CornerContext, CornerSuggestionStore, SuggestionConflict


def store():
    url = os.getenv('SPEC131_CORNER_TEST_REDIS_URL')
    if not url:
        pytest.skip('Requires an explicit isolated SPEC131_CORNER_TEST_REDIS_URL')
    parsed = urlparse(url)
    assert parsed.path == '/15' and not parsed.username and not parsed.password
    if parsed.hostname == 'spec131-corner-redis':
        assert os.getenv('SPEC131_ISOLATED_DOCKER') == '1' and parsed.port == 6379
    else:
        assert parsed.hostname in {'127.0.0.1', 'localhost'} and parsed.port == 6379
    return CornerSuggestionStore(Redis.from_url(url, decode_responses=True, socket_timeout=1))


def context():
    return CornerContext(uuid4(), uuid4(), uuid4(), uuid4(), hashlib.sha256(b'synthetic-only').hexdigest(), 80, 120)


def test_atomic_twenty_intentions_share_one_photo_and_keep_context_binding():
    async def run():
        cache, ctx = store(), context()
        contexts = [replace(ctx, request_id=uuid4()) for _ in range(20)]
        try:
            results = await asyncio.gather(*(cache.reserve(item, 200) for item in contexts))
            assert sum(owner for owner, _ in results) == 1
            owner = contexts[next(i for i, row in enumerate(results) if row[0])]
            geometry = [[.1, .1], [.9, .1], [.9, .9], [.1, .9]]
            await cache.complete(owner, {'state': 'proposed', 'corners': geometry})
            for item in contexts:
                result = await cache.read(item)
                assert result == {'state': 'proposed', 'corners': geometry}
            with pytest.raises(SuggestionConflict):
                await cache.reserve(replace(owner, student_id=uuid4()), 200)
            with pytest.raises(SuggestionConflict):
                await cache.read(replace(owner, evaluation_id=uuid4()))
            other_actor = replace(owner, actor_id=uuid4())
            assert (await cache.read(other_actor))['state'] == 'unavailable'
            assert await cache.client.ttl(owner.photo_key) > 850
        finally:
            await cache.close()
    asyncio.run(run())


def test_quota_zero_and_two_concurrent_photos_fail_closed_without_clearing_data():
    async def run():
        cache, ctx = store(), context()
        try:
            assert (await cache.reserve(ctx, 0)) == (False, {'state': 'unavailable', 'corners': None})
            assert await cache.client.get(ctx.photo_key) is None
            ctx = replace(ctx, actor_id=uuid4(), request_id=uuid4())
            second = replace(ctx, image_sha256='b' * 64, request_id=uuid4())
            third = replace(ctx, image_sha256='c' * 64, request_id=uuid4())
            assert (await cache.reserve(ctx, 200))[0]
            assert (await cache.reserve(second, 200))[0]
            assert (await cache.reserve(third, 200)) == (False, {'state': 'unavailable', 'corners': None})
            # A stale/non-owner completion cannot overwrite a proposal or free
            # another intention's concurrency reservation.
            await cache.complete(replace(ctx, request_id=uuid4()), {'state': 'abstained', 'corners': None})
            assert (await cache.read(ctx))['state'] == 'pending'
            assert (await cache.reserve(third, 200))[0] is False
            await cache.complete(ctx, {'state': 'unavailable', 'corners': None})
            assert (await cache.reserve(third, 200))[0] is True
            assert (await cache.read(second))['state'] == 'pending'
        finally:
            await cache.close()
    asyncio.run(run())


def test_completed_failure_is_reused_under_new_request_id_without_another_owner():
    async def run():
        cache, ctx = store(), context()
        try:
            assert (await cache.reserve(ctx, 1))[0]
            await cache.complete(ctx, {'state': 'unavailable', 'corners': None})
            again = replace(ctx, request_id=uuid4())
            assert await cache.reserve(again, 1) == (False, {'state': 'unavailable', 'corners': None})
            assert await cache.client.ttl(again.request_key) > 850
        finally:
            await cache.close()
    asyncio.run(run())

"""Spec 161: los workers no arrancan si kombu rechaza el cliente de Redis instalado."""
import pytest


def test_redis_transport_accepts_the_installed_client():
    pytest.importorskip('redis')
    from kombu.transport.redis import Channel
    assert Channel.__new__(Channel)._get_client() is not None

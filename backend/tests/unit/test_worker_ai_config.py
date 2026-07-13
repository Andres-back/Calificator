import asyncio

from app.workers import tasks_ai_config


def test_worker_ai_config_disposes_async_engine(monkeypatch) -> None:
    events: list[str] = []

    class SessionContext:
        async def __aenter__(self) -> object:
            events.append("session-open")
            return object()

        async def __aexit__(self, *_args: object) -> None:
            events.append("session-close")

    class FakeService:
        def __init__(self, db: object) -> None:
            assert db is not None

        async def init(self) -> None:
            events.append("service-init")

        async def get_config_hash(self) -> str:
            return "config-hash"

    class FakeEngine:
        async def dispose(self) -> None:
            events.append("engine-dispose")

    monkeypatch.setattr(tasks_ai_config, "AsyncSessionLocal", SessionContext)
    monkeypatch.setattr(tasks_ai_config, "AIConfigService", FakeService)
    monkeypatch.setattr(tasks_ai_config, "engine", FakeEngine())

    first = asyncio.run(tasks_ai_config._get_config_hash_and_dispose())
    second = asyncio.run(tasks_ai_config._get_config_hash_and_dispose())

    assert first == second == "config-hash"
    assert events.count("engine-dispose") == 2
    assert events[-1] == "engine-dispose"

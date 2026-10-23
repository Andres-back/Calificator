"""Unit tests do not connect to production or a local Redis service."""
from contextlib import asynccontextmanager

import pytest


@pytest.fixture(autouse=True)
def synthetic_grading_admission(monkeypatch):
    from app.modules.calificaciones import execution_policy

    @asynccontextmanager
    async def admitted(**_kwargs):
        yield

    monkeypatch.setattr(execution_policy, "provider_capacity", admitted)

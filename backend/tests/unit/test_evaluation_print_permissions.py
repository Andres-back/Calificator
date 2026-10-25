"""New routes retain the real authentication dependency before any work."""
from uuid import uuid4

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
import pytest

from app.db.session import get_db
from app.modules.evaluaciones.router import router


@pytest.mark.asyncio
@pytest.mark.parametrize('method,path', [('POST', '/evaluaciones/impresion/preparar'), ('GET', '/evaluaciones/impresion/{id}/pdf')])
async def test_print_routes_deny_anonymous_without_database_or_render(method, path):
    application = FastAPI()
    application.include_router(router)
    async def no_database():
        yield object()
    application.dependency_overrides[get_db] = no_database
    async with AsyncClient(transport=ASGITransport(app=application), base_url='http://test') as client:
        result = await client.request(method, path.replace('{id}', str(uuid4())), json={})
    assert result.status_code == 401

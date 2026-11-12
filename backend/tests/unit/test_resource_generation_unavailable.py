"""Spec 174: si la IA no responde, generar un recurso avisa con 503 en vez de un error interno."""

from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.modules.herramientas import service
from app.shared.enums import MaterialTipo


def request():
    return SimpleNamespace(titulo="Fotosíntesis", tema="La fotosíntesis", instrucciones_adicionales="Usa ejemplos del campo")


@pytest.mark.asyncio
async def test_provider_failure_becomes_a_retryable_503():
    req = request()

    async def generator():
        raise RuntimeError("Los proveedores configurados no pudieron responder")

    with pytest.raises(HTTPException) as error:
        await service._generate_with_quality(tipo=MaterialTipo.CRUCIGRAMA, req=req, generator=generator)

    assert error.value.status_code == 503
    assert "intenta de nuevo" in error.value.detail
    assert "proveedores" not in error.value.detail
    assert req.instrucciones_adicionales == "Usa ejemplos del campo"


@pytest.mark.asyncio
async def test_an_explicit_rejection_keeps_its_own_status():
    async def generator():
        raise HTTPException(status_code=409, detail="La generación de este recurso está pausada.")

    with pytest.raises(HTTPException) as error:
        await service._generate_with_quality(tipo=MaterialTipo.SOPA_LETRAS, req=request(), generator=generator)

    assert error.value.status_code == 409

import asyncio
from unittest.mock import AsyncMock

import pytest

from app.modules.admin_ai_config import control_center_service as center


@pytest.mark.parametrize('dedicated', [True, False])
def test_feedback_stage_reports_saved_route_and_actual_inheritance(monkeypatch, dedicated):
    parent = {'feature': 'xali', 'primary_provider': 'open_code', 'primary_model': 'parent-admin-model'}
    specific = {'feature': 'xali_evaluacion_post_entrega', 'primary_provider': 'open_code', 'primary_model': 'chosen-admin-model'}

    class Config:
        def __init__(self, **_kwargs):
            pass

        async def get_all_providers(self):
            return [{'id': 'open_code', 'model': 'provider-default'}]

        async def get_all_features(self):
            return [parent, specific] if dedicated else [parent]

        async def get_feature_config(self, _feature):
            return parent

        async def get_all_models(self):
            return []

    monkeypatch.setattr(center, 'AIConfigService', Config)
    monkeypatch.setattr(center, '_latest_observed', AsyncMock(return_value=[]))
    monkeypatch.setattr(center, 'get_tool_catalog', AsyncMock(return_value=[]))
    result = asyncio.run(center.get_control_center(object()))
    function = next(item for item in result['functions'] if item['function_id'] == 'xali')
    stage = next(item for item in function['stages'] if item['stage_id'] == 'feedback')
    assert stage['configured']['model'] == ('chosen-admin-model' if dedicated else 'parent-admin-model')
    assert stage['inherits_from'] == (None if dedicated else 'xali')

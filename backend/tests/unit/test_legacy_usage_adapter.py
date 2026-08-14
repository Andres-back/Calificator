import asyncio
from types import SimpleNamespace

import app.services.usage_logger as usage_module


def test_legacy_usage_logger_delegates_to_canonical_ledger(monkeypatch) -> None:
    captured: dict = {}

    async def fake_log_ai_usage(**kwargs):
        captured.update(kwargs)
        return "request-id"

    monkeypatch.setattr(usage_module, "log_ai_usage", fake_log_ai_usage)
    logger = usage_module.UsageLogger(SimpleNamespace())

    asyncio.run(
        logger.log(
            provider="open_code",
            model="qwen-test",
            tipo="vision",
            tokens_input=120,
            tokens_output=45,
            latencia_ms=900,
            success=False,
            error="provider timeout",
        )
    )

    assert captured["feature"] == "vision"
    assert captured["stage"] == "compat_usage_logger"
    assert captured["provider"] == "open_code"
    assert captured["model"] == "qwen-test"
    assert captured["status"] == "failed"
    assert captured["input_tokens"] == 120
    assert captured["output_tokens"] == 45
    assert captured["latency_ms"] == 900
    assert captured["error_code"] == "provider timeout"
    elapsed = captured["completed_at"] - captured["started_at"]
    assert int(elapsed.total_seconds() * 1000) == 900
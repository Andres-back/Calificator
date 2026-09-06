from __future__ import annotations

import asyncio

from tests.fixtures.ai_pipeline_performance import DeterministicAIProvider
from tests.fixtures.grading_batch import synthetic_grading_batch


def test_thirty_deliveries_finish_independently_with_one_isolated_failure() -> None:
    deliveries = synthetic_grading_batch()
    provider = DeterministicAIProvider(latency_ms=1, fail_on_calls={7})

    async def process(item):
        try:
            result = await provider.generate_json(
                "calificacion_foto",
                item.evidence.decode(),
                response={
                    "student_id": str(item.student_id),
                    "delivery_id": str(item.delivery_id),
                },
            )
            return "success", result
        except ConnectionError as exc:
            return "retrying", {
                "student_id": str(item.student_id),
                "delivery_id": str(item.delivery_id),
                "error": str(exc),
            }

    async def run_batch():
        return await asyncio.gather(*(process(item) for item in deliveries))

    results = asyncio.run(run_batch())
    successful = [result for state, result in results if state == "success"]
    retrying = [result for state, result in results if state == "retrying"]

    assert len(successful) == 29
    assert len(retrying) == 1
    assert len({result["student_id"] for _, result in results}) == 30
    assert len({result["delivery_id"] for _, result in results}) == 30
    assert retrying[0]["delivery_id"] == str(deliveries[6].delivery_id)

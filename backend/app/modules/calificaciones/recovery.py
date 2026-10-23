"""Private, restart-safe progress for a single evidence/configuration fingerprint."""
from __future__ import annotations

from collections.abc import Awaitable, Callable
from copy import deepcopy
import hashlib
import json
import math
import time

from app.modules.calificaciones.agents import AgentResult
from app.modules.calificaciones.execution_policy import MAX_STAGE_ATTEMPTS, TRANSIENT_ERRORS

Operation = Callable[[], Awaitable[AgentResult]]
Save = Callable[[dict], Awaitable[None]]
_RESULT_FIELDS = frozenset(AgentResult.__dataclass_fields__)


def _attempt_count(entry: dict) -> int:
    value = entry.get("attempts", 0)
    return min(MAX_STAGE_ATTEMPTS, max(0, value)) if type(value) is int else MAX_STAGE_ATTEMPTS


def context_fingerprint(value: dict) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False,
        default=str).encode("utf-8")).hexdigest()


def _valid_result(value: object, maximum_score: float) -> AgentResult | None:
    if not isinstance(value, (dict, AgentResult)):
        return None
    try:
        result = value if isinstance(value, AgentResult) else AgentResult(
            **{key: item for key, item in value.items() if key in _RESULT_FIELDS})
        if isinstance(result.nota_sugerida, bool) or isinstance(result.confianza, bool):
            return None
        score = float(result.nota_sugerida) if result.nota_sugerida is not None else None
        confidence = float(result.confianza)
        if (score is None or not math.isfinite(score) or not 0 <= score <= maximum_score
                or not math.isfinite(confidence) or not 0 <= confidence <= 1 or result.error
                or not isinstance(result.componentes, list) or not isinstance(result.criterios, list)
                or not isinstance(result.alertas, list) or not isinstance(result.feedback_estudiante, str)):
            return None
        result.nota_sugerida = score
        result.confianza = confidence
        return result
    except (ValueError, TypeError, OverflowError):
        return None


class ReviewProgress:
    def __init__(self, *, fingerprint: str, payload: dict | None,
                 save: Save | None = None):
        self.payload = deepcopy(payload) if (
            isinstance(payload, dict) and payload.get("schema_version") == 1
            and payload.get("fingerprint") == fingerprint
            and isinstance(payload.get("stages"), dict)
        ) else {"schema_version": 1, "fingerprint": fingerprint, "stages": {}}
        self._save = save
        self._reused: set[str] = set()
        self._elapsed_ms: dict[str, int] = {}

    async def persist(self) -> None:
        if self._save:
            await self._save(deepcopy(self.payload))

    async def save_vision(self, payload: dict) -> None:
        self.payload["vision"] = deepcopy(payload)
        await self.persist()

    def summary(self) -> dict:
        return {key: {"attempts": _attempt_count(entry),
                      "status": entry.get("status"), "error_code": entry.get("error_code"),
                      "reused": key in self._reused,
                      "saved_time_ms": entry["result"].get("tiempo_ms", 0) if isinstance(entry.get("result"), dict) else 0}
                for key, entry in self.payload["stages"].items() if isinstance(entry, dict)}

    def run_timings(self) -> dict[str, int]:
        return dict(self._elapsed_ms)

    async def run(self, stage: str, operation: Operation, *, maximum_score: float,
                  input_fingerprint: str | None = None) -> AgentResult:
        entry = self.payload["stages"].get(stage)
        if not isinstance(entry, dict):
            entry = {}
            self.payload["stages"][stage] = entry
        if entry and entry.get("input_fingerprint") != input_fingerprint:
            entry.update(status="pending", error_code="review_context_changed")
            await self.persist()
            return AgentResult(nota_sugerida=None, confianza=0, feedback_estudiante="",
                error="review_context_changed", requiere_revision_docente=True)
        entry["input_fingerprint"] = input_fingerprint
        cached = _valid_result(entry.get("result"), maximum_score)
        if cached:
            self._reused.add(stage)
            cached.tiempo_ms = 0
            return cached
        attempts = _attempt_count(entry)
        code = str(entry.get("error_code") or "worker_interrupted")
        result = AgentResult(nota_sugerida=None, confianza=0, feedback_estudiante="",
                             error=code, requiere_revision_docente=True)
        if attempts and code not in TRANSIENT_ERRORS:
            return result
        while attempts < MAX_STAGE_ATTEMPTS:
            attempts += 1
            entry.update(attempts=attempts, status="in_flight", error_code="worker_interrupted")
            # Persist before sending: a killed worker must not reset its budget.
            await self.persist()
            started = time.monotonic()
            try:
                result = await operation()
            finally:
                role = stage.split(":", 1)[0]
                self._elapsed_ms[role] = self._elapsed_ms.get(role, 0) + max(0, int((time.monotonic() - started) * 1000))
            valid = _valid_result(result, maximum_score)
            if valid:
                # Raw provider JSON duplicates answers/components; it is not
                # consumed by verification/consolidation. The sequential owner
                # stores normalized fields and persist() snapshots them before
                # handing them to storage; do not encode/decode JSON twice.
                normalized = {key: value for key, value in vars(valid).items() if key != "raw_output"}
                if isinstance(valid.raw_output, dict):
                    normalized["raw_output"] = {key: valid.raw_output[key] for key in (
                        "discrepancia", "diferencia", "nota_final", "requiere_arbitraje",
                        "partition_count", "failed_partitions",
                    ) if key in valid.raw_output}
                entry.update(status="complete", error_code=None, result=normalized)
                await self.persist()
                return valid
            code = result.error or "output_invalid"
            # Only allow safe, known codes into progress telemetry.
            code = code if code in TRANSIENT_ERRORS or code in {
                "http_401", "http_403", "output_refused", "output_incomplete",
                "output_budget_exhausted", "output_empty", "output_invalid",
            } else "provider_error"
            entry.update(status="pending", error_code=code)
            result = AgentResult(nota_sugerida=None, confianza=0, feedback_estudiante="",
                error=code, modelo=result.modelo, proveedor=result.proveedor,
                tiempo_ms=result.tiempo_ms, requiere_revision_docente=True)
            await self.persist()
            if code not in TRANSIENT_ERRORS:
                break
        return result

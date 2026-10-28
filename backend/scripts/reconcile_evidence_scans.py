"""Manually audit/quarantine up to twenty abandoned scanner intentions.

Default is read-only. No scheduled cleanup, academic mutation or permanent
deletion. Receipts are UUIDs, never arbitrary file paths. Run from backend/.
"""
from __future__ import annotations

import argparse
import asyncio
from collections import Counter
import json
from pathlib import Path
import sys
from uuid import UUID

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


async def recover(identities: list[UUID], *, quarantine: bool) -> dict:
    from app.db.session import AsyncSessionLocal
    from app.modules.calificaciones.evidence_scan_reconciliation import reconcile_scan_receipt
    counts = Counter()
    for identity in dict.fromkeys(identities):
        async with AsyncSessionLocal() as db:
            result = await reconcile_scan_receipt(db, identity, quarantine=quarantine)
            counts[result.status] += 1
    return {"mode": "quarantine" if quarantine else "audit", "receipts": dict(counts), "permanent_deletions": 0}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--receipt", type=UUID, action="append", required=True, help="Server receipt UUID; repeat up to twenty times")
    parser.add_argument("--quarantine", action="store_true", help="Explicitly move only proven abandoned assets to recoverable private quarantine")
    args = parser.parse_args()
    if len(args.receipt) > 20:
        parser.error("At most twenty receipts per manual operation")
    try:
        print(json.dumps(asyncio.run(recover(args.receipt, quarantine=args.quarantine))))
    except Exception:
        # Do not print SQL, configuration, file keys or academic information.
        print("Recovery stopped: references or storage could not be verified. Inspect the private quarantine before retrying; no permanent deletion was requested.", file=sys.stderr)
        raise SystemExit(1) from None

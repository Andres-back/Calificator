"""Scoped operator command. Dry-run by default; no student identities in output.

Run with PYTHONPATH=backend, or pipe this approved script to python in backend.
--execute additionally requires explicit grade IDs and evaluation confirmation.
"""

import argparse
import asyncio
import json
from uuid import UUID

from sqlalchemy import select, text

from app.db.base import import_models
from app.db.session import AsyncSessionLocal, engine
from app.modules.calificaciones.models import Calificacion
from app.modules.calificaciones.recovery_service import recover_failed_grade


async def run(args):
    import_models()
    async with AsyncSessionLocal() as db:
        if not args.execute:
            await db.execute(text("SET TRANSACTION READ ONLY"))
        ids = args.grade_id or list(
            await db.scalars(
                select(Calificacion.id)
                .where(
                    Calificacion.evaluacion_id == args.evaluation_id,
                    Calificacion.profesor_id == args.teacher_id,
                )
                .order_by(Calificacion.id)
            )
        )
        if len(ids) != len(set(ids)):
            raise ValueError("No repita identificadores de calificación.")
        results = []
        for grade_id in ids:
            result = await recover_failed_grade(
                db,
                grade_id=grade_id,
                evaluation_id=args.evaluation_id,
                teacher_id=args.teacher_id,
                execute=args.execute,
            )
            # A skipped execution may hold locks; release before the next grade.
            if args.execute and not result["queued"]:
                await db.rollback()
            results.append(result)
        if not args.execute:
            await db.rollback()
        print(
            json.dumps(
                {
                    "execute": args.execute,
                    "examined": len(results),
                    "eligible": sum(r["eligible"] for r in results),
                    "queued": sum(r["queued"] for r in results),
                    "results": results,
                }
            ),
            flush=True,
        )
    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--evaluation-id", type=UUID, required=True)
    parser.add_argument("--teacher-id", type=UUID, required=True)
    parser.add_argument("--grade-id", type=UUID, action="append")
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--confirm-evaluation", type=UUID)
    args = parser.parse_args()
    if args.execute and (
        not args.grade_id or args.confirm_evaluation != args.evaluation_id
    ):
        parser.error(
            "Ejecutar requiere IDs explícitos y --confirm-evaluation igual a --evaluation-id."
        )
    asyncio.run(run(args))

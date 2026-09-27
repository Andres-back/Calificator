"""Make complete explainable breakdowns authoritative for pending suggestions.

Revision ID: 202609190001
Revises: 202609170001
"""

from typing import Sequence, Union

from alembic import op

revision: str = "202609190001"
down_revision: Union[str, None] = "202609170001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        UPDATE calificaciones AS c
        SET nota_sugerida = d.nota_final,
            resultado_json = COALESCE(c.resultado_json, '{}'::jsonb)
                || jsonb_build_object(
                    'desglose',
                    COALESCE(c.resultado_json->'desglose', '{}'::jsonb)
                    || jsonb_build_object(
                        'modo', 'autoridad',
                        'nota_calculada', d.nota_final,
                        'nota_modelo_global', c.nota_sugerida,
                        'diferencia', ROUND(d.nota_final - c.nota_sugerida, 2),
                        'discrepancia', d.nota_final IS DISTINCT FROM c.nota_sugerida,
                        'reconciliacion_migracion', '202609190001'
                    )
                )
        FROM calificacion_desgloses AS d
        WHERE d.calificacion_id = c.id
          AND d.activo IS TRUE
          AND d.origen = 'automatico'
          AND d.cobertura_estado = 'completa'
          AND d.requiere_revision IS FALSE
          AND c.nota_confirmada IS NULL
          AND c.revisado_por_docente IS FALSE
          AND c.estado = 'sugerida'
          AND c.nota_sugerida IS NOT NULL
          AND c.nota_sugerida IS DISTINCT FROM d.nota_final
    """)


def downgrade() -> None:
    op.execute("""
        UPDATE calificaciones AS c
        SET nota_sugerida = (c.resultado_json->'desglose'->>'nota_modelo_global')::numeric,
            resultado_json = c.resultado_json
                || jsonb_build_object(
                    'desglose',
                    (c.resultado_json->'desglose' - 'reconciliacion_migracion')
                    || jsonb_build_object('modo', 'controlado')
                )
        WHERE c.resultado_json->'desglose'->>'reconciliacion_migracion' = '202609190001'
          AND c.nota_confirmada IS NULL
          AND c.revisado_por_docente IS FALSE
          AND c.estado = 'sugerida'
          AND c.resultado_json->'desglose'->>'nota_modelo_global' IS NOT NULL
    """)

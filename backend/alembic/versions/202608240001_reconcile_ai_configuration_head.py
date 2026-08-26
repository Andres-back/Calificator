"""Reconcile the database revision used by earlier AI configuration rollout.

Revision ID: 202608240001
Revises: 202608210001

This intentionally empty bridge makes repositories compatible with databases
that were stamped with 202608240001 before the revision file was published.
"""
from typing import Sequence, Union

revision: str = "202608240001"
down_revision: Union[str, None] = "202608210001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
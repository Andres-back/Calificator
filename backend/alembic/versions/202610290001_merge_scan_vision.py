"""Join evidence scanning and configurable reading without changing either schema.

Revision ID: 202610290001
Revises: 202610270001, 202610280001
"""

revision = "202610290001"
down_revision = ("202610270001", "202610280001")
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Both additive migrations run before this marker, including upgrades from
    # the pilot's existing reading-controls head. Never rewrite academic rows.
    pass


def downgrade() -> None:
    # Only unjoin the graph; each parent retains its own downgrade safeguards.
    pass

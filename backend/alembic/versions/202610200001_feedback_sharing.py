"""Devoluciones individuales: solo tablas nuevas, sin backfill académico."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "202610200001"
down_revision = "202610150001"
branch_labels = None
depends_on = None


def fk(name, target, *, nullable=False):
    return sa.Column(name, UUID(as_uuid=True), sa.ForeignKey(target), nullable=nullable)


def time_column(name, *, nullable=False, default=None):
    return sa.Column(name, sa.DateTime(timezone=True), nullable=nullable, server_default=sa.text(default) if default else None)


def upgrade() -> None:
    op.create_table(
        "feedback_publications",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        fk("calificacion_id", "calificaciones.id"), fk("estudiante_id", "users.id"),
        fk("evaluacion_id", "evaluaciones.id"), fk("materia_id", "materias.id"),
        fk("authorized_by", "users.id"), fk("breakdown_id", "calificacion_desgloses.id", nullable=True),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("schema_version", sa.Integer(), nullable=False),
        sa.Column("content_fingerprint", sa.String(64), nullable=False),
        sa.Column("payload_json", JSONB(), nullable=False),
        sa.Column("evidence_enabled", sa.Boolean(), nullable=False),
        sa.Column("state", sa.String(20), nullable=False),
        time_column("authorized_at", default="now()"), time_column("suspended_at", nullable=True),
        sa.UniqueConstraint("calificacion_id", "revision", name="uq_feedback_publication_revision"),
        sa.CheckConstraint("revision >= 1", name="ck_feedback_publication_revision"),
        sa.CheckConstraint("state IN ('authorized','suspended')", name="ck_feedback_publication_state"),
    )
    op.create_index("ix_feedback_publication_grade", "feedback_publications", ["calificacion_id", "state"])
    op.create_table(
        "feedback_accesses",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        fk("publication_id", "feedback_publications.id"), fk("calificacion_id", "calificaciones.id"), fk("created_by", "users.id"),
        sa.Column("creation_request_id", UUID(as_uuid=True), nullable=False),
        sa.Column("credential_digest", sa.String(64), nullable=False, unique=True),
        sa.Column("credential_generation", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False), sa.Column("state", sa.String(20), nullable=False),
        time_column("expires_at"), time_column("created_at", default="now()"),
        time_column("updated_at", default="now()"), time_column("disabled_at", nullable=True),
        sa.Column("operations_json", JSONB(), nullable=False),
        sa.UniqueConstraint("created_by", "creation_request_id", "calificacion_id", name="uq_feedback_access_creation"),
        sa.CheckConstraint("state IN ('active','disabled','suspended')", name="ck_feedback_access_state"),
        sa.CheckConstraint("version >= 1 AND credential_generation >= 1", name="ck_feedback_access_version"),
    )
    op.create_index("ix_feedback_access_publication", "feedback_accesses", ["publication_id"])
    op.create_table(
        "feedback_chat_quotas", sa.Column("id", UUID(as_uuid=True), primary_key=True),
        fk("estudiante_id", "users.id"), fk("evaluacion_id", "evaluaciones.id"),
        sa.UniqueConstraint("estudiante_id", "evaluacion_id", name="uq_feedback_quota_subject"),
    )
    op.create_table(
        "feedback_chat_requests", sa.Column("id", UUID(as_uuid=True), primary_key=True),
        fk("access_id", "feedback_accesses.id"), fk("publication_id", "feedback_publications.id"), fk("quota_id", "feedback_chat_quotas.id"),
        sa.Column("credential_generation", sa.Integer(), nullable=False),
        sa.Column("client_request_id", UUID(as_uuid=True), nullable=False),
        sa.Column("request_fingerprint", sa.String(64), nullable=False),
        sa.Column("message", sa.Text(), nullable=True), sa.Column("response", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False), sa.Column("error_code", sa.String(40), nullable=True),
        time_column("accepted_at", default="clock_timestamp()"), time_column("started_at", nullable=True), time_column("finished_at", nullable=True),
        sa.Column("dispatch_pending", sa.Boolean(), nullable=False),
        sa.UniqueConstraint("access_id", "credential_generation", "client_request_id", name="uq_feedback_chat_request"),
        sa.CheckConstraint("status IN ('queued','running','succeeded','failed','closed')", name="ck_feedback_chat_status"),
    )
    op.create_index("ix_feedback_chat_quota_window", "feedback_chat_requests", ["quota_id", "accepted_at"])
    op.create_index("ix_feedback_chat_dispatch", "feedback_chat_requests", ["status", "dispatch_pending"])


def downgrade() -> None:
    # Destructivo solo para tablas nuevas: nunca ejecutar como rollback de demo.
    for table in ("feedback_chat_requests", "feedback_chat_quotas", "feedback_accesses", "feedback_publications"):
        op.drop_table(table)

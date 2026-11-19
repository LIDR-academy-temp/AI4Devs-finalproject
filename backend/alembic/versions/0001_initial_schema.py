"""Esquema inicial del MVP

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-11-14
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CUIL_PATTERN = "^[0-9]{11}$"
PROVIDERS = ("local", "token", "firmar")


def _uuid_pk() -> sa.Column:
    return sa.Column(
        "id",
        postgresql.UUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("gen_random_uuid()"),
    )


def _created_at() -> sa.Column:
    return sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now())


def _enum_check(table: str, column: str, values: tuple[str, ...], name: str) -> sa.CheckConstraint:
    allowed = ", ".join(f"'{value}'" for value in values)
    return sa.CheckConstraint(f"{column} IN ({allowed})", name=f"ck_{table}_{name}")


def upgrade() -> None:
    op.create_table(
        "integrating_system",
        _uuid_pk(),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("api_key_hash", sa.String(64), nullable=False),
        sa.Column("allowed_origins", sa.Text(), nullable=False, server_default=""),
        _created_at(),
        sa.UniqueConstraint("api_key_hash", name="uq_integrating_system_api_key_hash"),
    )

    op.create_table(
        "signer",
        _uuid_pk(),
        sa.Column("full_name", sa.String(200), nullable=False),
        sa.Column("identifier", sa.String(11), nullable=False),
        sa.Column("email", sa.String(320)),
        _created_at(),
        sa.UniqueConstraint("identifier", name="uq_signer_identifier"),
        sa.CheckConstraint(f"identifier ~ '{CUIL_PATTERN}'", name="ck_signer_identifier_is_cuil"),
    )

    op.create_table(
        "certificate",
        _uuid_pk(),
        sa.Column("signer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("signer.id", name="fk_certificate_signer_id_signer")),
        sa.Column("subject", sa.Text(), nullable=False),
        sa.Column("issuer_subject", sa.Text(), nullable=False),
        sa.Column("cuil", sa.String(11)),
        sa.Column("serial_number", sa.String(128), nullable=False),
        sa.Column("provider", sa.String(20), nullable=False),
        sa.Column("revocation_status", sa.String(20), nullable=False, server_default="unknown"),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        _created_at(),
        sa.UniqueConstraint("serial_number", name="uq_certificate_serial_number"),
        sa.CheckConstraint(f"cuil IS NULL OR cuil ~ '{CUIL_PATTERN}'", name="ck_certificate_cuil_format"),
        sa.CheckConstraint("expires_at > issued_at", name="ck_certificate_validity_period"),
        _enum_check("certificate", "provider", PROVIDERS, "provider"),
        _enum_check("certificate", "revocation_status", ("good", "revoked", "unknown"), "revocation_status"),
    )

    op.create_table(
        "document",
        _uuid_pk(),
        sa.Column(
            "integrating_system_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("integrating_system.id", name="fk_document_integrating_system_id_integrating_system"),
        ),
        sa.Column("external_document_id", sa.String(200)),
        sa.Column("current_version_id", postgresql.UUID(as_uuid=True)),
        sa.Column("signing_status", sa.String(20), nullable=False, server_default="pending_signature"),
        sa.Column("signature_deadline", sa.DateTime(timezone=True)),
        _created_at(),
        sa.CheckConstraint(
            "signature_deadline IS NULL OR signing_status = 'pending_signature'",
            name="ck_document_deadline_only_when_pending",
        ),
        _enum_check("document", "signing_status", ("draft", "pending_signature", "signed"), "signing_status"),
    )
    op.create_index(
        "uq_document_external_id_per_system",
        "document",
        ["integrating_system_id", "external_document_id"],
        unique=True,
        postgresql_where=sa.text("external_document_id IS NOT NULL"),
    )

    op.create_table(
        "signature_request",
        _uuid_pk(),
        sa.Column(
            "document_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("document.id", name="fk_signature_request_document_id_document"),
            nullable=False,
        ),
        sa.Column(
            "integrating_system_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("integrating_system.id", name="fk_signature_request_integrating_system_id_integrating_system"),
        ),
        sa.Column(
            "signer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("signer.id", name="fk_signature_request_signer_id_signer"),
            nullable=False,
        ),
        sa.Column(
            "certificate_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("certificate.id", name="fk_signature_request_certificate_id_certificate"),
        ),
        sa.Column("provider", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("callback_url", sa.String(2048)),
        _created_at(),
        sa.Column("signed_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint(
            "(status = 'signed') = (signed_at IS NOT NULL)",
            name="ck_signature_request_signed_at_only_when_signed",
        ),
        _enum_check("signature_request", "provider", PROVIDERS, "provider"),
        _enum_check(
            "signature_request", "status", ("pending", "signing", "signed", "failed"), "signature_request_status"
        ),
    )
    op.create_index("ix_signature_request_document_id", "signature_request", ["document_id"])

    op.create_table(
        "document_version",
        _uuid_pk(),
        sa.Column(
            "document_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("document.id", name="fk_document_version_document_id_document"),
            nullable=False,
        ),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("origin", sa.String(20), nullable=False),
        sa.Column(
            "signature_request_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "signature_request.id", name="fk_document_version_signature_request_id_signature_request"
            ),
        ),
        sa.Column("signature_level", sa.String(20)),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("content", sa.LargeBinary(), nullable=False),
        sa.Column("document_hash", sa.String(64), nullable=False),
        _created_at(),
        sa.UniqueConstraint("document_id", "version_number", name="uq_document_version_number"),
        sa.CheckConstraint("version_number >= 1", name="ck_document_version_version_number_positive"),
        sa.CheckConstraint(
            "(origin = 'signed') = (signature_request_id IS NOT NULL)",
            name="ck_document_version_signed_origin_has_request",
        ),
        sa.CheckConstraint(
            "signature_level IS NULL OR origin = 'signed'", name="ck_document_version_level_only_when_signed"
        ),
        sa.CheckConstraint("document_hash ~ '^[0-9a-f]{64}$'", name="ck_document_version_document_hash_sha256"),
        sa.CheckConstraint("octet_length(content) > 0", name="ck_document_version_content_not_empty"),
        _enum_check("document_version", "origin", ("uploaded", "signed"), "version_origin"),
        sa.CheckConstraint(
            "signature_level IS NULL OR signature_level IN ('B-B', 'B-T', 'B-LT', 'B-LTA')",
            name="ck_document_version_signature_level",
        ),
    )
    op.create_foreign_key(
        "fk_document_current_version_id_document_version",
        "document",
        "document_version",
        ["current_version_id"],
        ["id"],
    )

    op.create_table(
        "signing_challenge",
        _uuid_pk(),
        sa.Column(
            "signature_request_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("signature_request.id", name="fk_signing_challenge_signature_request_id_signature_request"),
            nullable=False,
        ),
        sa.Column(
            "certificate_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("certificate.id", name="fk_signing_challenge_certificate_id_certificate"),
            nullable=False,
        ),
        sa.Column("hash_to_sign", sa.Text(), nullable=False),
        sa.Column("hash_algorithm", sa.String(16), nullable=False, server_default="SHA-256"),
        sa.Column("session_ref", sa.String(128), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True)),
        _created_at(),
        sa.CheckConstraint("expires_at > created_at", name="ck_signing_challenge_expires_after_creation"),
        sa.CheckConstraint("hash_algorithm = 'SHA-256'", name="ck_signing_challenge_hash_algorithm_supported"),
    )
    op.create_index("ix_signing_challenge_signature_request_id", "signing_challenge", ["signature_request_id"])

    op.create_table(
        "audit_event",
        _uuid_pk(),
        sa.Column(
            "signature_request_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("signature_request.id", name="fk_audit_event_signature_request_id_signature_request"),
            nullable=False,
        ),
        sa.Column("event_type", sa.String(64), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        _created_at(),
    )
    op.create_index("ix_audit_event_signature_request_id", "audit_event", ["signature_request_id"])

    op.create_table(
        "webhook_delivery",
        _uuid_pk(),
        sa.Column(
            "signature_request_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("signature_request.id", name="fk_webhook_delivery_signature_request_id_signature_request"),
            nullable=False,
        ),
        sa.Column("url", sa.String(2048), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_attempt_at", sa.DateTime(timezone=True)),
        _created_at(),
        sa.CheckConstraint("attempts >= 0", name="ck_webhook_delivery_attempts_non_negative"),
        _enum_check("webhook_delivery", "status", ("pending", "delivered", "failed"), "webhook_status"),
    )
    op.create_index("ix_webhook_delivery_signature_request_id", "webhook_delivery", ["signature_request_id"])

    op.execute(
        """
        CREATE FUNCTION firmadoc_reject_modification() RETURNS trigger
        LANGUAGE plpgsql AS $$
        BEGIN
            RAISE EXCEPTION 'La tabla % es append-only: % no está permitido', TG_TABLE_NAME, TG_OP
                USING ERRCODE = 'insufficient_privilege';
        END;
        $$;
        """
    )
    for table in ("document_version", "audit_event"):
        op.execute(
            f"""
            CREATE TRIGGER {table}_append_only
            BEFORE UPDATE OR DELETE ON {table}
            FOR EACH ROW EXECUTE FUNCTION firmadoc_reject_modification();
            """
        )
        op.execute(
            f"""
            CREATE TRIGGER {table}_no_truncate
            BEFORE TRUNCATE ON {table}
            FOR EACH STATEMENT EXECUTE FUNCTION firmadoc_reject_modification();
            """
        )

    op.execute(
        """
        CREATE FUNCTION firmadoc_reject_consumed_challenge_change() RETURNS trigger
        LANGUAGE plpgsql AS $$
        BEGIN
            RAISE EXCEPTION 'El desafío % ya fue consumido y no puede modificarse', OLD.id
                USING ERRCODE = 'insufficient_privilege';
        END;
        $$;
        """
    )
    op.execute(
        """
        CREATE TRIGGER signing_challenge_single_use
        BEFORE UPDATE ON signing_challenge
        FOR EACH ROW WHEN (OLD.consumed_at IS NOT NULL)
        EXECUTE FUNCTION firmadoc_reject_consumed_challenge_change();
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS signing_challenge_single_use ON signing_challenge")
    for table in ("document_version", "audit_event"):
        op.execute(f"DROP TRIGGER IF EXISTS {table}_no_truncate ON {table}")
        op.execute(f"DROP TRIGGER IF EXISTS {table}_append_only ON {table}")
    op.execute("DROP FUNCTION IF EXISTS firmadoc_reject_consumed_challenge_change()")
    op.execute("DROP FUNCTION IF EXISTS firmadoc_reject_modification()")

    op.drop_table("webhook_delivery")
    op.drop_table("audit_event")
    op.drop_table("signing_challenge")
    op.drop_constraint("fk_document_current_version_id_document_version", "document", type_="foreignkey")
    op.drop_table("document_version")
    op.drop_table("signature_request")
    op.drop_index("uq_document_external_id_per_system", table_name="document")
    op.drop_table("document")
    op.drop_table("certificate")
    op.drop_table("signer")
    op.drop_table("integrating_system")

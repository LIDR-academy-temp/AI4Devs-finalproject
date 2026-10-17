"""SQL fixtures for master data in integration tests."""

from sqlalchemy.orm import Session
from sqlalchemy import text


def seed_master_data(session: Session):
    """Populate database with test master data and test user."""

    # Ensure roles exist first (no FK dependencies)
    session.execute(text("""
        INSERT INTO roles (name) VALUES
        ('operations'),
        ('business'),
        ('finance')
        ON CONFLICT (name) DO NOTHING
    """))

    # Create test user with operations role
    session.execute(text("""
        INSERT INTO users (email, full_name, is_active) VALUES
        ('test@example.com', 'Test User', true)
        ON CONFLICT (email) DO NOTHING
    """))

    # Assign operations role to test user
    session.execute(text("""
        INSERT INTO user_roles (user_id, role_id)
        SELECT u.id, r.id FROM users u, roles r
        WHERE u.email = 'test@example.com' AND r.name = 'operations'
        ON CONFLICT (user_id, role_id) DO NOTHING
    """))

    # Master data
    session.execute(text("""
        INSERT INTO holding_groups (name) VALUES
        ('Group A'), ('Group B')
        ON CONFLICT (name) DO NOTHING
    """))

    session.execute(text("""
        INSERT INTO agencies (holding_group_id, name) VALUES
        (1, 'Agency One'),
        (1, 'Agency Two'),
        (2, 'Agency Three')
        ON CONFLICT (name) DO NOTHING
    """))

    session.execute(text("""
        INSERT INTO advertisers (name) VALUES
        ('Advertiser One'),
        ('Advertiser Two')
        ON CONFLICT (name) DO NOTHING
    """))

    session.execute(text("""
        INSERT INTO dsps (name, is_active) VALUES
        ('Adform', true),
        ('Equativ', true),
        ('Displayce', false)
        ON CONFLICT (name) DO NOTHING
    """))

    session.execute(text("""
        INSERT INTO channels (name) VALUES
        ('Digital'),
        ('OOH'),
        ('DOOH')
        ON CONFLICT (name) DO NOTHING
    """))

    session.execute(text("""
        INSERT INTO formats (name) VALUES
        ('Banner'),
        ('Native'),
        ('Video')
        ON CONFLICT (name) DO NOTHING
    """))

    session.execute(text("""
        INSERT INTO campaign_types (name) VALUES
        ('Brand'),
        ('Performance'),
        ('Awareness')
        ON CONFLICT (name) DO NOTHING
    """))

    session.execute(text("""
        INSERT INTO sectors (name) VALUES
        ('Tech'),
        ('Finance'),
        ('Retail')
        ON CONFLICT (name) DO NOTHING
    """))

    session.execute(text("""
        INSERT INTO sales_reps (name) VALUES
        ('Rep One'),
        ('Rep Two')
        ON CONFLICT (name) DO NOTHING
    """))

    session.commit()


def cleanup_master_data(session: Session):
    """Clean up test data."""
    session.execute(text("DELETE FROM campaign_lines"))
    session.execute(text("DELETE FROM campaign_periods"))
    session.execute(text("DELETE FROM campaigns"))
    session.execute(text("DELETE FROM dsp_mappings"))
    session.execute(text("DELETE FROM purchase_order_versions"))
    session.execute(text("DELETE FROM purchase_orders"))
    session.commit()

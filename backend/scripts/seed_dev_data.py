"""Seed development database with minimal data.

This script idempotently loads:
- Roles: operations, business, finance
- Master data: holding groups, agencies, advertisers, DSPs, channels, formats, campaign types, sectors, sales reps
- Developer user: email from SEED_USER_EMAIL env var, assigned operations role

Run: DATABASE_URL=... SEED_USER_EMAIL=dev@example.com python -m scripts.seed_dev_data
"""

import os
import sys
from datetime import date
from decimal import Decimal

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker


def main():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL environment variable not set")
        sys.exit(1)

    seed_email = os.environ.get("SEED_USER_EMAIL")
    if not seed_email:
        print("ERROR: SEED_USER_EMAIL environment variable not set")
        sys.exit(1)

    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()

    try:
        print(f"Seeding database with user email: {seed_email}")

        # 1. Seed roles (if not exist)
        session.execute(text("""
            INSERT INTO roles (name) VALUES
            ('operations'), ('business'), ('finance')
            ON CONFLICT (name) DO NOTHING
        """))
        print("✓ Roles seeded")

        # 2. Seed holding groups (if not exist)
        session.execute(text("""
            INSERT INTO holding_groups (name) VALUES
            ('Default Holding Group')
            ON CONFLICT (name) DO NOTHING
        """))
        print("✓ Holding groups seeded")

        # 3. Seed agencies (if not exist)
        session.execute(text("""
            INSERT INTO agencies (holding_group_id, name) VALUES
            (
                (SELECT id FROM holding_groups WHERE name = 'Default Holding Group'),
                'Test Agency'
            )
            ON CONFLICT (name) DO NOTHING
        """))
        print("✓ Agencies seeded")

        # 4. Seed advertisers (if not exist)
        session.execute(text("""
            INSERT INTO advertisers (name) VALUES
            ('Test Advertiser')
            ON CONFLICT (name) DO NOTHING
        """))
        print("✓ Advertisers seeded")

        # 5. Seed DSPs (if not exist)
        session.execute(text("""
            INSERT INTO dsps (name, is_active) VALUES
            ('Adform', true),
            ('Equativ', true),
            ('Displayce', false)
            ON CONFLICT (name) DO NOTHING
        """))
        print("✓ DSPs seeded")

        # 6. Seed channels (if not exist)
        session.execute(text("""
            INSERT INTO channels (name) VALUES
            ('Digital'), ('OOH'), ('DOOH')
            ON CONFLICT (name) DO NOTHING
        """))
        print("✓ Channels seeded")

        # 7. Seed formats (if not exist)
        session.execute(text("""
            INSERT INTO formats (name) VALUES
            ('Banner'), ('Native'), ('Video')
            ON CONFLICT (name) DO NOTHING
        """))
        print("✓ Formats seeded")

        # 8. Seed campaign types (if not exist)
        session.execute(text("""
            INSERT INTO campaign_types (name) VALUES
            ('Brand'), ('Performance'), ('Awareness')
            ON CONFLICT (name) DO NOTHING
        """))
        print("✓ Campaign types seeded")

        # 9. Seed sectors (if not exist)
        session.execute(text("""
            INSERT INTO sectors (name) VALUES
            ('Tech'), ('Finance'), ('Retail')
            ON CONFLICT (name) DO NOTHING
        """))
        print("✓ Sectors seeded")

        # 10. Seed sales reps (if not exist)
        session.execute(text("""
            INSERT INTO sales_reps (name) VALUES
            ('Default Sales Rep')
            ON CONFLICT (name) DO NOTHING
        """))
        print("✓ Sales reps seeded")

        # 11. Seed developer user (if not exist) and assign operations role
        session.execute(text("""
            INSERT INTO users (email, full_name, is_active) VALUES
            (:email, :full_name, true)
            ON CONFLICT (email) DO NOTHING
        """), {"email": seed_email, "full_name": "Developer User"})
        print(f"✓ User seeded: {seed_email}")

        # 12. Assign operations role to developer user
        session.execute(text("""
            INSERT INTO user_roles (user_id, role_id)
            SELECT u.id, r.id FROM users u, roles r
            WHERE u.email = :email AND r.name = 'operations'
            ON CONFLICT (user_id, role_id) DO NOTHING
        """), {"email": seed_email})
        print(f"✓ Assigned operations role to {seed_email}")

        session.commit()
        print("\n✓ Database seeded successfully")

    except Exception as e:
        session.rollback()
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    finally:
        session.close()


if __name__ == "__main__":
    main()

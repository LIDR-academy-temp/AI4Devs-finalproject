import pytest
from sqlalchemy import exc
from sqlalchemy.orm import selectinload

from app.infrastructure.persistence.models.identity import UserRecord, RoleRecord, UserRoleRecord


def test_user_email_is_unique(test_db_session):
    """Test that user.email has a unique constraint."""
    user1 = UserRecord(email="unique1@example.com", full_name="Test User", is_active=True)
    test_db_session.add(user1)
    test_db_session.commit()

    user2 = UserRecord(email="unique1@example.com", full_name="Duplicate User", is_active=True)
    test_db_session.add(user2)

    with pytest.raises(exc.IntegrityError):
        test_db_session.commit()


def test_user_roles_composite_pk(test_db_session):
    """Test that user_roles has a composite PK on (user_id, role_id)."""
    user = UserRecord(email="unique2@example.com", full_name="Test User", is_active=True)
    test_db_session.add(user)
    test_db_session.commit()

    ops_role = RoleRecord(name="composite_pk_test_ops")
    test_db_session.add(ops_role)
    test_db_session.commit()

    user_role1 = UserRoleRecord(user_id=user.id, role_id=ops_role.id)
    test_db_session.add(user_role1)
    test_db_session.commit()

    user_role2 = UserRoleRecord(user_id=user.id, role_id=ops_role.id)
    test_db_session.add(user_role2)

    with pytest.raises(exc.IntegrityError):
        test_db_session.commit()


def test_user_can_have_multiple_roles(test_db_session):
    """Test that a user can be assigned multiple roles."""
    user = UserRecord(email="unique3@example.com", full_name="Test User", is_active=True)
    test_db_session.add(user)
    test_db_session.commit()

    ops_role = RoleRecord(name="multi_role_test_ops")
    business_role = RoleRecord(name="multi_role_test_business")
    test_db_session.add_all([ops_role, business_role])
    test_db_session.commit()

    user_role1 = UserRoleRecord(user_id=user.id, role_id=ops_role.id)
    user_role2 = UserRoleRecord(user_id=user.id, role_id=business_role.id)
    test_db_session.add_all([user_role1, user_role2])
    test_db_session.commit()

    user_from_db = test_db_session.query(UserRecord).options(selectinload(UserRecord.roles)).filter_by(email="unique3@example.com").first()
    assert len(user_from_db.roles) == 2

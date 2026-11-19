from alembic import command
from sqlalchemy import Engine, inspect, text

from tests.integration.conftest import alembic_config


def test_downgrade_base_removes_schema_and_upgrade_restores_it(engine: Engine, database_url: str) -> None:
    config = alembic_config(database_url)

    command.downgrade(config, "base")
    tables_after_downgrade = set(inspect(engine).get_table_names()) - {"alembic_version"}
    with engine.connect() as connection:
        functions = connection.scalars(
            text("SELECT proname FROM pg_proc WHERE proname LIKE 'firmadoc_%'")
        ).all()

    command.upgrade(config, "head")

    assert tables_after_downgrade == set()
    assert functions == []
    assert "document_version" in inspect(engine).get_table_names()

"""La base de pruebas es obligatoria en el pipeline: sin ella, las pruebas fallan en vez de saltearse."""

import pytest

from tests.conftest import falta_la_base


def test_sin_la_variable_se_saltean(monkeypatch):
    monkeypatch.delenv("EXIGIR_BASE_PRUEBAS", raising=False)
    with pytest.raises(pytest.skip.Exception):
        falta_la_base("Sin base")


def test_con_la_variable_fallan(monkeypatch):
    monkeypatch.setenv("EXIGIR_BASE_PRUEBAS", "1")
    with pytest.raises(pytest.fail.Exception, match="Sin base"):
        falta_la_base("Sin base")

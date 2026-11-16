from firmadoc_agent.__main__ import server_options
from firmadoc_agent.config import AgentSettings


def test_server_listens_only_on_loopback() -> None:
    options = server_options(AgentSettings(_env_file=None, FIRMADOC_AGENT_PORT=9123))

    assert options == {"host": "127.0.0.1", "port": 9123}


def test_default_port() -> None:
    assert AgentSettings(_env_file=None).port == 8765


def test_allowed_origins_are_parsed_from_a_comma_separated_list() -> None:
    settings = AgentSettings(_env_file=None, FIRMADOC_AGENT_ALLOWED_ORIGINS=" http://localhost:5173 ,, https://a.example ")

    assert settings.allowed_origin_list == ["http://localhost:5173", "https://a.example"]

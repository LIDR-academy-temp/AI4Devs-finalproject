import uvicorn

from firmadoc_agent.app import create_app
from firmadoc_agent.config import AgentSettings

LOOPBACK = "127.0.0.1"


def server_options(settings: AgentSettings) -> dict[str, str | int]:
    return {"host": LOOPBACK, "port": settings.port}


def main() -> None:
    settings = AgentSettings()
    uvicorn.run(create_app(settings), **server_options(settings))


if __name__ == "__main__":
    main()

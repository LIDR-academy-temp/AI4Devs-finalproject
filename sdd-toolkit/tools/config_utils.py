"""
config_utils.py — utilidades compartidas de configuración SDD.

Importar con:
    from config_utils import find_config
"""

from pathlib import Path


def find_config(toolkit_dir: Path) -> Path:
    """
    Busca sdd.config.yaml en las ubicaciones posibles.

    Orden de búsqueda:
    1. Marcador .sdd-config-path en la raíz del proyecto (escrito por el instalador).
    2. sdd-toolkit/sdd.config.yaml  (ubicación default de los scripts Python).
    3. Raíz del proyecto             (ubicación alternativa documentada en la skill).

    Args:
        toolkit_dir: directorio sdd-toolkit/ (Path(__file__).parent.parent desde tools/).

    Returns:
        Path al sdd.config.yaml encontrado.

    Raises:
        FileNotFoundError si no se encuentra en ninguna ubicación.
    """
    project_root = toolkit_dir.parent

    # 1. Leer marcador si existe
    marker = project_root / ".sdd-config-path"
    if marker.exists():
        location = marker.read_text(encoding="utf-8").strip()
        if location == "root":
            candidate = project_root / "sdd.config.yaml"
        else:
            candidate = toolkit_dir / "sdd.config.yaml"
        if candidate.exists():
            return candidate

    # 2. Fallback: buscar en ambos lados
    candidates = [
        toolkit_dir / "sdd.config.yaml",
        project_root / "sdd.config.yaml",
    ]
    for c in candidates:
        if c.exists():
            return c

    raise FileNotFoundError(
        "No se encontró sdd.config.yaml.\n"
        "Ubicaciones buscadas:\n"
        f"  {candidates[0]}\n"
        f"  {candidates[1]}\n"
        "Crea uno a partir de la plantilla en sdd-toolkit/tools/ o ejecuta el instalador con --distribution full."
    )

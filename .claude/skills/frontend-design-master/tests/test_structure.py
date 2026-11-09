"""Pruebas ligeras: la presencia de archivos y routing no implica evaluación de LLM."""
from pathlib import Path
import re
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parent.parent


class StructureTests(unittest.TestCase):
    def test_validator_passes(self):
        proc = subprocess.run([sys.executable, str(ROOT/'scripts'/'validate_skill.py')],
                              capture_output=True, text=True)
        self.assertEqual(proc.returncode, 0, proc.stdout+proc.stderr)

    def test_all_router_paths_exist(self):
        data=(ROOT/'SKILL.md').read_text(encoding='utf-8')
        refs=set(re.findall(r'`((?:references|platforms|templates|scripts)/[\w.-]+\.(?:md|py|ps1))`',data))
        self.assertGreaterEqual(len(refs), 20)
        self.assertTrue(all((ROOT/ref).is_file() for ref in refs))

    def test_cross_agent_common_path_in_docs(self):
        readme=(ROOT/'README.md').read_text(encoding='utf-8')
        self.assertIn('.claude/skills/', readme)
        self.assertIn('Claude Code', readme)
        self.assertIn('Cursor', readme)

    def test_installer_stages_before_move(self):
        ps=(ROOT/'scripts'/'install.ps1').read_text(encoding='utf-8')
        self.assertLess(ps.index('Copy-Item -LiteralPath $source -Destination $stage'),
                        ps.index('Move-Item -LiteralPath $target -Destination $backup'))
        self.assertIn('Move-Item -LiteralPath $backup -Destination $target', ps)
        self.assertIn('$targetCopyStarted -and -not $installed', ps)


if __name__ == '__main__':
    unittest.main()

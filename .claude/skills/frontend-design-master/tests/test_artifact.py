"""Pruebas del chequeo HTML estático. No ejecutan aplicaciones ni agente LLM."""
from pathlib import Path
import importlib.util
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent.parent
SPEC = importlib.util.spec_from_file_location('checker', ROOT/'scripts'/'check_artifact.py')
CHECKER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CHECKER)


class ArtifactAuditTest(unittest.TestCase):
    def audit(self, source, strict=False):
        with tempfile.TemporaryDirectory() as tmp:
            f = Path(tmp) / 'bundle.html'
            f.write_text(source, encoding='utf-8')
            return CHECKER.audit(f, strict)

    def test_inline_ok(self):
        self.assertEqual(0, self.audit('''<!doctype html><html><head><style>body{background:url(data:image/png;base64,AAA)}</style></head><body><img src="data:image/svg+xml;base64,AAA"><script>const a=1;</script></body></html>''', True))

    def test_local_script_fails(self):
        self.assertEqual(1, self.audit('<script src="./src/app.js"></script>'))

    def test_css_import_fails(self):
        self.assertEqual(1, self.audit('<style>@import "./fonts.css";</style>'))

    def test_remote_warns_unless_strict(self):
        html = '<script src="https://example.com/abc.js"></script>'
        self.assertEqual(0, self.audit(html, False))
        self.assertEqual(1, self.audit(html, True))

    def test_links_are_not_resources(self):
        html = '<a href="https://example.com">Acerca de</a>'
        self.assertEqual(0, self.audit(html, True))

    def test_js_dynamic_import(self):
        self.assertEqual(1, self.audit('<script type="module">import("./chunk-42.js")</script>'))


if __name__ == '__main__':
    unittest.main()

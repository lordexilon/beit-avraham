import os
import pathlib
import subprocess
import tempfile
import unittest

INSTALLER = pathlib.Path(__file__).resolve().parents[1] / 'scripts/install_framework.py'

class InstallerTest(unittest.TestCase):
    def run_install(self, missing=False):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            source, target = root / 'source', root / 'target'
            target.mkdir()
            files = ['templates/es/AI_CONTEXT/active_context.md', '.agent/workflows/test.md',
                     '.opencode/commands/test.md', 'sca-studio/package.json', 'package.json', 'package-lock.json',
                     'supabase/migrations/test.sql', 'scripts/log_sca.js', 'scripts/cycle_capture.js',
                     'scripts/codex_telemetry.js', 'scripts/model_cost_cli.js']
            for name in files:
                if missing and name == 'scripts/cycle_capture.js':
                    continue
                file = source / name
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_text('{}' if name.endswith('.json') else 'fixture', encoding='utf8')
            secret = source / 'sca-studio/.env.local'
            secret.write_text('fixture-secret', encoding='utf8')
            result = subprocess.run(['python', str(INSTALLER), '--source', str(source)],
                                    cwd=target, input='y\n2\n1\n', text=True,
                                    capture_output=True, env={**os.environ, 'PYTHONIOENCODING':'utf-8'})
            self.assertFalse((target / 'sca-studio/.env.local').exists())
            if missing:
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('Installation incomplete', result.stdout)
            else:
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
                self.assertTrue((target / 'scripts/cycle_capture.js').exists())
                self.assertTrue((target / 'supabase/migrations/test.sql').exists())
                self.assertIn('Runtime setup and capture are still pending', result.stdout)
    def test_clean_copy(self):
        self.run_install()
    def test_missing_runtime_fails(self):
        self.run_install(missing=True)

if __name__ == '__main__':
    unittest.main()

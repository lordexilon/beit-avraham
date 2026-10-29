import os
import pathlib
import subprocess
import sys

source = pathlib.Path('C:/Users/Legion 5/Downloads/SCA-Compliant-Agent-Framework-master')
target = pathlib.Path(__file__).resolve().parents[1] / '.install-verification' / 'n9b'
if target.exists():
    raise SystemExit('Target already exists; preserve evidence and choose a fresh path')
target.mkdir(parents=True)
result = subprocess.run([sys.executable, str(source / 'install.py')], cwd=target,
                        input='y\n2\n1\n', text=True, capture_output=True,
                        env={**os.environ, 'PYTHONIOENCODING':'utf-8'})
(target / 'installation.log').write_text(result.stdout + result.stderr, encoding='utf8')
print('Target:', target)
print('Installer exit:', result.returncode)
print('Runtime:', (target / 'scripts/cycle_capture.js').is_file())
print('Secrets copied:', (target / 'sca-studio/.env.local').exists())
raise SystemExit(result.returncode)

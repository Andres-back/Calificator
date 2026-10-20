"""The required frontend gate must never hide failed or skipped E2E shards."""
from pathlib import Path
import re
import os
import shutil
import subprocess

import pytest

ROOT = Path(__file__).resolve().parents[2]


def jobs():
    source = (ROOT / '.github/workflows/ci.yml').read_text(encoding='utf-8')
    matches = list(re.finditer(r'^  ([a-z][a-z0-9-]+):\s*$', source, re.M))
    return {match.group(1): source[match.end():matches[index + 1].start() if index + 1 < len(matches) else len(source)]
            for index, match in enumerate(matches)}


def test_frontend_gate_requires_quality_and_every_e2e_suite():
    workflow = jobs()
    gate = workflow['frontend']
    assert 'name: Frontend quality, build and E2E' in gate
    assert 'needs: [frontend-quality, frontend-e2e]' in gate
    assert 'if: always()' in gate
    assert 'needs.frontend-quality.result' in gate and 'needs.frontend-e2e.result' in gate
    assert 'test "$QUALITY" = success' in gate and 'test "$E2E" = success' in gate


def test_frontend_suites_preserve_all_cases_and_diagnostics():
    workflow = jobs()
    quality, suites = workflow['frontend-quality'], workflow['frontend-e2e']
    for command in ('npm audit', 'npm run typecheck', 'npm run lint:strict', 'npm run test:run', 'npm run build'):
        assert command in quality
    assert 'needs: frontend-quality' in suites
    assert 'suite: [general, contextual]' in suites and 'fail-fast: false' in suites
    assert 'npm run test:e2e -- --reporter=line' in suites
    assert 'npm run test:mock -- grading-review.mock.spec.ts evaluation-visuals.mock.spec.ts --reporter=line' in suites
    assert 'timeout-minutes: 30' in suites and 'timeout-minutes: 25' in suites
    assert 'playwright-diagnostics-${{ matrix.suite }}' in suites
    assert 'continue-on-error' not in quality + suites + workflow['frontend']


@pytest.mark.parametrize('quality,e2e,allowed', [
    ('success', 'success', True), ('success', 'failure', False),
    ('failure', 'success', False), ('success', 'skipped', False),
    ('cancelled', 'success', False), ('skipped', 'skipped', False),
])
def test_actual_gate_script_fails_closed(quality, e2e, allowed):
    shell = str(Path('C:/Program Files/Git/bin/bash.exe')) if os.name == 'nt' else shutil.which('bash')
    assert shell and Path(shell).is_file()
    run = re.search(r'        run: \|\n((?:          .+\n)+)', jobs()['frontend'])
    assert run
    script = '\n'.join(line.strip() for line in run.group(1).splitlines())
    result = subprocess.run([shell, '-e', '-c', script], capture_output=True,
        env={'PATH': os.environ.get('PATH', ''), 'QUALITY': quality, 'E2E': e2e}, timeout=10)
    assert (result.returncode == 0) is allowed

"""Spec 210: la suite de accesibilidad corre en cada PR y detiene la ejecución si falla."""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[2]


def contextual_steps():
    workflow = (ROOT / '.github/workflows/ci.yml').read_text(encoding='utf-8')
    job = re.search(r'^  frontend-e2e-contextual:\s*$(.*?)(?=^  [a-z][a-z0-9-]+:\s*$|\Z)', workflow, re.M | re.S).group(1)
    return re.split(r'^(?=      - name: )', job, flags=re.M)[1:]


def test_accessibility_suite_runs_in_ci_and_stops_at_first_failure():
    steps = contextual_steps()
    a11y = [step for step in steps if 'npm run test:a11y' in step]
    assert len(a11y) == 1, 'la suite de accesibilidad debe correr una vez en las regresiones contextuales'
    step = a11y[0]
    assert re.search(r'^\s+id: a11y$', step, re.M)
    assert re.search(r'run: npm run test:a11y -- --reporter=line --max-failures=1$', step, re.M)
    assert 'continue-on-error' not in step
    names = [re.match(r'      - name: (.+)', item).group(1) for item in steps]
    assert names.index('Run accessibility checks') < names.index('Upload E2E diagnostics on failure')
    assert "steps.a11y.outcome == 'failure'" in steps[-1]


def test_accessibility_config_still_finds_the_suite():
    package = json.loads((ROOT / 'frontend/package.json').read_text(encoding='utf-8'))
    assert package['scripts']['test:a11y'] == 'playwright test --config=e2e/accessibility'
    config = (ROOT / 'frontend/e2e/accessibility/playwright.config.ts').read_text(encoding='utf-8')
    assert "testMatch: '**/*.a11y.spec.ts'" in config
    assert list((ROOT / 'frontend/e2e/accessibility').glob('*.a11y.spec.ts')), 'la suite no puede quedar vacía'

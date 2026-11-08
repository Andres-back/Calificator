"""Spec 158: WebKit gets one CI retry and every retried test stays visible."""
from pathlib import Path
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
CONFIG = (ROOT / 'frontend/playwright.config.ts').read_text(encoding='utf-8')
WORKFLOW = (ROOT / '.github/workflows/ci.yml').read_text(encoding='utf-8')


def test_global_retries_stay_disabled():
    assert re.search(r'^  retries: 0,$', CONFIG, re.M), 'Chromium y las ejecuciones locales no se repiten'


def test_only_webkit_projects_retry_once_on_ci():
    assert "const webkitRetries = process.env.CI ? 1 : 0;" in CONFIG
    assert "project.name?.startsWith('webkit') ? { ...project, retries: webkitRetries } : project" in CONFIG
    assert re.search(r'^  \]\)\.map\(withWebkitRetries\),$', CONFIG, re.M), 'la regla debe aplicarse a todos los proyectos'
    names = re.findall(r"\{ name: '([^']+)'", CONFIG)
    assert 'chromium' in names and any(name.startswith('webkit') for name in names)
    assert not re.search(r"name: '[^']+',[^\n]*retries:", CONFIG), 'ningún proyecto define su propia repetición'


def test_general_e2e_job_lists_flaky_tests_even_on_failure():
    job = re.search(r'^  frontend-e2e-general:\s*$(.*?)(?=^  [a-z][a-z0-9-]+:\s*$|\Z)', WORKFLOW, re.M | re.S).group(1)
    assert 'PLAYWRIGHT_JSON_OUTPUT_FILE: playwright-results.json' in job
    assert '--reporter=line,json' in job
    report = re.search(r'- name: List flaky end-to-end tests\n(.*?)(?=\n      - name: |\Z)', job, re.S).group(1)
    assert 'if: always()' in report
    assert 'node scripts/report-flaky.mjs playwright-results.json' in report


def test_report_lists_flaky_tests_with_their_first_error(tmp_path):
    results = tmp_path / 'results.json'
    results.write_text(json.dumps({'suites': [{'title': 'a.spec.ts', 'specs': [
        {'title': 'siempre-verde', 'line': 3, 'tests': [{'projectName': 'chromium', 'status': 'expected', 'results': [{'status': 'passed'}]}]},
        {'title': 'repetida', 'line': 9, 'tests': [{'projectName': 'webkit', 'status': 'flaky', 'results': [
            {'status': 'failed', 'error': {'message': 'page.goto: WebKit encountered an internal error'}}, {'status': 'passed'},
        ]}]},
    ]}]}), encoding='utf-8')
    summary = tmp_path / 'summary.md'
    out = subprocess.run(
        ['node', 'scripts/report-flaky.mjs', str(results)], cwd=ROOT / 'frontend', capture_output=True, text=True,
        encoding='utf-8', env={'PATH': __import__('os').environ['PATH'], 'GITHUB_STEP_SUMMARY': str(summary)}, check=True,
    ).stdout
    text = summary.read_text(encoding='utf-8')
    assert '| webkit | a.spec.ts › repetida:9 | page.goto: WebKit encountered an internal error |' in text
    assert 'siempre-verde' not in text
    assert '::warning title=Prueba inestable (webkit)::a.spec.ts › repetida:9' in out

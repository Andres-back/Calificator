"""Spec 172: la CI se detiene en el primer fallo de prueba en vez de correr hasta el final."""
from pathlib import Path
import re

import pytest

ROOT = Path(__file__).resolve().parents[2]
TEST_JOBS = ('backend', 'frontend-quality', 'frontend-e2e-general', 'frontend-e2e-contextual')
E2E_JOBS = ('frontend-e2e-general', 'frontend-e2e-contextual')
CANCEL = 'run: gh run cancel "$GITHUB_RUN_ID" --repo "$GITHUB_REPOSITORY"'


def job(name):
    workflow = (ROOT / '.github/workflows/ci.yml').read_text(encoding='utf-8')
    return re.search(rf'^  {name}:\s*$(.*?)(?=^  [a-z][a-z0-9-]+:\s*$|\Z)', workflow, re.M | re.S).group(1)


def steps(name):
    return re.split(r'^(?=      - name: )', job(name), flags=re.M)[1:]


def test_each_backend_suite_stops_at_its_first_failure():
    commands = re.findall(r'^\s+run: (python -m pytest .+)$', job('backend'), re.M)
    assert len(commands) == 3, commands
    assert all(re.search(r'(^| )-x( |$)', command) for command in commands), commands


def test_frontend_unit_tests_stop_at_their_first_failure():
    assert 'run: npm run test:run -- --bail=1' in job('frontend-quality')


@pytest.mark.parametrize('name', E2E_JOBS)
def test_each_e2e_suite_stops_at_its_first_failure(name):
    command = re.search(r'^\s+run: (npm run test:(?:e2e|mock) .+)$', job(name), re.M).group(1)
    assert command.endswith('--max-failures=1'), command


@pytest.mark.parametrize('name', TEST_JOBS)
def test_a_failed_test_job_cancels_the_rest_of_the_run(name):
    source = job(name)
    items = steps(name)
    cancel = items[-1]
    assert CANCEL in cancel, 'el corte debe ser el último paso: los diagnósticos se suben antes'
    assert 'GH_TOKEN: ${{ github.token }}' in cancel
    # Cancelar una ejecución necesita permiso de escritura sobre Actions, solo en estos trabajos.
    permissions = re.search(r'^    permissions:\n((?:      .+\n)+)', source, re.M)
    assert permissions, 'el trabajo declara sus permisos'
    assert set(permissions.group(1).split('\n')) >= {'      contents: read', '      actions: write'}


@pytest.mark.parametrize('name', ('backend', 'frontend-quality'))
def test_quality_jobs_cancel_on_any_failed_check(name):
    assert re.search(r'^\s+if: failure\(\)$', steps(name)[-1], re.M)


@pytest.mark.parametrize('name', E2E_JOBS)
def test_a_browser_install_timeout_does_not_cancel_the_run(name):
    """Infrastructure hiccups are retried per job; only a failed test stops everything."""
    items = steps(name)
    tests = next(item for item in items if re.search(r'npm run test:(e2e|mock)', item))
    assert re.search(r'^\s+id: e2e$', tests, re.M)
    assert "if: failure() && steps.e2e.outcome == 'failure'" in items[-1]


def test_one_slow_shard_install_does_not_cancel_the_other_shards():
    assert 'fail-fast: false' in job('frontend-e2e-general')


def test_other_jobs_keep_read_only_permissions():
    workflow = (ROOT / '.github/workflows/ci.yml').read_text(encoding='utf-8')
    assert re.search(r'^permissions:\n  contents: read\n', workflow, re.M)
    for name in ('frontend-e2e', 'frontend', 'containers'):
        assert 'actions: write' not in job(name)
        assert 'gh run cancel' not in job(name)

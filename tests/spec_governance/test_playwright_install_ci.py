"""A slow Ubuntu mirror must not consume the time reserved for the E2E suites."""
from pathlib import Path
import re

import pytest

ROOT = Path(__file__).resolve().parents[2]
JOBS = ('frontend-e2e-general', 'frontend-e2e-contextual')
INSTALL = 'run: npx playwright install --with-deps chromium webkit'


def job(name):
    workflow = (ROOT / '.github/workflows/ci.yml').read_text(encoding='utf-8')
    return re.search(rf'^  {name}:\s*$(.*?)(?=^  [a-z][a-z0-9-]+:\s*$|\Z)', workflow, re.M | re.S).group(1)


def steps(name):
    return re.split(r'^(?=      - name: )', job(name), flags=re.M)[1:]


def step_index(items, text):
    return next(index for index, item in enumerate(items) if text in item)


@pytest.mark.parametrize('name', JOBS)
def test_install_step_fails_fast_within_the_job_budget(name):
    items = steps(name)
    install = items[step_index(items, INSTALL)]
    limit = re.search(r'^\s+timeout-minutes: (\d+)$', install, re.M)
    assert limit, 'la instalación necesita su propio límite de tiempo'
    assert int(limit.group(1)) <= 5
    tests = next(item for item in items if re.search(r'npm run test:(e2e|mock)', item))
    test_limit = int(re.search(r'^\s+timeout-minutes: (\d+)$', tests, re.M).group(1))
    job_limit = int(re.search(r'^    timeout-minutes: (\d+)$', job(name), re.M).group(1))
    assert test_limit + int(limit.group(1)) <= job_limit


@pytest.mark.parametrize('name', JOBS)
def test_ubuntu_packages_are_restored_from_cache_before_installing(name):
    items = steps(name)
    prepare = step_index(items, 'sudo chown "$USER" /var/cache/apt/archives')
    cache = step_index(items, 'uses: actions/cache@v4')
    install = step_index(items, INSTALL)
    assert prepare < cache < install
    assert 'path: /var/cache/apt/archives/*.deb' in items[cache]
    assert "hashFiles('frontend/package-lock.json')" in items[cache]
    assert 'restore-keys:' in items[cache]


@pytest.mark.parametrize('name', JOBS)
def test_slow_install_is_not_hidden(name):
    assert 'continue-on-error' not in job(name)

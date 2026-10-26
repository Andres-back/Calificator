"""Keep the Jammy PDF test runtime installable without hiding rendering failures."""
from pathlib import Path
import re
import shlex


ROOT = Path(__file__).resolve().parents[2]


def backend_job():
    workflow = (ROOT / '.github/workflows/ci.yml').read_text(encoding='utf-8')
    return workflow.split('\n  backend:', 1)[1].split('\n  frontend-quality:', 1)[0]


def test_pdf_packages_match_supported_ubuntu_2204_runtime():
    backend = backend_job()
    assert 'runs-on: ubuntu-22.04' in backend
    command = re.search(r'^\s+sudo apt-get install (.+)$', backend, re.M)
    assert command
    packages = {token for token in shlex.split(command.group(1)) if not token.startswith('-')}
    assert packages == {'libpango-1.0-0', 'libpangocairo-1.0-0', 'libharfbuzz0b',
                        'libpangoft2-1.0-0', 'fonts-dejavu-core'}


def test_pdf_runtime_is_exercised_before_backend_checks():
    backend = backend_job()
    install = backend.index('name: Install PDF rendering libraries for integration tests')
    verify = backend.index('name: Verify PDF rendering runtime')
    audit = backend.index('name: Audit production dependencies')
    assert install < verify < audit
    smoke = backend[verify:audit]
    for token in ('from weasyprint import HTML', 'write_pdf()', '%PDF-', 'import fitz', 'get_text()'):
        assert token in smoke
    assert 'continue-on-error' not in backend and '|| true' not in smoke


def test_backend_integration_suite_still_runs_without_pdf_exclusions():
    backend = backend_job()
    assert 'run: python -m pytest tests/integration -v' in backend
    assert not re.search(r'--(?:ignore|deselect)\b', backend)

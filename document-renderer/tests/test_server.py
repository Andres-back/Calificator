import importlib.util
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
from app.modules.evaluaciones import document_archive  # noqa: E402
sys.modules["document_archive"] = document_archive
spec = importlib.util.spec_from_file_location("isolated_renderer", ROOT / "document-renderer/server.py")
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)


def sample_docx():
    from tests.fixtures.evaluation_visuals import word_native_tables
    return word_native_tables().content


def test_invalid_input_is_rejected_before_a_process_is_created(monkeypatch):
    child = Mock()
    monkeypatch.setattr(server.subprocess, "Popen", child)
    with pytest.raises(ValueError):
        server.convert_docx(b"not-word")
    child.assert_not_called()


def test_conversion_uses_fixed_paths_safe_profile_and_cleans_temporary_files(monkeypatch, tmp_path):
    monkeypatch.setattr(server.tempfile, "tempdir", str(tmp_path))
    def fake_process(command, **kwargs):
        assert kwargs["start_new_session"] is True and kwargs["shell"] is False
        assert "--headless" in command and "--norestore" in command
        source = Path(command[-1])
        assert source.name == "input.docx"
        assert b"MacroSecurityLevel" in (source.parent / "profile/user/registrymodifications.xcu").read_bytes()
        (source.parent / "input.pdf").write_bytes(b"%PDF-synthetic-output")
        return SimpleNamespace(returncode=0, communicate=lambda **_: (None, None))
    monkeypatch.setattr(server.subprocess, "Popen", fake_process)
    assert server.convert_docx(sample_docx()) == b"%PDF-synthetic-output"
    assert not list(tmp_path.iterdir())


def test_timeout_kills_process_group_and_cleans_workspace(monkeypatch, tmp_path):
    monkeypatch.setattr(server.tempfile, "tempdir", str(tmp_path))
    calls = []
    def communicate(**kwargs):
        if kwargs.get("timeout"):
            raise server.subprocess.TimeoutExpired("synthetic", 1)
        return None, None
    child = SimpleNamespace(pid=987654, communicate=communicate, returncode=-9)
    monkeypatch.setattr(server.subprocess, "Popen", lambda *_args, **_kwargs: child)
    monkeypatch.setattr(server.os, "killpg", lambda *args: calls.append(args), raising=False)
    monkeypatch.setattr(server.signal, "SIGKILL", 9, raising=False)  # Linux-only constant in a Windows test double.
    with pytest.raises(TimeoutError):
        server.convert_docx(sample_docx())
    assert calls and calls[0][0] == child.pid
    assert not list(tmp_path.iterdir())


def test_failed_converter_does_not_return_a_partial_pdf(monkeypatch, tmp_path):
    monkeypatch.setattr(server.tempfile, "tempdir", str(tmp_path))
    monkeypatch.setattr(server.subprocess, "Popen", lambda *_args, **_kwargs: SimpleNamespace(returncode=1, communicate=lambda **_: (None, None)))
    with pytest.raises(ValueError):
        server.convert_docx(sample_docx())
    assert not list(tmp_path.iterdir())
